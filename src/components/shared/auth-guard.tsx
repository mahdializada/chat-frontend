'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { FullPageSpinner } from './full-page-spinner';

/** Blocks protected pages until the session is restored; redirects guests to /login. */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  if (status !== 'authenticated') {
    return <FullPageSpinner />;
  }
  return <>{children}</>;
}

/** The opposite guard for login/register pages. */
export function GuestGuard({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/chat');
    }
  }, [status, router]);

  if (status === 'loading') {
    return <FullPageSpinner />;
  }
  if (status === 'authenticated') {
    return <FullPageSpinner />;
  }
  return <>{children}</>;
}
