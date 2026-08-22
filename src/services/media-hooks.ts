'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { mediaService } from './media-service';

export function useGifStatus() {
  return useQuery({
    queryKey: queryKeys.gifStatus,
    queryFn: () => mediaService.gifStatus(),
    staleTime: Infinity,
  });
}

export function useGifs(term: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.gifs(term),
    queryFn: () => mediaService.gifs({ q: term || undefined, limit: 24 }),
    enabled,
    staleTime: 60_000,
  });
}

export function useStickerPacks(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.stickerPacks,
    queryFn: () => mediaService.stickerPacks(),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function usePackStickers(packId: string | null) {
  return useQuery({
    queryKey: queryKeys.stickerPack(packId ?? 'none'),
    queryFn: () => mediaService.packStickers(packId as string),
    enabled: !!packId,
    staleTime: 5 * 60_000,
  });
}

export function useRecentStickers(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.recentStickers,
    queryFn: () => mediaService.recentStickers(),
    enabled,
  });
}
