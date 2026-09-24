import { apiClient } from '@/lib/api-client';
import type { ApiEnvelope, Call, IceServer } from '@/types/api';

export const callsService = {
  /** Calls ringing or ongoing in any of my chats — used to restore UI after a reload. */
  async active(): Promise<Call[]> {
    const res = await apiClient.get<ApiEnvelope<Call[]>>('/calls/active');
    return res.data.data;
  },

  async iceServers(): Promise<IceServer[]> {
    const res = await apiClient.get<ApiEnvelope<IceServer[]>>('/calls/ice-servers');
    return res.data.data;
  },
};
