import { apiClient } from '@/lib/api-client';
import type { ApiEnvelope, Chat, MemberRole } from '@/types/api';

export interface CreateGroupInput {
  name: string;
  description?: string;
  avatar?: string;
  memberIds: string[];
}

export interface UpdateChatInput {
  name?: string;
  description?: string;
  avatar?: string;
}

export const chatsService = {
  async list(search?: string): Promise<Chat[]> {
    const res = await apiClient.get<ApiEnvelope<Chat[]>>('/chats', {
      params: search ? { search } : undefined,
    });
    return res.data.data;
  },

  async getById(chatId: string): Promise<Chat> {
    const res = await apiClient.get<ApiEnvelope<Chat>>(`/chats/${chatId}`);
    return res.data.data;
  },

  async createDirect(userId: string): Promise<Chat> {
    const res = await apiClient.post<ApiEnvelope<Chat>>('/chats/direct', { userId });
    return res.data.data;
  },

  async createGroup(input: CreateGroupInput): Promise<Chat> {
    const res = await apiClient.post<ApiEnvelope<Chat>>('/chats/group', input);
    return res.data.data;
  },

  async update(chatId: string, input: UpdateChatInput): Promise<Chat> {
    const res = await apiClient.patch<ApiEnvelope<Chat>>(`/chats/${chatId}`, input);
    return res.data.data;
  },

  async remove(chatId: string): Promise<void> {
    await apiClient.delete(`/chats/${chatId}`);
  },

  async addMembers(chatId: string, memberIds: string[]): Promise<Chat> {
    const res = await apiClient.post<ApiEnvelope<Chat>>(`/chats/${chatId}/members`, { memberIds });
    return res.data.data;
  },

  async removeMember(chatId: string, userId: string): Promise<void> {
    await apiClient.delete(`/chats/${chatId}/members/${userId}`);
  },

  async updateMemberRole(chatId: string, userId: string, role: MemberRole): Promise<Chat> {
    const res = await apiClient.patch<ApiEnvelope<Chat>>(`/chats/${chatId}/members/${userId}`, {
      role,
    });
    return res.data.data;
  },
};
