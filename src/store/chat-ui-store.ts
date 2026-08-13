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
  setPresence: (userId: string, entry: PresenceEntry) => void;
  setTyping: (chatId: string, user: BasicUser, isTyping: boolean) => void;
  clearTypingForChat: (chatId: string) => void;
  reset: () => void;
}

export const useChatUiStore = create<ChatUiState>((set) => ({
  presence: {},
  typing: {},
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
  clearTypingForChat: (chatId) =>
    set((state) => ({ typing: { ...state.typing, [chatId]: {} } })),
  reset: () => set({ presence: {}, typing: {} }),
}));

/** Presence helper that prefers live socket data over the API snapshot. */
export function resolvePresence(
  user: Pick<BasicUser, 'id' | 'isOnline' | 'lastSeen'>,
  presence: Record<string, PresenceEntry>,
): PresenceEntry {
  return presence[user.id] ?? { isOnline: user.isOnline, lastSeen: user.lastSeen };
}
