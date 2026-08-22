import { create } from 'zustand';
import type { BasicUser } from '@/types/api';

interface PresenceEntry {
  isOnline: boolean;
  lastSeen: string | null;
}

interface ChatUiState {
  /** Live presence overrides received over WebSocket (fresher than API data). */
  presence: Record<string, PresenceEntry>;
  /** Users currently typing, per chat. */
  typing: Record<string, Record<string, BasicUser>>;
  /** Unsent drafts mirrored locally so switching chats feels instant. */
  drafts: Record<string, string>;
  /** Message ids selected in multi-select mode, scoped to one chat. */
  selectionChatId: string | null;
  selectedMessageIds: string[];
  /** Message temporarily highlighted after a jump (search / reply / mention). */
  highlightedMessageId: string | null;

  setPresence: (userId: string, entry: PresenceEntry) => void;
  setTyping: (chatId: string, user: BasicUser, isTyping: boolean) => void;
  clearTypingForChat: (chatId: string) => void;

  setDraft: (chatId: string, draft: string) => void;
  clearDraft: (chatId: string) => void;

  startSelection: (chatId: string, messageId: string) => void;
  toggleSelection: (messageId: string) => void;
  clearSelection: () => void;

  setHighlightedMessage: (messageId: string | null) => void;
  reset: () => void;
}

export const useChatUiStore = create<ChatUiState>((set) => ({
  presence: {},
  typing: {},
  drafts: {},
  selectionChatId: null,
  selectedMessageIds: [],
  highlightedMessageId: null,

  setPresence: (userId, entry) =>
    set((state) => ({ presence: { ...state.presence, [userId]: entry } })),

  setTyping: (chatId, user, isTyping) =>
    set((state) => {
      const chatTyping = { ...(state.typing[chatId] ?? {}) };
      if (isTyping) {
        chatTyping[user.id] = user;
      } else {
        delete chatTyping[user.id];
      }
      return { typing: { ...state.typing, [chatId]: chatTyping } };
    }),

  clearTypingForChat: (chatId) => set((state) => ({ typing: { ...state.typing, [chatId]: {} } })),

  setDraft: (chatId, draft) => set((state) => ({ drafts: { ...state.drafts, [chatId]: draft } })),

  clearDraft: (chatId) =>
    set((state) => {
      const drafts = { ...state.drafts };
      delete drafts[chatId];
      return { drafts };
    }),

  startSelection: (chatId, messageId) =>
    set({ selectionChatId: chatId, selectedMessageIds: [messageId] }),

  toggleSelection: (messageId) =>
    set((state) => {
      const selected = state.selectedMessageIds.includes(messageId)
        ? state.selectedMessageIds.filter((id) => id !== messageId)
        : [...state.selectedMessageIds, messageId];
      // Deselecting the last message exits selection mode entirely.
      return selected.length === 0
        ? { selectedMessageIds: [], selectionChatId: null }
        : { selectedMessageIds: selected };
    }),

  clearSelection: () => set({ selectionChatId: null, selectedMessageIds: [] }),

  setHighlightedMessage: (messageId) => set({ highlightedMessageId: messageId }),

  reset: () =>
    set({
      presence: {},
      typing: {},
      selectionChatId: null,
      selectedMessageIds: [],
      highlightedMessageId: null,
    }),
}));

/** Presence helper that prefers live socket data over the API snapshot. */
export function resolvePresence(
  user: Pick<BasicUser, 'id' | 'isOnline' | 'lastSeen'>,
  presence: Record<string, PresenceEntry>,
): PresenceEntry {
  return presence[user.id] ?? { isOnline: user.isOnline, lastSeen: user.lastSeen };
}
