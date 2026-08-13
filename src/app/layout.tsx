import type { Metadata, Viewport } from 'next';
import { ColorModeScript } from '@chakra-ui/react';
import { AppProviders } from '@/providers/app-providers';

export const metadata: Metadata = {
  title: 'Chat',
  description: 'Real-time chat application',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* Keep in sync with theme.config.initialColorMode (theme.ts is client-only). */}
        <ColorModeScript initialColorMode="system" />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
