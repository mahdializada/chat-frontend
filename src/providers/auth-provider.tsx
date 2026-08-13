'use client';

import { useEffect } from 'react';
import { refreshSession } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';

/**
 * Restores the session after a full page load: the httpOnly refresh cookie is
 * exchanged for an access token before any protected UI renders.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (useAuthStore.getState().status === 'loading') {
      void refreshSession();
    }
  }, []);

  return <>{children}</>;
}
