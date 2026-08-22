import { apiClient } from '@/lib/api-client';
import type {
  ApiEnvelope,
  AttachmentSource,
  Message,
  MessageType,
  PaginatedMessages,
  PaginatedSearchResults,
  ReceiptDetail,
  StarredMessageResult,
  SyncResult,
} from '@/types/api';

export interface AttachmentInput {
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  source?: AttachmentSource;
  thumbnailUrl?: string;
  duration?: number;
  width?: number;
  height?: number;
}

export interface SendMessageInput {
  chatId: string;
  content?: string;
  type?: Exclude<MessageType, 'SYSTEM'>;
  replyToId?: string;
  attachments?: AttachmentInput[];
  clientId?: string;
}

export const messagesService = {
  async list(
    chatId: string,
    params: { cursor?: string; around?: string; limit?: number },
  ): Promise<PaginatedMessages> {
    const res = await apiClient.get<ApiEnvelope<PaginatedMessages>>(`/chats/${chatId}/messages`, {
      params,
    });
    return res.data.data;
  },

  async send(input: SendMessageInput): Promise<Message> {
    const res = await apiClient.post<ApiEnvelope<Message>>('/messages', input);
    return res.data.data;
  },

  async edit(messageId: string, content: string): Promise<Message> {
    const res = await apiClient.patch<ApiEnvelope<Message>>(`/messages/${messageId}`, { content });
    return res.data.data;
  },

  async remove(messageId: string, forEveryone: boolean): Promise<void> {
    await apiClient.delete(`/messages/${messageId}`, { params: { forEveryone } });
  },

  async removeMany(messageIds: string[], forEveryone: boolean): Promise<{ deleted: number }> {
    const res = await apiClient.post<ApiEnvelope<{ deleted: number; failed: number }>>(
      '/messages/bulk-delete',
      { messageIds, forEveryone },
    );
    return res.data.data;
  },

  async forward(
    messageIds: string[],
    chatIds: string[],
    comment?: string,
  ): Promise<{ forwarded: number }> {
    const res = await apiClient.post<ApiEnvelope<{ forwarded: number }>>('/messages/forward', {
      messageIds,
      chatIds,
      comment: comment?.trim() || undefined,
    });
    return res.data.data;
  },

  async addReaction(messageId: string, emoji: string): Promise<void> {
    await apiClient.post(`/messages/${messageId}/reactions`, { emoji });
  },

  async removeReaction(messageId: string, emoji: string): Promise<void> {
    await apiClient.delete(`/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`);
  },

  async star(messageId: string): Promise<void> {
    await apiClient.post(`/messages/${messageId}/star`);
  },

  async unstar(messageId: string): Promise<void> {
    await apiClient.delete(`/messages/${messageId}/star`);
  },

  async starMany(messageIds: string[]): Promise<{ starred: number }> {
    const res = await apiClient.post<ApiEnvelope<{ starred: number }>>('/messages/bulk-star', {
      messageIds,
    });
    return res.data.data;
  },

  async listStarred(params: { chatId?: string; before?: string; limit?: number } = {}): Promise<
    StarredMessageResult[]
  > {
    const res = await apiClient.get<ApiEnvelope<StarredMessageResult[]>>('/messages/starred', {
      params,
    });
    return res.data.data;
  },

  async receipts(messageId: string): Promise<ReceiptDetail[]> {
    const res = await apiClient.get<ApiEnvelope<ReceiptDetail[]>>(
      `/messages/${messageId}/receipts`,
    );
    return res.data.data;
  },

  async markChatRead(chatId: string): Promise<void> {
    await apiClient.post(`/chats/${chatId}/read`);
  },

  async search(
    term: string,
    options: { chatId?: string; offset?: number; limit?: number } = {},
  ): Promise<PaginatedSearchResults> {
    const res = await apiClient.get<ApiEnvelope<PaginatedSearchResults>>('/messages/search', {
      params: { q: term, ...options },
    });
    return res.data.data;
  },

  async sync(since: string): Promise<SyncResult> {
    const res = await apiClient.get<ApiEnvelope<SyncResult>>('/messages/sync', {
      params: { since },
    });
    return res.data.data;
  },
};
