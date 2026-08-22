import { apiClient } from '@/lib/api-client';
import type {
  ApiEnvelope,
  Chat,
  ChatSettings,
  GroupInvite,
  InvitePreview,
  MediaCategory,
  MemberRole,
  PaginatedSharedMedia,
  SharedMediaCounts,
} from '@/types/api';

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
  membersCanSend?: boolean;
  membersCanEditInfo?: boolean;
  membersCanMentionAll?: boolean;
}

export interface ChatSettingsInput {
  isPinned?: boolean;
  isArchived?: boolean;
  isUnread?: boolean;
  wallpaper?: string | null;
}

export type MuteDuration = '8h' | '1w' | 'forever';

export interface SharedMediaQuery {
  category: MediaCategory;
  search?: string;
  senderId?: string;
  before?: string;
  sort?: 'newest' | 'oldest';
  limit?: number;
}

export const chatsService = {
  async list(params?: { search?: string; archived?: boolean }): Promise<Chat[]> {
    const res = await apiClient.get<ApiEnvelope<Chat[]>>('/chats', { params });
    return res.data.data;
  },

  async archivedSummary(): Promise<{ count: number; unreadCount: number }> {
    const res =
      await apiClient.get<ApiEnvelope<{ count: number; unreadCount: number }>>(
        '/chats/archived/summary',
      );
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

  // ── members ───────────────────────────────────────────────────────────────

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

  async transferOwnership(chatId: string, userId: string): Promise<Chat> {
    const res = await apiClient.post<ApiEnvelope<Chat>>(`/chats/${chatId}/transfer-ownership`, {
      userId,
    });
    return res.data.data;
  },

  // ── per-user settings ─────────────────────────────────────────────────────

  async updateSettings(chatId: string, input: ChatSettingsInput): Promise<ChatSettings> {
    const res = await apiClient.patch<ApiEnvelope<ChatSettings>>(
      `/chats/${chatId}/settings`,
      input,
    );
    return res.data.data;
  },

  async setMute(
    chatId: string,
    duration?: MuteDuration,
    muteExceptMentions?: boolean,
  ): Promise<ChatSettings> {
    const res = await apiClient.put<ApiEnvelope<ChatSettings>>(`/chats/${chatId}/mute`, {
      duration,
      muteExceptMentions,
    });
    return res.data.data;
  },

  async saveDraft(chatId: string, content: string): Promise<void> {
    await apiClient.put(`/chats/${chatId}/draft`, { content });
  },

  async clear(chatId: string): Promise<ChatSettings> {
    const res = await apiClient.post<ApiEnvelope<ChatSettings>>(`/chats/${chatId}/clear`);
    return res.data.data;
  },

  // ── shared media ──────────────────────────────────────────────────────────

  async mediaCounts(chatId: string): Promise<SharedMediaCounts> {
    const res = await apiClient.get<ApiEnvelope<SharedMediaCounts>>(
      `/chats/${chatId}/media/counts`,
    );
    return res.data.data;
  },

  async media(chatId: string, query: SharedMediaQuery): Promise<PaginatedSharedMedia> {
    const res = await apiClient.get<ApiEnvelope<PaginatedSharedMedia>>(`/chats/${chatId}/media`, {
      params: query,
    });
    return res.data.data;
  },

  // ── invites ───────────────────────────────────────────────────────────────

  async getInvite(chatId: string): Promise<GroupInvite | null> {
    const res = await apiClient.get<ApiEnvelope<GroupInvite | null>>(`/chats/${chatId}/invite`);
    return res.data.data;
  },

  async createInvite(chatId: string): Promise<GroupInvite> {
    const res = await apiClient.post<ApiEnvelope<GroupInvite>>(`/chats/${chatId}/invite`);
    return res.data.data;
  },

  async regenerateInvite(chatId: string): Promise<GroupInvite> {
    const res = await apiClient.put<ApiEnvelope<GroupInvite>>(`/chats/${chatId}/invite`);
    return res.data.data;
  },

  async revokeInvite(chatId: string): Promise<void> {
    await apiClient.delete(`/chats/${chatId}/invite`);
  },

  /** Downloads a transcript of the conversation as a file. */
  async exportChat(chatId: string, format: 'txt' | 'json' = 'txt'): Promise<void> {
    const res = await apiClient.get<Blob>(`/chats/${chatId}/export`, {
      params: { format },
      responseType: 'blob',
    });

    const disposition = String(res.headers['content-disposition'] ?? '');
    const fileName =
      /filename="?([^"]+)"?/.exec(disposition)?.[1] ?? `nexachat-export.${format}`;

    const url = URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Revoke on the next tick so the download has started.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  async previewInvite(token: string): Promise<InvitePreview> {
    const res = await apiClient.get<ApiEnvelope<InvitePreview>>(`/chats/invites/${token}`);
    return res.data.data;
  },

  async joinByInvite(token: string): Promise<Chat> {
    const res = await apiClient.post<ApiEnvelope<Chat>>('/chats/invites/join', { token });
    return res.data.data;
  },
};
