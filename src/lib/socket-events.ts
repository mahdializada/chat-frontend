import { QueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth-store';
import { useChatUiStore } from '@/store/chat-ui-store';
import type { AppNotification, BasicUser, Chat, Message } from '@/types/api';
import {
  applyReceiptsInCache,
  markMessageDeletedInCache,
  removeMessageFromCache,
  updateChatInList,
  updateMessageInCache,
  upsertMessageInCache,
} from './message-cache';
import { queryKeys } from './query-keys';
import { WS_EVENTS } from './socket';

export interface SocketEventContext {
  socket: Socket;
  queryClient: QueryClient;
  /** The chat currently open in the UI (to auto-mark incoming messages read). */
  getActiveChatId: () => string | null;
  onReady: () => void;
  onChatDeleted: (chatId: string) => void;
  onNotification: (notification: AppNotification) => void;
}

/**
 * Wires every server-sent WebSocket event into the React Query cache and the
 * lightweight UI stores. Returns a cleanup function removing all listeners.
 */
export function registerSocketEvents(ctx: SocketEventContext): () => void {
  const { socket, queryClient } = ctx;
  const ui = useChatUiStore.getState();

  const currentUserId = (): string | null => useAuthStore.getState().user?.id ?? null;

  const invalidateChats = (): void => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.chats });
  };

  const handlers: Record<string, (...args: never[]) => void> = {
    [WS_EVENTS.READY]: () => {
      // Fired on every (re)connect once all rooms are joined — refetch server
      // state so anything missed while disconnected is recovered.
      invalidateChats();
      void queryClient.invalidateQueries({ queryKey: ['messages'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      ctx.onReady();
    },

    [WS_EVENTS.MESSAGE_CREATED]: (message: Message) => {
      upsertMessageInCache(queryClient, message);

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
      }));
      if (!found) invalidateChats();

      if (!isOwn) {
        if (isActive) {
          // Reading it live — tell the server immediately (updates receipts).
          socket.emit(WS_EVENTS.MARK_READ, { chatId: message.chatId });
          void queryClient.setQueryData<Chat[]>(queryKeys.chats, (old) =>
            old?.map((c) => (c.id === message.chatId ? { ...c, unreadCount: 0 } : c)),
          );
        } else {
          // Received in the background — confirm delivery for the sender's ticks.
          socket.emit(WS_EVENTS.MESSAGE_DELIVERED, { chatId: message.chatId });
        }
        // A new message ends that user's "typing..." state.
        if (message.sender) {
          useChatUiStore.getState().setTyping(message.chatId, message.sender, false);
        }
      }
    },

    [WS_EVENTS.MESSAGE_UPDATED]: (message: Message) => {
      updateMessageInCache(queryClient, message.chatId, message.id, () => message);
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
      reaction: Message['reactions'][number];
    }) => {
      // Replace by (user, emoji) so an optimistic reaction is reconciled with
      // the server copy instead of duplicating it.
      updateMessageInCache(queryClient, payload.chatId, payload.messageId, (m) => ({
        ...m,
        reactions: [
          ...m.reactions.filter(
            (r) =>
              !(r.userId === payload.reaction.userId && r.emoji === payload.reaction.emoji),
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

    [WS_EVENTS.CHAT_UPDATED]: (chat: Chat) => {
      invalidateChats();
      void queryClient.invalidateQueries({ queryKey: queryKeys.chat(chat.id) });
    },

    [WS_EVENTS.CHAT_DELETED]: (payload: { chatId: string }) => {
      invalidateChats();
      queryClient.removeQueries({ queryKey: queryKeys.allMessages(payload.chatId) });
      ctx.onChatDeleted(payload.chatId);
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
    ui.reset();
  };
}
