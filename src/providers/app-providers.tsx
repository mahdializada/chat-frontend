'use client';

import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { theme } from '@/lib/theme';
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

  return (
    <ChakraProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeSyncProvider>
            <SocketProvider>{children}</SocketProvider>
          </ThemeSyncProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ChakraProvider>
  );
}
