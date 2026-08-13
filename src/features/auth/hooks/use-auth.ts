'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { disconnectSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth-store';
import { useChatUiStore } from '@/store/chat-ui-store';
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
    onSuccess: ({ user, accessToken }) => {
      setAuth(user, accessToken);
      router.replace('/chat');
    },
  });
}

export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const router = useRouter();
  return useMutation({
    mutationFn: (input: RegisterInput) => authService.register(input),
    onSuccess: ({ user, accessToken }) => {
      setAuth(user, accessToken);
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
