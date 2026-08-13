import { apiClient } from '@/lib/api-client';
import type { ApiEnvelope, User } from '@/types/api';

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  username?: string;
  bio?: string;
  avatar?: string;
}

export const usersService = {
  async search(term: string): Promise<User[]> {
    const res = await apiClient.get<ApiEnvelope<User[]>>('/users/search', {
      params: { q: term },
    });
    return res.data.data;
  },

  async updateMe(input: UpdateProfileInput): Promise<User> {
    const res = await apiClient.patch<ApiEnvelope<User>>('/users/me', input);
    return res.data.data;
  },
};
