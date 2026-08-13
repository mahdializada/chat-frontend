import { apiClient } from '@/lib/api-client';
import type {
  ApiEnvelope,
  Message,
  MessageSearchResult,
  MessageType,
  PaginatedMessages,
} from '@/types/api';

export interface AttachmentInput {
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
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

  async addReaction(messageId: string, emoji: string): Promise<void> {
    await apiClient.post(`/messages/${messageId}/reactions`, { emoji });
  },

  async removeReaction(messageId: string, emoji: string): Promise<void> {
    await apiClient.delete(`/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`);
  },

  async markChatRead(chatId: string): Promise<void> {
    await apiClient.post(`/chats/${chatId}/read`);
  },

  async search(term: string): Promise<MessageSearchResult[]> {
    const res = await apiClient.get<ApiEnvelope<MessageSearchResult[]>>('/messages/search', {
      params: { q: term },
    });
    return res.data.data;
  },
};
