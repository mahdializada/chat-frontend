import { apiClient } from '@/lib/api-client';
import type { ApiEnvelope, UploadResult } from '@/types/api';

export const uploadsService = {
  async upload(file: File | Blob, fileName?: string): Promise<UploadResult> {
    const formData = new FormData();
    if (file instanceof File) {
      formData.append('file', file);
    } else {
      formData.append('file', file, fileName ?? 'file');
    }
    const res = await apiClient.post<ApiEnvelope<UploadResult>>('/uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },
};
