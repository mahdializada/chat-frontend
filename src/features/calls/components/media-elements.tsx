'use client';

import { useEffect, useRef } from 'react';
import { useCallStore } from '../store/call-store';

interface StreamVideoProps {
  stream: MediaStream | null;
  /** Local previews are muted (you would hear yourself) and mirrored. */
  muted?: boolean;
  mirror?: boolean;
  fit?: 'cover' | 'contain';
}

/** A <video> bound to a MediaStream. Always muted — sound comes from RemoteAudio. */
export function StreamVideo({ stream, muted = true, mirror = false, fit = 'cover' }: StreamVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    if (stream) void el.play().catch(() => undefined);
    return () => {
      el.srcObject = null;
    };
  }, [stream]);

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      style={{
        width: '100%',
        height: '100%',
        objectFit: fit,
        transform: mirror ? 'scaleX(-1)' : undefined,
        background: '#000',
      }}
    />
  );
}

function AudioElement({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    void el.play().catch(() => undefined);
    return () => {
      el.srcObject = null;
    };
  }, [stream]);
  return <audio ref={ref} autoPlay style={{ display: 'none' }} />;
}

/**
 * Plays every remote participant's audio. Mounted for the whole call, even
 * while the call screen is minimised, so sound never depends on the layout.
 */
export function RemoteAudio() {
  const remoteStreams = useCallStore((s) => s.remoteStreams);
  return (
    <>
      {Object.entries(remoteStreams).map(([userId, stream]) => (
        <AudioElement key={userId} stream={stream} />
      ))}
    </>
  );
}
