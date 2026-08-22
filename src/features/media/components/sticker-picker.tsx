'use client';

import {
  Box,
  Center,
  HStack,
  Image,
  SimpleGrid,
  Spinner,
  Text,
  Tooltip,
  VStack,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { FiClock } from 'react-icons/fi';
import { Icon } from '@chakra-ui/react';
import { useUpdatePreferences } from '@/features/users/hooks/use-users';
import { absoluteUrl } from '@/lib/env';
import { usePackStickers, useRecentStickers, useStickerPacks } from '@/services/media-hooks';
import { useAuthStore } from '@/store/auth-store';
import type { Sticker } from '@/types/api';

interface StickerPickerProps {
  onPick: (sticker: Sticker) => void;
}

const RECENT_TAB = 'recent';
const MAX_RECENT = 24;

/** Sticker packs served by the configured sticker provider, plus recents. */
export function StickerPicker({ onPick }: StickerPickerProps) {
  const packs = useStickerPacks(true);
  const recentIds = useAuthStore((s) => s.user?.recentStickers ?? []);
  const recent = useRecentStickers(recentIds.length > 0);
  const updatePreferences = useUpdatePreferences();

  const [activePack, setActivePack] = useState<string | null>(null);

  useEffect(() => {
    if (activePack) return;
    if (recentIds.length > 0) setActivePack(RECENT_TAB);
    else if (packs.data?.[0]) setActivePack(packs.data[0].id);
  }, [activePack, recentIds.length, packs.data]);

  const packStickers = usePackStickers(activePack === RECENT_TAB ? null : activePack);
  const stickers = activePack === RECENT_TAB ? (recent.data ?? []) : (packStickers.data ?? []);
  const isLoading = activePack === RECENT_TAB ? recent.isLoading : packStickers.isLoading;

  const handlePick = (sticker: Sticker): void => {
    onPick(sticker);
    const next = [sticker.id, ...recentIds.filter((id) => id !== sticker.id)].slice(0, MAX_RECENT);
    updatePreferences.mutate({ recentStickers: next });
  };

  if (packs.isLoading) {
    return (
      <Center py={10}>
        <Spinner size="sm" />
      </Center>
    );
  }

  if ((packs.data?.length ?? 0) === 0) {
    return (
      <Text fontSize="sm" color="gray.500" textAlign="center" py={8}>
        No sticker packs installed
      </Text>
    );
  }

  return (
    <VStack align="stretch" spacing={2} w="100%">
      <HStack spacing={1} overflowX="auto" pb={1} role="tablist" aria-label="Sticker packs">
        {recentIds.length > 0 && (
          <Tooltip label="Recently used">
            <Box
              as="button"
              type="button"
              role="tab"
              aria-selected={activePack === RECENT_TAB}
              aria-label="Recently used"
              p={1.5}
              borderRadius="md"
              flexShrink={0}
              bg={activePack === RECENT_TAB ? 'blackAlpha.100' : 'transparent'}
              _dark={{ bg: activePack === RECENT_TAB ? 'whiteAlpha.200' : 'transparent' }}
              onClick={() => setActivePack(RECENT_TAB)}
            >
              <Icon as={FiClock} boxSize={4} aria-hidden />
            </Box>
          </Tooltip>
        )}
        {packs.data?.map((pack) => (
          <Tooltip key={pack.id} label={pack.name}>
            <Box
              as="button"
              type="button"
              role="tab"
              aria-selected={activePack === pack.id}
              aria-label={pack.name}
              p={1}
              borderRadius="md"
              flexShrink={0}
              bg={activePack === pack.id ? 'blackAlpha.100' : 'transparent'}
              _dark={{ bg: activePack === pack.id ? 'whiteAlpha.200' : 'transparent' }}
              onClick={() => setActivePack(pack.id)}
            >
              <Image
                src={absoluteUrl(pack.coverUrl)}
                alt=""
                boxSize="26px"
                objectFit="contain"
                loading="lazy"
              />
            </Box>
          </Tooltip>
        ))}
      </HStack>

      <Box maxH="240px" overflowY="auto">
        {isLoading ? (
          <Center py={8}>
            <Spinner size="sm" />
          </Center>
        ) : stickers.length === 0 ? (
          <Text fontSize="sm" color="gray.500" textAlign="center" py={8}>
            No stickers here yet
          </Text>
        ) : (
          <SimpleGrid columns={4} spacing={1.5}>
            {stickers.map((sticker) => (
              <Box
                key={sticker.id}
                as="button"
                type="button"
                p={1}
                borderRadius="md"
                _hover={{ bg: 'blackAlpha.100', transform: 'scale(1.06)' }}
                _dark={{ _hover: { bg: 'whiteAlpha.200' } }}
                _focusVisible={{ outline: '2px solid', outlineColor: 'brand.400' }}
                transition="transform 0.1s"
                onClick={() => handlePick(sticker)}
                aria-label={sticker.emoji ? `Sticker ${sticker.emoji}` : 'Sticker'}
              >
                <Image
                  src={absoluteUrl(sticker.url)}
                  alt={sticker.emoji ?? 'Sticker'}
                  w="100%"
                  loading="lazy"
                />
              </Box>
            ))}
          </SimpleGrid>
        )}
      </Box>
    </VStack>
  );
}
