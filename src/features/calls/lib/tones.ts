/**
 * Ringtone (incoming) and ringback (outgoing) generated with the Web Audio API,
 * so no audio assets have to ship with the app. Everything is best-effort:
 * browsers may keep the AudioContext suspended until the user interacts.
 */

type ToneKind = 'ringtone' | 'ringback';

let context: AudioContext | null = null;
let current: { kind: ToneKind; stop: () => void } | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!context) context = new Ctor();
  if (context.state === 'suspended') void context.resume().catch(() => undefined);
  return context;
}

/** Plays `frequencies` together for `duration` seconds starting at `at`. */
function beep(
  ctx: AudioContext,
  destination: AudioNode,
  frequencies: number[],
  at: number,
  duration: number,
  volume: number,
): OscillatorNode[] {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(volume, at + 0.02);
  gain.gain.setValueAtTime(volume, at + duration - 0.03);
  gain.gain.linearRampToValueAtTime(0, at + duration);
  gain.connect(destination);
  return frequencies.map((frequency) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    osc.connect(gain);
    osc.start(at);
    osc.stop(at + duration);
    return osc;
  });
}

function schedule(kind: ToneKind, ctx: AudioContext): () => void {
  const master = ctx.createGain();
  master.gain.value = 1;
  master.connect(ctx.destination);
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const loop = (): void => {
    if (stopped) return;
    const now = ctx.currentTime + 0.05;
    let periodMs: number;
    if (kind === 'ringback') {
      // Classic "ringing on the other end": 2 s tone, 4 s silence.
      beep(ctx, master, [440, 480], now, 2, 0.12);
      periodMs = 6000;
    } else {
      // Two short double-beeps, then a pause.
      const pattern = [0, 0.25, 0.7, 0.95];
      for (const offset of pattern) beep(ctx, master, [880, 1320], now + offset, 0.18, 0.2);
      periodMs = 2600;
    }
    timer = setTimeout(loop, periodMs);
  };
  loop();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    // Fade out instead of clicking off.
    const now = ctx.currentTime;
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0, now + 0.08);
    setTimeout(() => master.disconnect(), 120);
  };
}

export function startTone(kind: ToneKind): void {
  if (current?.kind === kind) return;
  stopTone();
  const ctx = getContext();
  if (!ctx) return;
  try {
    current = { kind, stop: schedule(kind, ctx) };
  } catch {
    current = null;
  }
}

export function stopTone(): void {
  current?.stop();
  current = null;
}

/** Short confirmation blip when the call connects or ends. */
export function playCue(kind: 'connected' | 'ended'): void {
  const ctx = getContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime + 0.02;
    if (kind === 'connected') {
      beep(ctx, ctx.destination, [660], now, 0.09, 0.15);
      beep(ctx, ctx.destination, [880], now + 0.1, 0.12, 0.15);
    } else {
      beep(ctx, ctx.destination, [520], now, 0.1, 0.15);
      beep(ctx, ctx.destination, [392], now + 0.12, 0.16, 0.15);
    }
  } catch {
    // Audio is a nicety; never let it break the call flow.
  }
}
