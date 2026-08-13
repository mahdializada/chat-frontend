import { apiClient } from '@/lib/api-client';
import type { ApiEnvelope, AppNotification, PaginatedNotifications } from '@/types/api';

export const notificationsService = {
  async list(): Promise<PaginatedNotifications> {
    const res = await apiClient.get<ApiEnvelope<PaginatedNotifications>>('/notifications');
    return res.data.data;
  },

  async markRead(id: string): Promise<AppNotification> {
    const res = await apiClient.patch<ApiEnvelope<AppNotification>>(`/notifications/${id}/read`);
    return res.data.data;
  },

  async markAllRead(): Promise<void> {
    await apiClient.patch('/notifications/read-all');
  },
};
