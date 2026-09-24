import { create } from 'zustand';
import type { Call, CallEndReason, IceServer } from '@/types/api';

export type CallPhase =
  /** No call on this device. */
  | 'idle'
  /** Waiting for microphone/camera permission before the call is created. */
  | 'requesting-media'
  /** The call exists but nobody else has joined yet. */
  | 'dialing'
  /** At least one other participant is in the call. */
  | 'connected'
  /** Hung up; the overlay shows the outcome for a moment before closing. */
  | 'ended';

export type PeerConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'failed';

export interface PeerMedia {
  micOn: boolean;
  cameraOn: boolean;
  screenOn: boolean;
}

interface CallState {
  active: Call | null;
  phase: CallPhase;
  /** Calls ringing for this user (shown as incoming-call cards). */
  incoming: Call[];
  /** Active group calls this user is not in, keyed by chat id ("Join call" banner). */
  joinable: Record<string, Call>;
  iceServers: IceServer[];

  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  peerStates: Record<string, PeerConnectionState>;
  peerMedia: Record<string, PeerMedia>;

  micOn: boolean;
  cameraOn: boolean;
  screenOn: boolean;
  isMinimized: boolean;
  /** Epoch ms when the first other participant connected — drives the timer. */
  connectedAt: number | null;
  ended: { call: Call; reason: CallEndReason } | null;

  setActive: (call: Call | null) => void;
  setPhase: (phase: CallPhase) => void;
  setIceServers: (servers: IceServer[]) => void;
  addIncoming: (call: Call) => void;
  removeIncoming: (callId: string) => void;
  setJoinable: (call: Call) => void;
  removeJoinable: (chatId: string) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setScreenStream: (stream: MediaStream | null) => void;
  setRemoteStream: (userId: string, stream: MediaStream | null) => void;
  setPeerState: (userId: string, state: PeerConnectionState | null) => void;
  setPeerMedia: (userId: string, media: PeerMedia) => void;
  setMedia: (patch: Partial<Pick<CallState, 'micOn' | 'cameraOn' | 'screenOn'>>) => void;
  setMinimized: (value: boolean) => void;
  setConnectedAt: (value: number | null) => void;
  setEnded: (value: CallState['ended']) => void;
  resetCall: () => void;
}

const EMPTY_CALL = {
  active: null,
  phase: 'idle' as CallPhase,
  localStream: null,
  screenStream: null,
  remoteStreams: {},
  peerStates: {},
  peerMedia: {},
  micOn: true,
  cameraOn: false,
  screenOn: false,
  isMinimized: false,
  connectedAt: null,
};

export const useCallStore = create<CallState>((set) => ({
  ...EMPTY_CALL,
  incoming: [],
  joinable: {},
  iceServers: [],
  ended: null,

  setActive: (call) => set({ active: call }),
  setPhase: (phase) => set({ phase }),
  setIceServers: (iceServers) => set({ iceServers }),

  addIncoming: (call) =>
    set((state) => ({
      incoming: [...state.incoming.filter((c) => c.id !== call.id), call],
    })),
  removeIncoming: (callId) =>
    set((state) => ({ incoming: state.incoming.filter((c) => c.id !== callId) })),

  setJoinable: (call) => set((state) => ({ joinable: { ...state.joinable, [call.chatId]: call } })),
  removeJoinable: (chatId) =>
    set((state) => {
      if (!(chatId in state.joinable)) return state;
      const joinable = { ...state.joinable };
      delete joinable[chatId];
      return { joinable };
    }),

  setLocalStream: (localStream) => set({ localStream }),
  setScreenStream: (screenStream) => set({ screenStream }),
  setRemoteStream: (userId, stream) =>
    set((state) => {
      const remoteStreams = { ...state.remoteStreams };
      if (stream) remoteStreams[userId] = stream;
      else delete remoteStreams[userId];
      return { remoteStreams };
    }),
  setPeerState: (userId, peerState) =>
    set((state) => {
      const peerStates = { ...state.peerStates };
      if (peerState) peerStates[userId] = peerState;
      else delete peerStates[userId];
      return { peerStates };
    }),
  setPeerMedia: (userId, media) =>
    set((state) => ({ peerMedia: { ...state.peerMedia, [userId]: media } })),

  setMedia: (patch) => set(patch),
  setMinimized: (isMinimized) => set({ isMinimized }),
  setConnectedAt: (connectedAt) => set({ connectedAt }),
  setEnded: (ended) => set({ ended }),

  resetCall: () => set({ ...EMPTY_CALL }),
}));
