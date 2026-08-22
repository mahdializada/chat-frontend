import { apiClient } from '@/lib/api-client';
import type {
  ApiEnvelope,
  BasicUser,
  BlockState,
  CommonGroup,
  ContactProfile,
  PrivacyVisibility,
  ReportReason,
  ReportResult,
  SelfUser,
  ThemePreference,
  User,
} from '@/types/api';

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  username?: string;
  bio?: string;
  avatar?: string;
}

export interface UpdatePrivacyInput {
  profilePhotoVisibility?: PrivacyVisibility;
  lastSeenVisibility?: PrivacyVisibility;
  onlineVisibility?: PrivacyVisibility;
  aboutVisibility?: PrivacyVisibility;
  readReceiptsEnabled?: boolean;
}

export interface UpdatePreferencesInput {
  theme?: ThemePreference;
  chatWallpaper?: string;
  recentEmojis?: string[];
  recentStickers?: string[];
  notificationsEnabled?: boolean;
  soundEnabled?: boolean;
}

export const usersService = {
  async search(term: string): Promise<User[]> {
    const res = await apiClient.get<ApiEnvelope<User[]>>('/users/search', { params: { q: term } });
    return res.data.data;
  },

  async getProfile(userId: string): Promise<ContactProfile> {
    const res = await apiClient.get<ApiEnvelope<ContactProfile>>(`/users/${userId}/profile`);
    return res.data.data;
  },

  async getCommonGroups(userId: string): Promise<CommonGroup[]> {
    const res = await apiClient.get<ApiEnvelope<CommonGroup[]>>(`/users/${userId}/common-groups`);
    return res.data.data;
  },

  async updateMe(input: UpdateProfileInput): Promise<SelfUser> {
    const res = await apiClient.patch<ApiEnvelope<SelfUser>>('/users/me', input);
    return res.data.data;
  },

  async updatePrivacy(input: UpdatePrivacyInput): Promise<SelfUser> {
    const res = await apiClient.patch<ApiEnvelope<SelfUser>>('/users/me/privacy', input);
    return res.data.data;
  },

  async updatePreferences(input: UpdatePreferencesInput): Promise<SelfUser> {
    const res = await apiClient.patch<ApiEnvelope<SelfUser>>('/users/me/preferences', input);
    return res.data.data;
  },

  // ── blocking ──────────────────────────────────────────────────────────────

  async listBlocked(): Promise<BasicUser[]> {
    const res = await apiClient.get<ApiEnvelope<BasicUser[]>>('/users/blocked');
    return res.data.data;
  },

  async block(userId: string): Promise<BlockState> {
    const res = await apiClient.post<ApiEnvelope<BlockState>>(`/users/${userId}/block`);
    return res.data.data;
  },

  async unblock(userId: string): Promise<BlockState> {
    const res = await apiClient.delete<ApiEnvelope<BlockState>>(`/users/${userId}/block`);
    return res.data.data;
  },

  async report(
    userId: string,
    input: { reason: ReportReason; details?: string; chatId?: string; messageIds?: string[] },
  ): Promise<ReportResult> {
    const res = await apiClient.post<ApiEnvelope<ReportResult>>(
      `/users/${userId}/report`,
      input,
    );
    return res.data.data;
  },
};
