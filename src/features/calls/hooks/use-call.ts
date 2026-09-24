import { useEffect, useState } from 'react';
import { useCallStore } from '../store/call-store';

/** Seconds elapsed since the call connected, ticking once a second. */
export function useCallTimer(): number {
  const connectedAt = useCallStore((s) => s.connectedAt);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!connectedAt) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [connectedAt]);

  if (!connectedAt) return 0;
  return Math.max(0, Math.floor((now - connectedAt) / 1000));
}

/** Whether this device is currently in a call (any phase but idle/ended). */
export function useInCall(): boolean {
  return useCallStore((s) => s.active !== null);
}
