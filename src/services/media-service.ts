import { apiClient } from '@/lib/api-client';
import type {
  ApiEnvelope,
  GifPage,
  GifProviderStatus,
  LinkPreviewResult,
  Sticker,
  StickerPack,
} from '@/types/api';

export const mediaService = {
  async gifStatus(): Promise<GifProviderStatus> {
    const res = await apiClient.get<ApiEnvelope<GifProviderStatus>>('/gifs/status');
    return res.data.data;
  },

  async gifs(params: { q?: string; cursor?: string; limit?: number }): Promise<GifPage> {
    const res = await apiClient.get<ApiEnvelope<GifPage>>('/gifs', { params });
    return res.data.data;
  },

  async stickerPacks(): Promise<StickerPack[]> {
    const res = await apiClient.get<ApiEnvelope<StickerPack[]>>('/stickers/packs');
    return res.data.data;
  },

  async packStickers(packId: string): Promise<Sticker[]> {
    const res = await apiClient.get<ApiEnvelope<Sticker[]>>(`/stickers/packs/${packId}`);
    return res.data.data;
  },

  async recentStickers(): Promise<Sticker[]> {
    const res = await apiClient.get<ApiEnvelope<Sticker[]>>('/stickers/recent');
    return res.data.data;
  },

  async searchStickers(term: string): Promise<Sticker[]> {
    const res = await apiClient.get<ApiEnvelope<Sticker[]>>('/stickers/search', {
      params: { q: term },
    });
    return res.data.data;
  },

  async linkPreview(url: string): Promise<LinkPreviewResult> {
    const res = await apiClient.get<ApiEnvelope<LinkPreviewResult>>('/link-preview', {
      params: { url },
    });
    return res.data.data;
  },
};
