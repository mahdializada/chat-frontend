import { apiClient } from '@/lib/api-client';
import type { ApiEnvelope, AuthResponse, User } from '@/types/api';

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

  async me(): Promise<User> {
    const res = await apiClient.get<ApiEnvelope<User>>('/auth/me');
    return res.data.data;
  },

  async changePassword(input: ChangePasswordInput): Promise<void> {
    await apiClient.post('/auth/change-password', input);
  },
};
