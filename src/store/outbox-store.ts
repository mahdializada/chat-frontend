import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AttachmentInput } from '@/features/messages/services/messages-service';
import type { MessageType } from '@/types/api';

export interface QueuedMessage {
  clientId: string;
  chatId: string;
  content?: string;
  type?: Exclude<MessageType, 'SYSTEM'>;
  replyToId?: string;
  attachments?: AttachmentInput[];
  createdAt: string;
  attempts: number;
}

interface OutboxState {
  /** Messages composed while offline (or whose send failed), awaiting delivery. */
  queue: QueuedMessage[];
  enqueue: (message: Omit<QueuedMessage, 'attempts'>) => void;
  remove: (clientId: string) => void;
  markAttempt: (clientId: string) => void;
  forChat: (chatId: string) => QueuedMessage[];
  clear: () => void;
}

/**
 * Survives reloads in localStorage so a message typed offline is not lost when
 * the tab is closed. Entries are removed once the server accepts them —
 * reconciliation happens on `clientId`, which is also what the server echoes
 * back on the `message:created` event.
 */
export const useOutboxStore = create<OutboxState>()(
  persist(
    (set, get) => ({
      queue: [],

      enqueue: (message) =>
        set((state) =>
          state.queue.some((item) => item.clientId === message.clientId)
            ? state
            : { queue: [...state.queue, { ...message, attempts: 0 }] },
        ),

      remove: (clientId) =>
        set((state) => ({ queue: state.queue.filter((item) => item.clientId !== clientId) })),

      markAttempt: (clientId) =>
        set((state) => ({
          queue: state.queue.map((item) =>
            item.clientId === clientId ? { ...item, attempts: item.attempts + 1 } : item,
          ),
        })),

      forChat: (chatId) => get().queue.filter((item) => item.chatId === chatId),

      clear: () => set({ queue: [] }),
    }),
    { name: 'nexachat-outbox', version: 1 },
  ),
);
