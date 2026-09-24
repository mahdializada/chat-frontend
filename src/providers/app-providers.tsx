'use client';

import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { CallProvider } from '@/features/calls/components/call-provider';
import { readCachedAccent, writeCachedAccent } from '@/lib/accent';
import { createAppTheme } from '@/lib/theme';
import { useAuthStore } from '@/store/auth-store';
import { AuthProvider } from './auth-provider';
import { SocketProvider } from './socket-provider';
import { ThemeSyncProvider } from './theme-sync-provider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            retry: 1,
            refetchOnWindowFocus: true,
          },
        },
      }),
  );

  // The accent colour lives on the account. Until the session loads, the last
  // accent used in this browser paints the screen (read after mount, so the
  // server-rendered markup and the first client render stay identical).
  const status = useAuthStore((s) => s.status);
  const userAccent = useAuthStore((s) => s.user?.accentColor ?? null);
  const [cachedAccent, setCachedAccent] = useState<string | null>(null);

  useEffect(() => {
    setCachedAccent(readCachedAccent());
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') return;
    writeCachedAccent(userAccent);
    setCachedAccent(userAccent);
  }, [status, userAccent]);

  const accent = status === 'authenticated' ? userAccent : cachedAccent;
  const theme = useMemo(() => createAppTheme(accent), [accent]);

  return (
    <ChakraProvider
      theme={theme}
      // Toasts sit at the top so they never cover the composer on phones.
      toastOptions={{ defaultOptions: { position: 'top', isClosable: true, duration: 4000 } }}
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeSyncProvider>
            <SocketProvider>
              <CallProvider>{children}</CallProvider>
            </SocketProvider>
          </ThemeSyncProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ChakraProvider>
  );
}
