import { create } from 'zustand';
import type { User } from '@/types/api';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  status: AuthStatus;
  setAuth: (user: User, accessToken: string) => void;
  setUser: (user: User) => void;
  setAccessToken: (accessToken: string) => void;
  clear: () => void;
}

/**
 * Access token lives only in memory (never persisted) — a page refresh
 * silently restores the session via the httpOnly refresh-token cookie.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  status: 'loading',
  setAuth: (user, accessToken) => set({ user, accessToken, status: 'authenticated' }),
  setUser: (user) => set({ user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  clear: () => set({ user: null, accessToken: null, status: 'unauthenticated' }),
}));
