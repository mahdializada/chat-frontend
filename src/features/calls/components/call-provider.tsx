'use client';

import { useEffect } from 'react';
import { getSocket } from '@/lib/socket';
import { useSocketContext } from '@/providers/socket-provider';
import { useAuthStore } from '@/store/auth-store';
import { callManager } from '../lib/call-manager';
import { callsService } from '../services/calls-service';
import { CallOverlay } from './call-overlay';
import { IncomingCallDialog } from './incoming-call-dialog';
import { RemoteAudio } from './media-elements';

/**
 * Connects the call manager to the socket and mounts the call UI once for the
 * whole app, so calls survive navigation between chats.
 */
export function CallProvider({ children }: { children: React.ReactNode }) {
  const { isReady } = useSocketContext();
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (!isReady) return;
    const socket = getSocket();
    if (!socket) return;
    const detach = callManager.attach(socket);
    void callManager.handleReady(() => callsService.active());
    return detach;
  }, [isReady]);

  // Logging out hangs up.
  useEffect(() => {
    if (status === 'unauthenticated') void callManager.leave();
  }, [status]);

  // Closing the tab tells the server right away instead of waiting for the grace period.
  useEffect(() => {
    const onUnload = (): void => callManager.leaveImmediately();
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, []);

  return (
    <>
      {children}
      <RemoteAudio />
      <CallOverlay />
      <IncomingCallDialog />
    </>
  );
}
