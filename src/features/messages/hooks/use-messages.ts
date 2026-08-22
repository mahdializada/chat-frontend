'use client';

import {
  InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { optimisticId } from '@/lib/outbox';
import {
  removeMessageFromCache,
  updateChatInList,
  updateMessageInCache,
  upsertMessageInCache,
  zeroUnreadInList,
  type MessagesData,
} from '@/lib/message-cache';
import { queryKeys } from '@/lib/query-keys';
import { getSocket, WS_EVENTS } from '@/lib/socket';
import { useAuthStore } from '@/store/auth-store';
import { useConnectionStore } from '@/store/connection-store';
import { useOutboxStore } from '@/store/outbox-store';
import type { Message, PaginatedMessages, Reaction } from '@/types/api';
import { messagesService, SendMessageInput } from '../services/messages-service';

const PAGE_SIZE = 30;

/**
 * Infinite message history, newest first. When `anchor` is set the first page
 * loads *around* that message (used to jump to search results).
 */
export function useMessages(chatId: string | null, anchor?: string | null) {
  return useInfiniteQuery<
    PaginatedMessages,
    Error,
    InfiniteData<PaginatedMessages, string | undefined>,
    readonly unknown[],
    string | undefined
  >({
    queryKey: queryKeys.messages(chatId ?? 'none', anchor ?? undefined),
    queryFn: ({ pageParam }) =>
      messagesService.list(chatId as string, {
        limit: PAGE_SIZE,
        ...(pageParam ? { cursor: pageParam } : anchor ? { around: anchor } : {}),
      }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!chatId,
  });
}

/** Debounced, server-side message search — optionally scoped to one chat. */
export function useMessageSearch(term: string, chatId?: string) {
  return useQuery({
    queryKey: queryKeys.messageSearch(term, chatId),
    queryFn: () => messagesService.search(term, { chatId, limit: 30 }),
    enabled: term.trim().length >= 2,
    staleTime: 10_000,
  });
}

export function useStarredMessages(chatId?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.starredMessages(chatId),
    queryFn: () => messagesService.listStarred({ chatId, limit: 50 }),
    enabled,
  });
}

export function useMessageReceipts(messageId: string | null) {
  return useQuery({
    queryKey: queryKeys.messageReceipts(messageId ?? 'none'),
    queryFn: () => messagesService.receipts(messageId as string),
    enabled: !!messageId,
  });
}

// ── sending with optimistic updates ─────────────────────────────────────────

export interface SendInput extends Omit<SendMessageInput, 'chatId' | 'clientId'> {
  clientId: string;
}

/**
 * Sends a message with an optimistic bubble. When the client is offline the
 * message is written to the persistent outbox instead and flushed on reconnect;
 * either way the same `clientId` reconciles the server copy.
 */
export function useSendMessage(chatId: string) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async (input: SendInput) => {
      const isOnline = useConnectionStore.getState().isNetworkOnline;
      if (!isOnline) {
        useOutboxStore.getState().enqueue({
          clientId: input.clientId,
          chatId,
          content: input.content,
          type: input.type,
          replyToId: input.replyToId,
          attachments: input.attachments,
          createdAt: new Date().toISOString(),
        });
        return null;
      }
      return messagesService.send({ ...input, chatId });
    },

    onMutate: async (input) => {
      if (!user) return;
      const queued = !useConnectionStore.getState().isNetworkOnline;
      upsertMessageInCache(
        queryClient,
        buildOptimisticMessage({ chatId, input, user, queued, queryClient }),
      );
    },

    onSuccess: (serverMessage, input) => {
      if (!serverMessage) return;
      // Replace the optimistic copy (the socket event may have already done it —
      // upsert handles both cases without duplicating).
      upsertMessageInCache(queryClient, { ...serverMessage, clientId: input.clientId });
      updateChatInList(queryClient, chatId, (chat) => ({
        ...chat,
        lastMessage: serverMessage,
        lastMessageAt: serverMessage.createdAt,
      }));
    },

    onError: (_error, input) => {
      // Keep the bubble and mark it failed so the UI can offer retry/remove.
      updateMessageInCache(queryClient, chatId, optimisticId(input.clientId), (m) => ({
        ...m,
        optimistic: false,
        queued: false,
        failed: true,
      }));
    },
  });
}

function buildOptimisticMessage(args: {
  chatId: string;
  input: SendInput;
  user: NonNullable<ReturnType<typeof useAuthStore.getState>['user']>;
  queued: boolean;
  queryClient: ReturnType<typeof useQueryClient>;
}): Message {
  const { chatId, input, user, queued, queryClient } = args;
  const now = new Date().toISOString();
  const replyTo = input.replyToId
    ? findMessageInCache(queryClient, chatId, input.replyToId)
    : null;

  return {
    id: optimisticId(input.clientId),
    chatId,
    senderId: user.id,
    content: input.content ?? null,
    type: input.type ?? (input.attachments?.length ? 'FILE' : 'TEXT'),
    replyToId: input.replyToId ?? null,
    editedAt: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    isForwarded: false,
    forwardedFromId: null,
    forwardedFrom: null,
    sender: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      avatar: user.avatar,
      isOnline: true,
      lastSeen: null,
    },
    attachments: (input.attachments ?? []).map((a, i) => ({
      id: `optimistic-att-${input.clientId}-${i}`,
      messageId: optimisticId(input.clientId),
      chatId,
      originalName: a.originalName,
      fileName: a.fileName,
      mimeType: a.mimeType,
      size: a.size,
      url: a.url,
      source: a.source ?? 'LOCAL',
      thumbnailUrl: a.thumbnailUrl ?? null,
      duration: a.duration ?? null,
      width: a.width ?? null,
      height: a.height ?? null,
      createdAt: now,
    })),
    reactions: [],
    replyTo: replyTo
      ? {
          id: replyTo.id,
          chatId: replyTo.chatId,
          senderId: replyTo.senderId,
          content: replyTo.content,
          type: replyTo.type,
          deletedAt: replyTo.deletedAt,
          createdAt: replyTo.createdAt,
          sender: replyTo.sender,
          attachments: replyTo.attachments,
        }
      : null,
    receipts: [],
    mentions: [],
    links: [],
    clientId: input.clientId,
    optimistic: !queued,
    queued,
  };
}

export function removeFailedMessage(
  queryClient: ReturnType<typeof useQueryClient>,
  chatId: string,
  messageId: string,
): void {
  removeMessageFromCache(queryClient, chatId, messageId);
}

function findMessageInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  chatId: string,
  messageId: string,
): Message | null {
  const queries = queryClient.getQueriesData<MessagesData>({
    queryKey: queryKeys.allMessages(chatId),
  });
  for (const [, data] of queries) {
    for (const page of data?.pages ?? []) {
      const found = page.items.find((m) => m.id === messageId);
      if (found) return found;
    }
  }
  return null;
}

// ── edit / delete / react / star ────────────────────────────────────────────

export function useEditMessage(chatId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, content }: { messageId: string; content: string }) =>
      messagesService.edit(messageId, content),
    onMutate: async ({ messageId, content }) => {
      updateMessageInCache(queryClient, chatId, messageId, (m) => ({
        ...m,
        content,
        editedAt: new Date().toISOString(),
      }));
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.allMessages(chatId) });
    },
  });
}

export function useDeleteMessage(chatId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, forEveryone }: { messageId: string; forEveryone: boolean }) =>
      messagesService.remove(messageId, forEveryone),
    onSuccess: (_data, { messageId, forEveryone }) => {
      if (forEveryone) {
        // The socket event also does this; doing it here keeps the sender snappy.
        updateMessageInCache(queryClient, chatId, messageId, (m) => ({
          ...m,
          deletedAt: new Date().toISOString(),
          content: null,
          attachments: [],
          reactions: [],
          links: [],
          mentions: [],
        }));
      } else {
        removeMessageFromCache(queryClient, chatId, messageId);
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.chats });
    },
  });
}

export function useDeleteMessages(chatId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageIds, forEveryone }: { messageIds: string[]; forEveryone: boolean }) =>
      messagesService.removeMany(messageIds, forEveryone),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.allMessages(chatId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.chats });
    },
  });
}

export function useForwardMessages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      messageIds,
      chatIds,
      comment,
    }: {
      messageIds: string[];
      chatIds: string[];
      comment?: string;
    }) => messagesService.forward(messageIds, chatIds, comment),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.chats });
    },
  });
}

/** Star state is per user, so it is applied to the message cache locally. */
export function useToggleStar(chatId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ message }: { message: Message }) =>
      message.isStarred ? messagesService.unstar(message.id) : messagesService.star(message.id),
    onMutate: async ({ message }) => {
      updateMessageInCache(queryClient, chatId, message.id, (m) => ({
        ...m,
        isStarred: !m.isStarred,
      }));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['starred-messages'] });
    },
    onError: (_error, { message }) => {
      updateMessageInCache(queryClient, chatId, message.id, (m) => ({
        ...m,
        isStarred: message.isStarred,
      }));
    },
  });
}

export function useStarMessages(chatId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageIds: string[]) => messagesService.starMany(messageIds),
    onSuccess: (_data, messageIds) => {
      for (const id of messageIds) {
        updateMessageInCache(queryClient, chatId, id, (m) => ({ ...m, isStarred: true }));
      }
      void queryClient.invalidateQueries({ queryKey: ['starred-messages'] });
    },
  });
}

/** Adds the reaction if missing, removes it when the user already reacted. */
export function useToggleReaction(chatId: string) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: ({ message, emoji }: { message: Message; emoji: string }) => {
      const mine = message.reactions.some((r) => r.userId === user?.id && r.emoji === emoji);
      return mine
        ? messagesService.removeReaction(message.id, emoji)
        : messagesService.addReaction(message.id, emoji);
    },
    onMutate: async ({ message, emoji }) => {
      if (!user) return;
      const mine = message.reactions.some((r) => r.userId === user.id && r.emoji === emoji);
      updateMessageInCache(queryClient, chatId, message.id, (m) => {
        if (mine) {
          return {
            ...m,
            reactions: m.reactions.filter((r) => !(r.userId === user.id && r.emoji === emoji)),
          };
        }
        const optimisticReaction: Reaction = {
          id: `optimistic-react-${Date.now()}`,
          messageId: m.id,
          userId: user.id,
          emoji,
          createdAt: new Date().toISOString(),
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            avatar: user.avatar,
            isOnline: true,
            lastSeen: null,
          },
        };
        return { ...m, reactions: [...m.reactions, optimisticReaction] };
      });
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.allMessages(chatId) });
    },
  });
}

// ── read receipts ───────────────────────────────────────────────────────────

/** Marks the chat read (debounced) whenever it is open and visible. */
export function useMarkChatRead(chatId: string | null, hasUnread: boolean) {
  const queryClient = useQueryClient();
  const lastMarkRef = useRef(0);

  const markRead = useCallback(() => {
    if (!chatId) return;
    const now = Date.now();
    if (now - lastMarkRef.current < 1000) return;
    lastMarkRef.current = now;

    zeroUnreadInList(queryClient, chatId);
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit(WS_EVENTS.MARK_READ, { chatId });
    } else {
      void messagesService.markChatRead(chatId).catch(() => undefined);
    }
  }, [chatId, queryClient]);

  useEffect(() => {
    if (!chatId || !hasUnread) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      markRead();
    }
  }, [chatId, hasUnread, markRead]);

  useEffect(() => {
    const onVisible = (): void => {
      if (document.visibilityState === 'visible') markRead();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [markRead]);

  return markRead;
}

// ── typing ──────────────────────────────────────────────────────────────────

const TYPING_THROTTLE_MS = 2500;

/** Emits typing start/stop events, throttled so we do not spam the server. */
export function useTypingEmitter(chatId: string | null) {
  const lastSentRef = useRef(0);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    lastSentRef.current = 0;
    const socket = getSocket();
    if (socket?.connected && chatId) {
      socket.emit(WS_EVENTS.TYPING_STOP, { chatId });
    }
  }, [chatId]);

  const onType = useCallback(() => {
    const socket = getSocket();
    if (!socket?.connected || !chatId) return;

    const now = Date.now();
    if (now - lastSentRef.current > TYPING_THROTTLE_MS) {
      lastSentRef.current = now;
      socket.emit(WS_EVENTS.TYPING_START, { chatId });
    }
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    stopTimerRef.current = setTimeout(stop, 3000);
  }, [chatId, stop]);

  // Stop typing when navigating away/unmounting.
  useEffect(() => stop, [stop]);

  return { onType, stopTyping: stop };
}
