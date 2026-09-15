import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ColorModeScript } from '@chakra-ui/react';
import { APP_DESCRIPTION, APP_NAME } from '@/lib/brand';
import { AppProviders } from '@/providers/app-providers';

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Lets the composer pad itself past the iPhone home indicator.
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1a202c' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body>
        {/* Keep in sync with theme.config.initialColorMode (theme.ts is client-only). */}
        <ColorModeScript initialColorMode="system" />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
