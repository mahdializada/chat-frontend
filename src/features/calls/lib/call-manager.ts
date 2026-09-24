import type { Socket } from 'socket.io-client';
import { emitWithAck, WS_EVENTS } from '@/lib/socket';
import { useAuthStore } from '@/store/auth-store';
import type { Call, CallEndReason, CallType, IceServer } from '@/types/api';
import { useCallStore } from '../store/call-store';
import { playCue, startTone, stopTone } from './tones';

interface Ack<T> {
  success: boolean;
  message?: string;
  data?: T;
}

interface CallAck {
  call: Call;
  iceServers: IceServer[];
}

/** SDP or ICE payload exchanged between two browsers through the server. */
interface SignalData {
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

interface SignalEvent {
  callId: string;
  fromUserId: string;
  data: SignalData;
}

interface MediaEvent {
  callId: string;
  userId: string;
  micOn: boolean;
  cameraOn: boolean;
  screenOn: boolean;
}

/** One RTCPeerConnection per other participant (full mesh). */
interface Peer {
  userId: string;
  pc: RTCPeerConnection;
  /** Perfect negotiation: the polite side yields when both offer at once. */
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  /** ICE candidates that arrived before the remote description. */
  pendingCandidates: RTCIceCandidateInit[];
  stream: MediaStream;
}

const DEFAULT_ICE: IceServer[] = [{ urls: ['stun:stun.l.google.com:19302'] }];
/** How long the "Call ended" screen stays before the overlay closes. */
const ENDED_SCREEN_MS = 1800;

/**
 * Owns everything WebRTC on this device: local media, one peer connection per
 * participant, and the signalling over the existing Socket.IO connection.
 *
 * State for the UI lives in `useCallStore`; this class only mutates it.
 * Server truth arrives as `call:updated` events carrying the whole call, so the
 * manager simply diffs the JOINED participants against its peer map.
 */
class CallManager {
  private socket: Socket | null = null;
  private readonly peers = new Map<string, Peer>();
  /** Set while an accept/start ack is in flight so early signals are not lost. */
  private joiningCallId: string | null = null;
  private pendingSignals: SignalEvent[] = [];
  private cameraTrack: MediaStreamTrack | null = null;
  private endedTimer: ReturnType<typeof setTimeout> | null = null;

  // ─────────────────────────────── wiring ───────────────────────────────

  attach(socket: Socket): () => void {
    this.socket = socket;
    const onUpdated = (call: Call): void => this.handleCallUpdated(call);
    const onSignal = (event: SignalEvent): void => void this.handleSignal(event);
    const onMedia = (event: MediaEvent): void => this.handleMedia(event);

    socket.on(WS_EVENTS.CALL_UPDATED, onUpdated);
    socket.on(WS_EVENTS.CALL_SIGNAL, onSignal);
    socket.on(WS_EVENTS.CALL_MEDIA, onMedia);

    return () => {
      socket.off(WS_EVENTS.CALL_UPDATED, onUpdated);
      socket.off(WS_EVENTS.CALL_SIGNAL, onSignal);
      socket.off(WS_EVENTS.CALL_MEDIA, onMedia);
      if (this.socket === socket) this.socket = null;
    };
  }

  /**
   * Called once the socket is authenticated (first connect and every
   * reconnect): re-registers this device in its call and reloads the calls
   * ringing elsewhere so the UI matches the server after a reload.
   */
  async handleReady(loadActive: () => Promise<Call[]>): Promise<void> {
    await this.rejoinAfterReconnect();
    try {
      const calls = await loadActive();
      for (const call of calls) this.handleCallUpdated(call);
    } catch {
      // Best effort — live events will still arrive.
    }
  }

  /** Emits a fire-and-forget leave (used from beforeunload, where acks never return). */
  leaveImmediately(): void {
    const active = this.store.active;
    if (!active || !this.socket) return;
    this.socket.emit(WS_EVENTS.CALL_LEAVE, { callId: active.id });
  }

  private get myId(): string | null {
    return useAuthStore.getState().user?.id ?? null;
  }

  private get store() {
    return useCallStore.getState();
  }

  private ring(kind: 'ringtone' | 'ringback'): void {
    if (useAuthStore.getState().user?.soundEnabled === false) return;
    startTone(kind);
  }

  // ─────────────────────────────── public actions ───────────────────────────────

  async start(chatId: string, type: CallType): Promise<void> {
    if (this.store.active) throw new Error('You are already in a call');
    this.clearEndedScreen();
    this.store.setPhase('requesting-media');

    let stream: MediaStream;
    try {
      stream = await this.acquireLocalMedia(type === 'VIDEO');
    } catch (error) {
      this.store.setPhase('idle');
      throw error;
    }

    let ack: Ack<CallAck>;
    try {
      ack = await emitWithAck<Ack<CallAck>>(WS_EVENTS.CALL_START, { chatId, type });
    } catch (error) {
      this.releaseLocalMedia(stream);
      this.store.setPhase('idle');
      throw error;
    }
    if (!ack.success || !ack.data) {
      this.releaseLocalMedia(stream);
      this.store.setPhase('idle');
      throw new Error(ack.message ?? 'Could not start the call');
    }
    this.enterCall(ack.data, stream);
  }

  async accept(callId: string, withVideo?: boolean): Promise<void> {
    const incoming = this.store.incoming.find((c) => c.id === callId);
    if (this.store.active) {
      // Taking a second call hangs up the current one first.
      await this.leave();
    }
    this.clearEndedScreen();
    this.store.removeIncoming(callId);
    stopTone();
    this.store.setPhase('requesting-media');

    const wantVideo = withVideo ?? incoming?.type === 'VIDEO';
    let stream: MediaStream;
    try {
      stream = await this.acquireLocalMedia(wantVideo);
    } catch (error) {
      this.store.setPhase('idle');
      throw error;
    }

    this.joiningCallId = callId;
    let ack: Ack<CallAck>;
    try {
      ack = await emitWithAck<Ack<CallAck>>(WS_EVENTS.CALL_ACCEPT, { callId });
    } catch (error) {
      this.joiningCallId = null;
      this.pendingSignals = [];
      this.releaseLocalMedia(stream);
      this.store.setPhase('idle');
      throw error;
    }
    if (!ack.success || !ack.data) {
      this.joiningCallId = null;
      this.pendingSignals = [];
      this.releaseLocalMedia(stream);
      this.store.setPhase('idle');
      throw new Error(ack.message ?? 'Could not join the call');
    }
    this.enterCall(ack.data, stream);
  }

  async decline(callId: string): Promise<void> {
    this.store.removeIncoming(callId);
    if (this.store.incoming.length === 0) stopTone();
    try {
      await emitWithAck<Ack<Call>>(WS_EVENTS.CALL_DECLINE, { callId });
    } catch {
      // The server's ring timeout will settle it.
    }
  }

  /** Hangs up the active call (or cancels it while still dialing). */
  async leave(): Promise<void> {
    const active = this.store.active;
    if (!active) return;
    const reason: CallEndReason = this.store.phase === 'connected' ? 'completed' : 'cancelled';
    this.teardown(active, reason);
    try {
      await emitWithAck<Ack<Call>>(WS_EVENTS.CALL_LEAVE, { callId: active.id });
    } catch {
      // Best effort: the server drops us after its reconnect grace period anyway.
    }
  }

  toggleMic(): void {
    const stream = this.store.localStream;
    if (!stream) return;
    const next = !this.store.micOn;
    for (const track of stream.getAudioTracks()) track.enabled = next;
    this.store.setMedia({ micOn: next });
    this.broadcastMedia();
  }

  async toggleCamera(): Promise<void> {
    const stream = this.store.localStream;
    if (!stream) return;
    if (this.store.cameraOn) {
      for (const track of stream.getVideoTracks()) track.enabled = false;
      this.store.setMedia({ cameraOn: false });
      this.broadcastMedia();
      return;
    }
    if (this.cameraTrack && this.cameraTrack.readyState === 'live') {
      this.cameraTrack.enabled = true;
      this.store.setMedia({ cameraOn: true });
      this.broadcastMedia();
      return;
    }
    // Audio call being upgraded to video: grab the camera and renegotiate.
    const camera = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
    });
    const track = camera.getVideoTracks()[0];
    if (!track) return;
    this.cameraTrack = track;
    stream.addTrack(track);
    this.store.setLocalStream(stream);
    if (!this.store.screenOn) {
      for (const peer of this.peers.values()) this.attachVideoTrack(peer, track, stream);
    }
    this.store.setMedia({ cameraOn: true });
    this.broadcastMedia();
  }

  async toggleScreenShare(): Promise<void> {
    if (this.store.screenOn) {
      this.stopScreenShare();
      return;
    }
    const screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    const track = screen.getVideoTracks()[0];
    if (!track) return;
    track.addEventListener('ended', () => this.stopScreenShare());
    this.store.setScreenStream(screen);
    this.store.setMedia({ screenOn: true });
    for (const peer of this.peers.values()) this.attachVideoTrack(peer, track, screen);
    this.broadcastMedia();
  }

  setMinimized(value: boolean): void {
    this.store.setMinimized(value);
  }

  // ─────────────────────────────── join / leave plumbing ───────────────────────────────

  private enterCall(data: CallAck, stream: MediaStream): void {
    const store = this.store;
    store.setIceServers(data.iceServers.length ? data.iceServers : DEFAULT_ICE);
    store.setLocalStream(stream);
    store.setMedia({
      micOn: stream.getAudioTracks().some((t) => t.enabled),
      cameraOn: stream.getVideoTracks().some((t) => t.enabled),
      screenOn: false,
    });
    store.setMinimized(false);
    store.setConnectedAt(null);
    store.setActive(data.call);
    store.removeJoinable(data.call.chatId);
    store.removeIncoming(data.call.id);
    store.setPhase('dialing');

    this.joiningCallId = null;
    this.syncPeers(data.call);

    // Replay whatever arrived while the accept ack was in flight.
    const queued = this.pendingSignals;
    this.pendingSignals = [];
    for (const event of queued) void this.handleSignal(event);
  }

  private teardown(call: Call, reason: CallEndReason): void {
    const store = this.store;
    stopTone();
    for (const userId of Array.from(this.peers.keys())) this.closePeer(userId);
    this.stopScreenShare(false);
    if (store.localStream) this.releaseLocalMedia(store.localStream);
    this.cameraTrack = null;
    this.joiningCallId = null;
    this.pendingSignals = [];

    const wasInCall = store.active?.id === call.id;
    store.resetCall();
    if (wasInCall) {
      store.setEnded({ call, reason });
      store.setPhase('ended');
      playCue('ended');
      this.endedTimer = setTimeout(() => {
        this.endedTimer = null;
        if (useCallStore.getState().phase === 'ended') {
          useCallStore.getState().setPhase('idle');
          useCallStore.getState().setEnded(null);
        }
      }, ENDED_SCREEN_MS);
    }
  }

  private clearEndedScreen(): void {
    if (this.endedTimer) {
      clearTimeout(this.endedTimer);
      this.endedTimer = null;
    }
    this.store.setEnded(null);
  }

  /** After a socket reconnect the server must learn this socket is still in the call. */
  private async rejoinAfterReconnect(): Promise<void> {
    const active = this.store.active;
    if (!active) return;
    try {
      const ack = await emitWithAck<Ack<CallAck>>(WS_EVENTS.CALL_ACCEPT, { callId: active.id });
      if (ack.success && ack.data) {
        this.handleCallUpdated(ack.data.call);
        this.broadcastMedia();
      } else {
        this.teardown(active, 'failed');
      }
    } catch {
      // Still offline; the next `ready` retries.
    }
  }

  // ─────────────────────────────── server events ───────────────────────────────

  private handleCallUpdated(call: Call): void {
    const me = this.myId;
    if (!me) return;
    const store = this.store;
    const mine = call.participants.find((p) => p.userId === me);
    const isActive = store.active?.id === call.id;

    if (isActive) {
      if (call.status === 'ENDED') {
        this.teardown(call, call.endReason ?? 'completed');
        return;
      }
      if (mine?.status !== 'JOINED') {
        // The server dropped us (e.g. after a long disconnect).
        this.teardown(call, 'failed');
        return;
      }
      store.setActive(call);
      this.syncPeers(call);
      return;
    }

    if (call.status === 'ENDED') {
      store.removeIncoming(call.id);
      if (store.joinable[call.chatId]?.id === call.id) store.removeJoinable(call.chatId);
      if (store.incoming.length === 0 && !store.active) stopTone();
      return;
    }

    if (mine?.status === 'RINGING' && call.initiatorId !== me) {
      store.addIncoming(call);
      if (!store.active) this.ring('ringtone');
      return;
    }

    // Answered or declined on another device, or a group call we are not in.
    store.removeIncoming(call.id);
    if (store.incoming.length === 0 && !store.active) stopTone();
    if (call.chat.type === 'GROUP') {
      store.setJoinable(call);
    } else if (store.joinable[call.chatId]?.id === call.id) {
      store.removeJoinable(call.chatId);
    }
  }

  private async handleSignal(event: SignalEvent): Promise<void> {
    const active = this.store.active;
    if (!active) {
      if (this.joiningCallId === event.callId) this.pendingSignals.push(event);
      return;
    }
    if (active.id !== event.callId) return;
    const participant = active.participants.find((p) => p.userId === event.fromUserId);
    if (!participant || participant.status !== 'JOINED') return;

    const peer = this.ensurePeer(event.fromUserId);
    const { pc } = peer;
    const { description, candidate } = event.data;

    try {
      if (description) {
        const collision =
          description.type === 'offer' && (peer.makingOffer || pc.signalingState !== 'stable');
        peer.ignoreOffer = !peer.polite && collision;
        if (peer.ignoreOffer) return;

        await pc.setRemoteDescription(description);
        for (const pending of peer.pendingCandidates.splice(0)) {
          await pc.addIceCandidate(pending).catch(() => undefined);
        }
        if (description.type === 'offer') {
          await pc.setLocalDescription();
          this.sendSignal(peer.userId, { description: pc.localDescription ?? undefined });
        }
      } else if (candidate) {
        if (!pc.remoteDescription) {
          peer.pendingCandidates.push(candidate);
          return;
        }
        try {
          await pc.addIceCandidate(candidate);
        } catch (error) {
          if (!peer.ignoreOffer) throw error;
        }
      }
    } catch (error) {
      console.warn('[calls] signalling error', error);
    }
  }

  private handleMedia(event: MediaEvent): void {
    if (this.store.active?.id !== event.callId) return;
    if (event.userId === this.myId) return;
    this.store.setPeerMedia(event.userId, {
      micOn: event.micOn,
      cameraOn: event.cameraOn,
      screenOn: event.screenOn,
    });
  }

  // ─────────────────────────────── peers ───────────────────────────────

  /** Creates/removes peer connections so they match the call's JOINED participants. */
  private syncPeers(call: Call): void {
    const me = this.myId;
    const joined = call.participants.filter((p) => p.status === 'JOINED' && p.userId !== me);
    const joinedIds = new Set(joined.map((p) => p.userId));

    for (const userId of Array.from(this.peers.keys())) {
      if (!joinedIds.has(userId)) this.closePeer(userId);
    }
    let added = false;
    for (const participant of joined) {
      if (!this.peers.has(participant.userId)) {
        this.ensurePeer(participant.userId);
        added = true;
      }
    }

    const store = this.store;
    if (joined.length > 0) {
      if (store.phase !== 'connected') {
        stopTone();
        playCue('connected');
        store.setPhase('connected');
        if (!store.connectedAt) store.setConnectedAt(Date.now());
      }
    } else if (store.phase === 'connected' || store.phase === 'dialing') {
      store.setPhase('dialing');
      if (call.status === 'RINGING') this.ring('ringback');
    }
    if (added) this.broadcastMedia();
  }

  private ensurePeer(userId: string): Peer {
    const existing = this.peers.get(userId);
    if (existing) return existing;

    const me = this.myId ?? '';
    const pc = new RTCPeerConnection({ iceServers: this.store.iceServers });
    const peer: Peer = {
      userId,
      pc,
      polite: me < userId,
      makingOffer: false,
      ignoreOffer: false,
      pendingCandidates: [],
      stream: new MediaStream(),
    };
    this.peers.set(userId, peer);
    this.store.setPeerState(userId, 'connecting');
    this.store.setRemoteStream(userId, peer.stream);

    const local = this.store.localStream;
    if (local) {
      for (const track of local.getTracks()) {
        if (track.kind === 'video' && this.store.screenOn) continue;
        pc.addTrack(track, local);
      }
      const screenTrack = this.store.screenStream?.getVideoTracks()[0];
      if (screenTrack && this.store.screenStream) pc.addTrack(screenTrack, this.store.screenStream);
    }

    pc.onnegotiationneeded = async () => {
      try {
        peer.makingOffer = true;
        await pc.setLocalDescription();
        this.sendSignal(userId, { description: pc.localDescription ?? undefined });
      } catch (error) {
        console.warn('[calls] negotiation failed', error);
      } finally {
        peer.makingOffer = false;
      }
    };

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) this.sendSignal(userId, { candidate: candidate.toJSON() });
    };

    pc.ontrack = ({ track }) => {
      peer.stream.addTrack(track);
      // A fresh MediaStream instance so React effects re-run and re-bind <video>.
      const merged = new MediaStream(peer.stream.getTracks());
      peer.stream = merged;
      this.store.setRemoteStream(userId, merged);
      track.onended = () => {
        peer.stream.removeTrack(track);
        this.store.setRemoteStream(userId, new MediaStream(peer.stream.getTracks()));
      };
    };

    pc.onconnectionstatechange = () => {
      switch (pc.connectionState) {
        case 'connected':
          this.store.setPeerState(userId, 'connected');
          break;
        case 'disconnected':
          this.store.setPeerState(userId, 'reconnecting');
          break;
        case 'failed':
          this.store.setPeerState(userId, 'failed');
          // One ICE restart; if that fails too, the peer stays marked failed.
          pc.restartIce();
          break;
        case 'closed':
          break;
        default:
          this.store.setPeerState(userId, 'connecting');
      }
    };

    return peer;
  }

  private closePeer(userId: string): void {
    const peer = this.peers.get(userId);
    if (!peer) return;
    this.peers.delete(userId);
    peer.pc.onnegotiationneeded = null;
    peer.pc.onicecandidate = null;
    peer.pc.ontrack = null;
    peer.pc.onconnectionstatechange = null;
    try {
      peer.pc.close();
    } catch {
      // Already closed.
    }
    this.store.setRemoteStream(userId, null);
    this.store.setPeerState(userId, null);
  }

  private sendSignal(targetUserId: string, data: SignalData): void {
    const active = this.store.active;
    if (!active || !this.socket) return;
    this.socket.emit(WS_EVENTS.CALL_SIGNAL, { callId: active.id, targetUserId, data });
  }

  private broadcastMedia(): void {
    const { active, micOn, cameraOn, screenOn } = this.store;
    if (!active || !this.socket) return;
    this.socket.emit(WS_EVENTS.CALL_MEDIA, { callId: active.id, micOn, cameraOn, screenOn });
  }

  /** Sends `track` on the peer's video sender, adding one if this is an audio-only link. */
  private attachVideoTrack(peer: Peer, track: MediaStreamTrack, stream: MediaStream): void {
    const sender = peer.pc.getSenders().find((s) => s.track?.kind === 'video');
    if (sender) {
      void sender.replaceTrack(track);
    } else {
      peer.pc.addTrack(track, stream);
    }
  }

  private stopScreenShare(broadcast = true): void {
    const screen = this.store.screenStream;
    if (!screen) return;
    for (const track of screen.getTracks()) track.stop();
    this.store.setScreenStream(null);
    this.store.setMedia({ screenOn: false });
    // Put the camera back on the wire (or nothing, if it is off).
    const camera = this.cameraTrack && this.cameraTrack.readyState === 'live' ? this.cameraTrack : null;
    for (const peer of this.peers.values()) {
      const sender = peer.pc.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) void sender.replaceTrack(camera);
    }
    if (broadcast) this.broadcastMedia();
  }

  // ─────────────────────────────── local media ───────────────────────────────

  private async acquireLocalMedia(withVideo: boolean): Promise<MediaStream> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Calling is not supported in this browser');
    }
    const audio: MediaTrackConstraints = { echoCancellation: true, noiseSuppression: true };
    const video: MediaTrackConstraints = {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: 'user',
    };
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio,
        video: withVideo ? video : false,
      });
      this.cameraTrack = stream.getVideoTracks()[0] ?? null;
      return stream;
    } catch (error) {
      if (withVideo) {
        // No camera (or camera denied): fall back to an audio-only leg.
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio, video: false });
          this.cameraTrack = null;
          return stream;
        } catch (audioError) {
          throw new Error(describeMediaError(audioError));
        }
      }
      throw new Error(describeMediaError(error));
    }
  }

  private releaseLocalMedia(stream: MediaStream): void {
    for (const track of stream.getTracks()) track.stop();
    if (this.store.localStream === stream) this.store.setLocalStream(null);
  }
}

function describeMediaError(error: unknown): string {
  const name = (error as { name?: string })?.name;
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Microphone access was denied. Allow it in your browser settings to make calls.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No microphone was found on this device.';
    case 'NotReadableError':
      return 'Your microphone is in use by another application.';
    default:
      return 'Could not access your microphone.';
  }
}

export const callManager = new CallManager();

// Dev-only hook so browser tests and DevTools can inspect the call state.
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  (window as unknown as { __nexaCall?: unknown }).__nexaCall = { store: useCallStore, manager: callManager };
}
