import { QueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';
import { messagesService } from '@/features/messages/services/messages-service';
import { useAuthStore } from '@/store/auth-store';
import { useChatUiStore } from '@/store/chat-ui-store';
import { useConnectionStore } from '@/store/connection-store';
import { useOutboxStore } from '@/store/outbox-store';
import type {
  AppNotification,
  BasicUser,
  Chat,
  ChatSettings,
  Message,
  Reaction,
} from '@/types/api';
import {
  applyChatSettingsInCache,
  applyReceiptsInCache,
  clearChatMessagesInCache,
  markMessageDeletedInCache,
  removeMessageFromCache,
  updateChatInList,
  updateMessageInCache,
  upsertMessageInCache,
} from './message-cache';
import { queryKeys } from './query-keys';
import { WS_EVENTS } from './socket';
import { flushOutbox } from './outbox';

/** `chat:updated` carries the shared chat only — never per-user state. */
type SharedChatUpdate = Omit<
  Chat,
  'lastMessage' | 'unreadCount' | 'isUnread' | 'settings' | 'blockState'
>;

export interface SocketEventContext {
  socket: Socket;
  queryClient: QueryClient;
  /** The chat currently open in the UI (to auto-mark incoming messages read). */
  getActiveChatId: () => string | null;
  onReady: () => void;
  onChatDeleted: (chatId: string) => void;
  onNotification: (notification: AppNotification) => void;
  onIncomingMessage: (message: Message) => void;
}

/**
 * Wires every server-sent WebSocket event into the React Query cache and the
 * lightweight UI stores. Returns a cleanup function removing all listeners.
 */
export function registerSocketEvents(ctx: SocketEventContext): () => void {
  const { socket, queryClient } = ctx;

  const currentUserId = (): string | null => useAuthStore.getState().user?.id ?? null;

  const invalidateChats = (): void => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.chats });
    void queryClient.invalidateQueries({ queryKey: queryKeys.archivedChats });
  };

  const handlers: Record<string, (...args: never[]) => void> = {
    [WS_EVENTS.READY]: (payload: { userId: string; serverTime?: string }) => {
      // Fired on every (re)connect once all rooms are joined. The client asks
      // the server for everything it missed instead of dropping its cache.
      void syncSinceCursor(queryClient, payload.serverTime);
      invalidateChats();
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      void flushOutbox(queryClient);
      ctx.onReady();
    },

    [WS_EVENTS.MESSAGE_CREATED]: (message: Message) => {
      upsertMessageInCache(queryClient, message);
      useConnectionStore.getState().setSyncCursor(message.updatedAt ?? message.createdAt);

      const me = currentUserId();
      const isOwn = message.senderId === me;
      const isActive =
        ctx.getActiveChatId() === message.chatId &&
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible';

      const found = updateChatInList(queryClient, message.chatId, (chat) => ({
        ...chat,
        lastMessage: message,
        lastMessageAt: message.createdAt,
        unreadCount: isOwn || isActive ? chat.unreadCount : chat.unreadCount + 1,
        isUnread: isOwn || isActive ? chat.isUnread : true,
      }));
      if (!found) invalidateChats();

      // The server accepted a queued message — drop it from the outbox.
      if (message.clientId) {
        useOutboxStore.getState().remove(message.clientId);
      }

      if (!isOwn) {
        if (isActive) {
          // Reading it live — tell the server immediately (updates receipts).
          socket.emit(WS_EVENTS.MARK_READ, { chatId: message.chatId });
          updateChatInList(queryClient, message.chatId, (chat) => ({
            ...chat,
            unreadCount: 0,
            isUnread: false,
          }));
        } else {
          // Received in the background — confirm delivery for the sender's ticks.
          socket.emit(WS_EVENTS.MESSAGE_DELIVERED, { chatId: message.chatId });
          ctx.onIncomingMessage(message);
        }
        // A new message ends that user's "typing..." state.
        if (message.sender) {
          useChatUiStore.getState().setTyping(message.chatId, message.sender, false);
        }
      }
    },

    [WS_EVENTS.MESSAGE_UPDATED]: (message: Message) => {
      updateMessageInCache(queryClient, message.chatId, message.id, (existing) => ({
        ...message,
        // Star state is per-user and not part of the broadcast payload.
        isStarred: existing.isStarred,
      }));
      updateChatInList(queryClient, message.chatId, (chat) =>
        chat.lastMessage?.id === message.id ? { ...chat, lastMessage: message } : chat,
      );
    },

    [WS_EVENTS.MESSAGE_DELETED]: (payload: {
      chatId: string;
      messageId: string;
      forEveryone: boolean;
    }) => {
      if (payload.forEveryone) {
        markMessageDeletedInCache(queryClient, payload.chatId, payload.messageId);
      } else {
        // "Delete for me" confirmed from another of this user's devices/tabs.
        removeMessageFromCache(queryClient, payload.chatId, payload.messageId);
      }
      invalidateChats();
    },

    [WS_EVENTS.MESSAGE_STARRED]: (payload: {
      chatId: string;
      messageId: string;
      isStarred: boolean;
    }) => {
      updateMessageInCache(queryClient, payload.chatId, payload.messageId, (m) => ({
        ...m,
        isStarred: payload.isStarred,
      }));
      void queryClient.invalidateQueries({ queryKey: ['starred-messages'] });
    },

    [WS_EVENTS.MESSAGE_READ]: (payload: {
      chatId: string;
      userId: string;
      messageIds: string[];
      readAt: string;
    }) => {
      applyReceiptsInCache(
        queryClient,
        payload.chatId,
        payload.userId,
        payload.messageIds,
        'readAt',
        payload.readAt,
      );
      if (payload.userId === currentUserId()) {
        updateChatInList(queryClient, payload.chatId, (chat) => ({
          ...chat,
          unreadCount: 0,
          isUnread: false,
        }));
      }
    },

    [WS_EVENTS.MESSAGE_DELIVERED]: (payload: {
      chatId: string;
      userId: string;
      messageIds: string[];
      deliveredAt: string;
    }) => {
      applyReceiptsInCache(
        queryClient,
        payload.chatId,
        payload.userId,
        payload.messageIds,
        'deliveredAt',
        payload.deliveredAt,
      );
    },

    [WS_EVENTS.REACTION_ADD]: (payload: {
      chatId: string;
      messageId: string;
      reaction: Reaction;
    }) => {
      // Replace by (user, emoji) so an optimistic reaction is reconciled with
      // the server copy instead of duplicating it.
      updateMessageInCache(queryClient, payload.chatId, payload.messageId, (m) => ({
        ...m,
        reactions: [
          ...m.reactions.filter(
            (r) => !(r.userId === payload.reaction.userId && r.emoji === payload.reaction.emoji),
          ),
          payload.reaction,
        ],
      }));
    },

    [WS_EVENTS.REACTION_REMOVE]: (payload: {
      chatId: string;
      messageId: string;
      userId: string;
      emoji: string;
    }) => {
      updateMessageInCache(queryClient, payload.chatId, payload.messageId, (m) => ({
        ...m,
        reactions: m.reactions.filter(
          (r) => !(r.userId === payload.userId && r.emoji === payload.emoji),
        ),
      }));
    },

    [WS_EVENTS.TYPING_UPDATE]: (payload: {
      chatId: string;
      user: BasicUser;
      isTyping: boolean;
    }) => {
      if (payload.user.id === currentUserId()) return;
      useChatUiStore.getState().setTyping(payload.chatId, payload.user, payload.isTyping);
    },

    [WS_EVENTS.PRESENCE_UPDATE]: (payload: {
      userId: string;
      isOnline: boolean;
      lastSeen: string | null;
    }) => {
      useChatUiStore.getState().setPresence(payload.userId, {
        isOnline: payload.isOnline,
        lastSeen: payload.lastSeen,
      });
    },

    [WS_EVENTS.CHAT_CREATED]: (chat: Chat) => {
      invalidateChats();
      // Make sure this tab's socket is inside the new chat room.
      socket.emit(WS_EVENTS.CHAT_JOIN, { chatId: chat.id });
    },

    [WS_EVENTS.CHAT_UPDATED]: (chat: SharedChatUpdate) => {
      // The payload carries only the shared parts of the chat. Per-user state
      // (unread count, pin/mute, draft, last visible message) is preserved
      // from the local cache — the server never sends a personalised copy here.
      const merge = (existing: Chat): Chat => ({ ...existing, ...chat });

      const found = updateChatInList(queryClient, chat.id, merge);
      if (!found) {
        invalidateChats();
        return;
      }
      queryClient.setQueryData<Chat>(queryKeys.chat(chat.id), (old) =>
        old ? merge(old) : old,
      );
    },

    [WS_EVENTS.CHAT_DELETED]: (payload: { chatId: string }) => {
      invalidateChats();
      queryClient.removeQueries({ queryKey: queryKeys.allMessages(payload.chatId) });
      ctx.onChatDeleted(payload.chatId);
    },

    [WS_EVENTS.CHAT_CLEARED]: (payload: { chatId: string }) => {
      clearChatMessagesInCache(queryClient, payload.chatId);
      void queryClient.invalidateQueries({ queryKey: queryKeys.allMessages(payload.chatId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sharedMediaCounts(payload.chatId),
      });
      invalidateChats();
    },

    [WS_EVENTS.CHAT_SETTINGS_UPDATED]: (payload: { chatId: string; settings: ChatSettings }) => {
      applyChatSettingsInCache(queryClient, payload.chatId, payload.settings);
    },

    [WS_EVENTS.CHAT_DRAFT_UPDATED]: (payload: { chatId: string; draft: string | null }) => {
      const ui = useChatUiStore.getState();
      if (payload.draft) {
        ui.setDraft(payload.chatId, payload.draft);
      } else {
        ui.clearDraft(payload.chatId);
      }
      updateChatInList(queryClient, payload.chatId, (chat) => ({
        ...chat,
        settings: { ...chat.settings, draft: payload.draft },
      }));
    },

    [WS_EVENTS.BLOCK_UPDATED]: (payload: {
      userId: string;
      blockedByMe: boolean;
      blockedMe: boolean;
    }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.userProfile(payload.userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.blockedUsers });
      invalidateChats();
    },

    [WS_EVENTS.NOTIFICATION_NEW]: (notification: AppNotification) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      ctx.onNotification(notification);
    },
  };

  for (const [event, handler] of Object.entries(handlers)) {
    socket.on(event, handler as (...args: unknown[]) => void);
  }

  return () => {
    for (const [event, handler] of Object.entries(handlers)) {
      socket.off(event, handler as (...args: unknown[]) => void);
    }
    useChatUiStore.getState().reset();
  };
}

/**
 * Reconnect recovery: replays everything that changed since the last cursor
 * into the cache. WebSocket delivery is never assumed to be complete.
 */
async function syncSinceCursor(queryClient: QueryClient, serverTime?: string): Promise<void> {
  const store = useConnectionStore.getState();
  const cursor = store.syncCursor;
  if (serverTime) store.setSyncCursor(serverTime);

  if (!cursor) return;

  try {
    const result = await messagesService.sync(cursor);

    if (result.truncated) {
      // Too much changed to patch incrementally — refetch from scratch.
      await queryClient.invalidateQueries({ queryKey: ['messages'] });
    } else {
      for (const message of result.messages) {
        upsertMessageInCache(queryClient, message);
      }
      for (const messageId of result.removedMessageIds) {
        for (const [key] of queryClient.getQueriesData({ queryKey: ['messages'] })) {
          const chatId = (key as unknown[])[1];
          if (typeof chatId === 'string') removeMessageFromCache(queryClient, chatId, messageId);
        }
      }
    }
    useConnectionStore.getState().setSyncCursor(result.serverTime);
  } catch {
    // Sync is best-effort; the normal query refetch still recovers state.
    await queryClient.invalidateQueries({ queryKey: ['messages'] });
  }
}
