import { apiClient } from '@/lib/api-client';
import type { ApiEnvelope, UploadResult } from '@/types/api';

export const uploadsService = {
  async upload(
    file: File | Blob,
    fileName?: string,
    /** Called with 0–100 as the upload progresses. */
    onProgress?: (percent: number) => void,
  ): Promise<UploadResult> {
    const formData = new FormData();
    if (file instanceof File) {
      formData.append('file', file);
    } else {
      formData.append('file', file, fileName ?? 'file');
    }
    const res = await apiClient.post<ApiEnvelope<UploadResult>>('/uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (!onProgress || !event.total) return;
        onProgress(Math.min(100, Math.round((event.loaded * 100) / event.total)));
      },
    });
    return res.data.data;
  },
};
