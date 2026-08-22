import { QueryClient } from '@tanstack/react-query';
import { messagesService } from '@/features/messages/services/messages-service';
import { useOutboxStore, type QueuedMessage } from '@/store/outbox-store';
import { updateMessageInCache, upsertMessageInCache } from './message-cache';

/** After this many failures the message is surfaced as failed instead of retried. */
export const MAX_SEND_ATTEMPTS = 5;

let flushing = false;

/**
 * Sends everything queued while the client was offline, oldest first.
 *
 * Delivery is idempotent through `clientId`: if a message actually reached the
 * server before the connection dropped, the WebSocket echo reconciles the same
 * clientId and the duplicate is replaced rather than appended.
 */
export async function flushOutbox(queryClient: QueryClient): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    for (;;) {
      const pending = useOutboxStore
        .getState()
        .queue.filter((item) => item.attempts < MAX_SEND_ATTEMPTS);
      if (pending.length === 0) break;

      const item = pending[0];
      useOutboxStore.getState().markAttempt(item.clientId);

      try {
        const message = await messagesService.send({
          chatId: item.chatId,
          content: item.content,
          type: item.type,
          replyToId: item.replyToId,
          attachments: item.attachments,
          clientId: item.clientId,
        });
        upsertMessageInCache(queryClient, { ...message, clientId: item.clientId });
        useOutboxStore.getState().remove(item.clientId);
      } catch {
        const attempts =
          useOutboxStore.getState().queue.find((q) => q.clientId === item.clientId)?.attempts ?? 0;
        if (attempts >= MAX_SEND_ATTEMPTS) {
          markQueuedAsFailed(queryClient, item);
        }
        // Stop the run: if one send failed the connection is likely still down.
        break;
      }
    }
  } finally {
    flushing = false;
  }
}

/** Flags the optimistic bubble so the UI can offer "retry" or "remove". */
function markQueuedAsFailed(queryClient: QueryClient, item: QueuedMessage): void {
  updateMessageInCache(queryClient, item.chatId, optimisticId(item.clientId), (message) => ({
    ...message,
    queued: false,
    optimistic: false,
    failed: true,
  }));
}

/** The temporary id an optimistic message carries until the server replies. */
export function optimisticId(clientId: string): string {
  return `optimistic-${clientId}`;
}
