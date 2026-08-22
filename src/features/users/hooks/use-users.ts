'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import type { ReportReason, SelfUser } from '@/types/api';
import {
  usersService,
  UpdatePreferencesInput,
  UpdatePrivacyInput,
  UpdateProfileInput,
} from '../services/users-service';

export function useContactProfile(userId: string | null) {
  return useQuery({
    queryKey: queryKeys.userProfile(userId ?? 'none'),
    queryFn: () => usersService.getProfile(userId as string),
    enabled: !!userId,
  });
}

export function useCommonGroups(userId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.commonGroups(userId ?? 'none'),
    queryFn: () => usersService.getCommonGroups(userId as string),
    enabled: !!userId && enabled,
  });
}

export function useBlockedUsers(enabled = true) {
  return useQuery({
    queryKey: queryKeys.blockedUsers,
    queryFn: () => usersService.listBlocked(),
    enabled,
  });
}

export function useBlockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, block }: { userId: string; block: boolean }) =>
      block ? usersService.block(userId) : usersService.unblock(userId),
    onSuccess: (_data, { userId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.userProfile(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.blockedUsers });
      void queryClient.invalidateQueries({ queryKey: queryKeys.chats });
    },
  });
}

export function useReportUser() {
  return useMutation({
    mutationFn: ({
      userId,
      ...input
    }: {
      userId: string;
      reason: ReportReason;
      details?: string;
      chatId?: string;
    }) => usersService.report(userId, input),
  });
}

/** Shared success handler: profile/privacy/preferences all return the full self user. */
function useSelfUserMutation<TInput>(mutationFn: (input: TInput) => Promise<SelfUser>) {
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (user) => {
      setUser(user);
      queryClient.setQueryData(queryKeys.me, user);
    },
  });
}

export function useUpdateProfile() {
  return useSelfUserMutation<UpdateProfileInput>((input) => usersService.updateMe(input));
}

export function useUpdatePrivacy() {
  return useSelfUserMutation<UpdatePrivacyInput>((input) => usersService.updatePrivacy(input));
}

export function useUpdatePreferences() {
  return useSelfUserMutation<UpdatePreferencesInput>((input) =>
    usersService.updatePreferences(input),
  );
}
