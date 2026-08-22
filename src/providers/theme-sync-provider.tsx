'use client';

import { useColorMode } from '@chakra-ui/react';
import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth-store';

/**
 * Applies the theme stored on the user's account once the session is restored,
 * so the preference follows them to any device rather than living in one
 * browser's local storage.
 */
export function ThemeSyncProvider({ children }: { children: React.ReactNode }) {
  const theme = useAuthStore((s) => s.user?.theme);
  const { setColorMode } = useColorMode();
  const appliedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!theme || appliedRef.current === theme) return;
    appliedRef.current = theme;
    setColorMode(theme);
  }, [theme, setColorMode]);

  return <>{children}</>;
}
