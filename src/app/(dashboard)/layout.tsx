'use client';

import { AuthGuard } from '@/components/shared/auth-guard';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
