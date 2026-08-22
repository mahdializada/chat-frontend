'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { applyChatSettingsInCache } from '@/lib/message-cache';
import { queryKeys } from '@/lib/query-keys';
import type {
  Chat,
  MediaCategory,
  MemberRole,
  PaginatedSharedMedia,
} from '@/types/api';
import {
  chatsService,
  ChatSettingsInput,
  CreateGroupInput,
  MuteDuration,
  UpdateChatInput,
} from '../services/chats-service';

export function useChats(options: { archived?: boolean } = {}) {
  const archived = options.archived === true;
  return useQuery({
    queryKey: archived ? queryKeys.archivedChats : queryKeys.chats,
    queryFn: () => chatsService.list({ archived }),
  });
}

export function useArchivedSummary() {
  return useQuery({
    queryKey: queryKeys.archivedSummary,
    queryFn: () => chatsService.archivedSummary(),
    staleTime: 30_000,
  });
}

/** Single chat — served from the chats list when possible, fetched otherwise. */
export function useChat(chatId: string | null) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: queryKeys.chat(chatId ?? 'none'),
    queryFn: () => chatsService.getById(chatId as string),
    enabled: !!chatId,
    initialData: () => {
      if (!chatId) return undefined;
      for (const key of [queryKeys.chats, queryKeys.archivedChats]) {
        const found = queryClient.getQueryData<Chat[]>(key)?.find((c) => c.id === chatId);
        if (found) return found;
      }
      return undefined;
    },
    initialDataUpdatedAt: () => queryClient.getQueryState(queryKeys.chats)?.dataUpdatedAt,
  });
}

export function useCreateDirectChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => chatsService.createDirect(userId),
    onSuccess: (chat) => {
      queryClient.setQueryData<Chat[]>(queryKeys.chats, (old) => {
        if (!old) return old;
        return old.some((c) => c.id === chat.id) ? old : [chat, ...old];
      });
    },
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGroupInput) => chatsService.createGroup(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.chats });
    },
  });
}

export function useUpdateChat(chatId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateChatInput) => chatsService.update(chatId, input),
    onSuccess: (chat) => {
      queryClient.setQueryData(queryKeys.chat(chatId), chat);
      void queryClient.invalidateQueries({ queryKey: queryKeys.chats });
    },
  });
}

export function useDeleteChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (chatId: string) => chatsService.remove(chatId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.chats });
      void queryClient.invalidateQueries({ queryKey: queryKeys.archivedChats });
    },
  });
}

// ── members ─────────────────────────────────────────────────────────────────

export function useAddMembers(chatId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberIds: string[]) => chatsService.addMembers(chatId, memberIds),
    onSuccess: (chat) => {
      queryClient.setQueryData(queryKeys.chat(chatId), chat);
      void queryClient.invalidateQueries({ queryKey: queryKeys.chats });
    },
  });
}

export function useRemoveMember(chatId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => chatsService.removeMember(chatId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.chats });
      void queryClient.invalidateQueries({ queryKey: queryKeys.chat(chatId) });
    },
  });
}

export function useUpdateMemberRole(chatId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: MemberRole }) =>
      chatsService.updateMemberRole(chatId, userId, role),
    onSuccess: (chat) => {
      queryClient.setQueryData(queryKeys.chat(chatId), chat);
      void queryClient.invalidateQueries({ queryKey: queryKeys.chats });
    },
  });
}

export function useTransferOwnership(chatId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => chatsService.transferOwnership(chatId, userId),
    onSuccess: (chat) => {
      queryClient.setQueryData(queryKeys.chat(chatId), chat);
      void queryClient.invalidateQueries({ queryKey: queryKeys.chats });
    },
  });
}

// ── per-user settings ───────────────────────────────────────────────────────

/**
 * Pin / archive / mark-unread. The change is applied to the cache immediately;
 * the server echo (and the multi-device WebSocket event) reconcile it.
 */
export function useUpdateChatSettings(chatId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ChatSettingsInput) => chatsService.updateSettings(chatId, input),
    onSuccess: (settings) => applyChatSettingsInCache(queryClient, chatId, settings),
  });
}

export function useMuteChat(chatId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { duration?: MuteDuration; muteExceptMentions?: boolean }) =>
      chatsService.setMute(chatId, input.duration, input.muteExceptMentions),
    onSuccess: (settings) => applyChatSettingsInCache(queryClient, chatId, settings),
  });
}

export function useClearChat(chatId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => chatsService.clear(chatId),
    onSuccess: (settings) => {
      applyChatSettingsInCache(queryClient, chatId, settings);
      void queryClient.invalidateQueries({ queryKey: queryKeys.allMessages(chatId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.sharedMediaCounts(chatId) });
    },
  });
}

// ── shared media ────────────────────────────────────────────────────────────

export function useSharedMediaCounts(chatId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.sharedMediaCounts(chatId ?? 'none'),
    queryFn: () => chatsService.mediaCounts(chatId as string),
    enabled: !!chatId && enabled,
    staleTime: 20_000,
  });
}

export function useSharedMedia(
  chatId: string | null,
  category: MediaCategory,
  options: { search?: string; sort?: 'newest' | 'oldest'; enabled?: boolean } = {},
) {
  const search = options.search ?? '';
  const sort = options.sort ?? 'newest';
  return useInfiniteQuery<PaginatedSharedMedia, Error, PaginatedSharedMedia[], readonly unknown[], string | undefined>({
    queryKey: queryKeys.sharedMedia(chatId ?? 'none', category, search, sort),
    queryFn: ({ pageParam }) =>
      chatsService.media(chatId as string, {
        category,
        search: search || undefined,
        sort,
        before: pageParam,
        limit: 30,
      }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    select: (data) => data.pages,
    enabled: !!chatId && options.enabled !== false,
  });
}

// ── invites ─────────────────────────────────────────────────────────────────

export function useGroupInvite(chatId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.chatInvite(chatId ?? 'none'),
    queryFn: () => chatsService.getInvite(chatId as string),
    enabled: !!chatId && enabled,
  });
}

export function useInviteMutations(chatId: string) {
  const queryClient = useQueryClient();
  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.chatInvite(chatId) });
  };

  return {
    create: useMutation({ mutationFn: () => chatsService.createInvite(chatId), onSuccess: invalidate }),
    regenerate: useMutation({
      mutationFn: () => chatsService.regenerateInvite(chatId),
      onSuccess: invalidate,
    }),
    revoke: useMutation({ mutationFn: () => chatsService.revokeInvite(chatId), onSuccess: invalidate }),
  };
}

export function useInvitePreview(token: string) {
  return useQuery({
    queryKey: queryKeys.invitePreview(token),
    queryFn: () => chatsService.previewInvite(token),
    enabled: token.length > 0,
    retry: false,
  });
}

export function useJoinByInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => chatsService.joinByInvite(token),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.chats });
    },
  });
}
