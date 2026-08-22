'use client';

import { useToast } from '@chakra-ui/react';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { shouldNotify, showMessageNotification } from '@/lib/notifications';
import { flushOutbox } from '@/lib/outbox';
import { queryKeys } from '@/lib/query-keys';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { registerSocketEvents } from '@/lib/socket-events';
import { getActiveChatId } from '@/store/active-chat';
import { useAuthStore } from '@/store/auth-store';
import { useConnectionStore } from '@/store/connection-store';
import type { Chat } from '@/types/api';

interface SocketContextValue {
  /** True once the server confirmed authentication and room joins. */
  isReady: boolean;
}

const SocketContext = createContext<SocketContextValue>({ isReady: false });

export function useSocketContext(): SocketContextValue {
  return useContext(SocketContext);
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const [isReady, setIsReady] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const toast = useToast();

  // Keep the latest router/toast in refs so the socket effect never re-runs.
  const routerRef = useRef(router);
  routerRef.current = router;
  const pathnameRef = useRef<string | null>(null);
  pathnameRef.current = usePathname();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  // ── browser network status drives the offline banner and the outbox ───────
  useEffect(() => {
    const update = (): void => {
      const online = navigator.onLine;
      useConnectionStore.getState().setNetworkOnline(online);
      if (online) void flushOutbox(queryClient);
    };
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, [queryClient]);

  const notifyIncoming = useCallback(
    (message: Parameters<Parameters<typeof registerSocketEvents>[0]['onIncomingMessage']>[0]) => {
      const me = useAuthStore.getState().user;
      if (!me) return;
      const chat = queryClient
        .getQueryData<Chat[]>(queryKeys.chats)
        ?.find((c) => c.id === message.chatId);

      if (!shouldNotify({ chat, message, currentUserId: me.id, notificationsEnabled: me.notificationsEnabled })) {
        return;
      }
      showMessageNotification({
        chat,
        message,
        onClick: () => routerRef.current.push(`/chat/${message.chatId}`),
      });
    },
    [queryClient],
  );

  useEffect(() => {
    if (status !== 'authenticated') {
      disconnectSocket();
      setIsReady(false);
      useConnectionStore.getState().setSocketReady(false);
      return;
    }

    const socket = connectSocket();
    const cleanup = registerSocketEvents({
      socket,
      queryClient,
      getActiveChatId,
      onReady: () => {
        setIsReady(true);
        useConnectionStore.getState().setSocketReady(true);
      },
      onChatDeleted: (chatId) => {
        if (pathnameRef.current?.includes(`/chat/${chatId}`)) {
          routerRef.current.push('/chat');
        }
      },
      onNotification: (notification) => {
        toastRef.current({
          title: notification.title,
          description: notification.body ?? undefined,
          status: notification.type === 'MENTION' ? 'warning' : 'info',
          duration: 4000,
          isClosable: true,
          position: 'top-right',
        });
      },
      onIncomingMessage: notifyIncoming,
    });

    const handleDisconnect = (): void => {
      setIsReady(false);
      useConnectionStore.getState().setSocketReady(false);
    };
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('disconnect', handleDisconnect);
      cleanup();
    };
  }, [status, queryClient, notifyIncoming]);

  return <SocketContext.Provider value={{ isReady }}>{children}</SocketContext.Provider>;
}
