import { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { Chat, Message, PaginatedMessages } from '@/types/api';
import { queryKeys } from './query-keys';

export type MessagesData = InfiniteData<PaginatedMessages, string | undefined>;

/**
 * Inserts or reconciles a message in every cached messages query for its chat.
 * Handles the three dedupe cases that keep REST + optimistic + WebSocket in sync:
 *  1. message id already present → replace (server copy wins)
 *  2. matching optimistic clientId → replace the temporary message
 *  3. otherwise → prepend as the newest message
 */
export function upsertMessageInCache(queryClient: QueryClient, message: Message): void {
  queryClient.setQueriesData<MessagesData>(
    { queryKey: queryKeys.allMessages(message.chatId) },
    (old) => {
      if (!old || old.pages.length === 0) return old;

      const existsById = old.pages.some((page) => page.items.some((m) => m.id === message.id));
      if (existsById) {
        return mapMessages(old, (m) => (m.id === message.id ? { ...message } : m));
      }

      if (message.clientId) {
        const matchesOptimistic = old.pages.some((page) =>
          page.items.some((m) => m.clientId === message.clientId && m.optimistic),
        );
        if (matchesOptimistic) {
          return mapMessages(old, (m) =>
            m.clientId === message.clientId && m.optimistic ? { ...message } : m,
          );
        }
      }

      const [first, ...rest] = old.pages;
      return {
        ...old,
        pages: [{ ...first, items: [message, ...first.items] }, ...rest],
      };
    },
  );
}

export function updateMessageInCache(
  queryClient: QueryClient,
  chatId: string,
  messageId: string,
  updater: (message: Message) => Message,
): void {
  queryClient.setQueriesData<MessagesData>({ queryKey: queryKeys.allMessages(chatId) }, (old) =>
    old ? mapMessages(old, (m) => (m.id === messageId ? updater(m) : m)) : old,
  );
}

export function markMessageDeletedInCache(
  queryClient: QueryClient,
  chatId: string,
  messageId: string,
): void {
  updateMessageInCache(queryClient, chatId, messageId, (m) => ({
    ...m,
    deletedAt: new Date().toISOString(),
    content: null,
    attachments: [],
    reactions: [],
  }));
}

export function removeMessageFromCache(
  queryClient: QueryClient,
  chatId: string,
  messageId: string,
): void {
  queryClient.setQueriesData<MessagesData>({ queryKey: queryKeys.allMessages(chatId) }, (old) =>
    old
      ? {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.filter((m) => m.id !== messageId),
          })),
        }
      : old,
  );
}

/** Applies delivered/read receipts coming from WebSocket events. */
export function applyReceiptsInCache(
  queryClient: QueryClient,
  chatId: string,
  userId: string,
  messageIds: string[],
  field: 'deliveredAt' | 'readAt',
  timestamp: string,
): void {
  const idSet = new Set(messageIds);
  queryClient.setQueriesData<MessagesData>({ queryKey: queryKeys.allMessages(chatId) }, (old) =>
    old
      ? mapMessages(old, (m) => {
          if (!idSet.has(m.id)) return m;
          const receipts = [...m.receipts];
          const index = receipts.findIndex((r) => r.userId === userId);
          if (index >= 0) {
            receipts[index] = {
              ...receipts[index],
              [field]: timestamp,
              // reads imply delivery
              deliveredAt: receipts[index].deliveredAt ?? timestamp,
            };
          } else {
            receipts.push({
              userId,
              deliveredAt: timestamp,
              readAt: field === 'readAt' ? timestamp : null,
            });
          }
          return { ...m, receipts };
        })
      : old,
  );
}

function mapMessages(data: MessagesData, fn: (message: Message) => Message): MessagesData {
  return {
    ...data,
    pages: data.pages.map((page) => ({ ...page, items: page.items.map(fn) })),
  };
}

// ── chat list cache helpers ──────────────────────────────────────────────────

export function updateChatInList(
  queryClient: QueryClient,
  chatId: string,
  updater: (chat: Chat) => Chat,
): boolean {
  let found = false;
  queryClient.setQueryData<Chat[]>(queryKeys.chats, (old) => {
    if (!old) return old;
    const next = old.map((chat) => {
      if (chat.id !== chatId) return chat;
      found = true;
      return updater(chat);
    });
    // Keep most-recently-active chats on top.
    return next.sort((a, b) => {
      const ta = a.lastMessageAt ?? a.createdAt;
      const tb = b.lastMessageAt ?? b.createdAt;
      return tb.localeCompare(ta);
    });
  });
  return found;
}

export function zeroUnreadInList(queryClient: QueryClient, chatId: string): void {
  updateChatInList(queryClient, chatId, (chat) => ({ ...chat, unreadCount: 0 }));
}
