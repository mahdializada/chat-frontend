'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import type { Chat, MemberRole } from '@/types/api';
import { chatsService, CreateGroupInput, UpdateChatInput } from '../services/chats-service';

export function useChats() {
  return useQuery({
    queryKey: queryKeys.chats,
    queryFn: () => chatsService.list(),
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
      return queryClient.getQueryData<Chat[]>(queryKeys.chats)?.find((c) => c.id === chatId);
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.chats });
      void queryClient.invalidateQueries({ queryKey: queryKeys.chat(chatId) });
    },
  });
}

export function useDeleteChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (chatId: string) => chatsService.remove(chatId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.chats });
    },
  });
}

export function useAddMembers(chatId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberIds: string[]) => chatsService.addMembers(chatId, memberIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.chats });
      void queryClient.invalidateQueries({ queryKey: queryKeys.chat(chatId) });
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.chats });
      void queryClient.invalidateQueries({ queryKey: queryKeys.chat(chatId) });
    },
  });
}
