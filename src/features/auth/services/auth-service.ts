import { apiClient } from '@/lib/api-client';
import type { ApiEnvelope, AuthResponse, SelfUser, SessionView } from '@/types/api';

export interface RegisterInput {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
}

export interface LoginInput {
  emailOrUsername: string;
  password: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export const authService = {
  async register(input: RegisterInput): Promise<AuthResponse> {
    const res = await apiClient.post<ApiEnvelope<AuthResponse>>('/auth/register', input);
    return res.data.data;
  },

  async login(input: LoginInput): Promise<AuthResponse> {
    const res = await apiClient.post<ApiEnvelope<AuthResponse>>('/auth/login', input);
    return res.data.data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  async me(): Promise<SelfUser> {
    const res = await apiClient.get<ApiEnvelope<SelfUser>>('/auth/me');
    return res.data.data;
  },

  async changePassword(input: ChangePasswordInput): Promise<void> {
    await apiClient.post('/auth/change-password', input);
  },

  // ── active sessions ───────────────────────────────────────────────────────

  async sessions(): Promise<SessionView[]> {
    const res = await apiClient.get<ApiEnvelope<SessionView[]>>('/auth/sessions');
    return res.data.data;
  },

  async revokeSession(id: string): Promise<void> {
    await apiClient.delete(`/auth/sessions/${id}`);
  },

  async revokeOtherSessions(): Promise<{ revoked: number }> {
    const res = await apiClient.delete<ApiEnvelope<{ revoked: number }>>('/auth/sessions/others');
    return res.data.data;
  },

  async revokeAllSessions(): Promise<{ revoked: number }> {
    const res = await apiClient.delete<ApiEnvelope<{ revoked: number }>>('/auth/sessions/all');
    return res.data.data;
  },
};
