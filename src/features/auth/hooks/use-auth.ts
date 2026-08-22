'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { queryKeys } from '@/lib/query-keys';
import { disconnectSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth-store';
import { useChatUiStore } from '@/store/chat-ui-store';
import { useOutboxStore } from '@/store/outbox-store';
import {
  authService,
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
} from '../services/auth-service';

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const router = useRouter();
  return useMutation({
    mutationFn: (input: LoginInput) => authService.login(input),
    onSuccess: async ({ accessToken }) => {
      // The login response carries the public user; fetch the full record so
      // privacy/appearance preferences are available immediately.
      useAuthStore.getState().setAccessToken(accessToken);
      const me = await authService.me();
      setAuth(me, accessToken);
      router.replace('/chat');
    },
  });
}

export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const router = useRouter();
  return useMutation({
    mutationFn: (input: RegisterInput) => authService.register(input),
    onSuccess: async ({ accessToken }) => {
      useAuthStore.getState().setAccessToken(accessToken);
      const me = await authService.me();
      setAuth(me, accessToken);
      router.replace('/chat');
    },
  });
}

export function useLogout() {
  const clear = useAuthStore((s) => s.clear);
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      disconnectSocket();
      clear();
      useChatUiStore.getState().reset();
      useOutboxStore.getState().clear();
      queryClient.clear();
      router.replace('/login');
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) => authService.changePassword(input),
  });
}

// ── active sessions ─────────────────────────────────────────────────────────

export function useSessions(enabled = true) {
  return useQuery({
    queryKey: queryKeys.sessions,
    queryFn: () => authService.sessions(),
    enabled,
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => authService.revokeSession(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
    },
  });
}

export function useRevokeOtherSessions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authService.revokeOtherSessions(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
    },
  });
}

export function useRevokeAllSessions() {
  const logout = useLogout();
  return useMutation({
    mutationFn: () => authService.revokeAllSessions(),
    onSuccess: () => logout.mutate(),
  });
}
