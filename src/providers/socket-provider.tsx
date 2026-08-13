'use client';

import { useToast } from '@chakra-ui/react';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { registerSocketEvents } from '@/lib/socket-events';
import { getActiveChatId } from '@/store/active-chat';
import { useAuthStore } from '@/store/auth-store';

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

  useEffect(() => {
    if (status !== 'authenticated') {
      disconnectSocket();
      setIsReady(false);
      return;
    }

    const socket = connectSocket();
    const cleanup = registerSocketEvents({
      socket,
      queryClient,
      getActiveChatId,
      onReady: () => setIsReady(true),
      onChatDeleted: (chatId) => {
        if (pathnameRef.current?.includes(`/chat/${chatId}`)) {
          routerRef.current.push('/chat');
        }
      },
      onNotification: (notification) => {
        toastRef.current({
          title: notification.title,
          description: notification.body ?? undefined,
          status: 'info',
          duration: 4000,
          isClosable: true,
          position: 'top-right',
        });
      },
    });

    const handleDisconnect = (): void => setIsReady(false);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('disconnect', handleDisconnect);
      cleanup();
    };
  }, [status, queryClient]);

  return <SocketContext.Provider value={{ isReady }}>{children}</SocketContext.Provider>;
}
