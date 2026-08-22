'use client';

import {
  Box,
  Center,
  Icon,
  Image,
  Input,
  InputGroup,
  InputLeftElement,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useState } from 'react';
import { FiSearch, FiSlash } from 'react-icons/fi';
import { useDebouncedValue } from '@/features/users/hooks/use-user-search';
import { useGifs, useGifStatus } from '@/services/media-hooks';
import type { GifItem } from '@/types/api';

interface GifPickerProps {
  onPick: (gif: GifItem) => void;
}

/**
 * GIF search backed by whichever provider the operator configured. When no
 * provider is set up the picker explains that instead of failing silently —
 * this is the one place where an external service is genuinely required.
 */
export function GifPicker({ onPick }: GifPickerProps) {
  const status = useGifStatus();
  const [term, setTerm] = useState('');
  const debouncedTerm = useDebouncedValue(term.trim(), 350);
  const gifs = useGifs(debouncedTerm, status.data?.enabled === true);

  if (status.isLoading) {
    return (
      <Center py={10}>
        <Spinner size="sm" />
      </Center>
    );
  }

  if (!status.data?.enabled) {
    return (
      <VStack spacing={2} py={8} px={4} textAlign="center">
        <Icon as={FiSlash} boxSize={6} color="gray.400" aria-hidden />
        <Text fontSize="sm" fontWeight="semibold">
          GIFs are not configured
        </Text>
        <Text fontSize="xs" color="gray.500">
          Set <code>GIF_PROVIDER</code> and <code>GIF_API_KEY</code> on the server to enable GIF
          search. Stickers and emoji work without any external provider.
        </Text>
      </VStack>
    );
  }

  return (
    <VStack align="stretch" spacing={2} w="100%">
      <InputGroup size="sm">
        <InputLeftElement pointerEvents="none">
          <Icon as={FiSearch} color="gray.400" aria-hidden />
        </InputLeftElement>
        <Input
          placeholder="Search GIFs"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          borderRadius="md"
          aria-label="Search GIFs"
        />
      </InputGroup>

      <Box maxH="260px" overflowY="auto">
        {gifs.isFetching && !gifs.data ? (
          <Center py={8}>
            <Spinner size="sm" />
          </Center>
        ) : gifs.data && gifs.data.items.length === 0 ? (
          <Text fontSize="sm" color="gray.500" textAlign="center" py={8}>
            No GIFs found
          </Text>
        ) : (
          <SimpleGrid columns={2} spacing={1.5}>
            {gifs.data?.items.map((gif) => (
              <Box
                key={gif.id}
                as="button"
                type="button"
                borderRadius="md"
                overflow="hidden"
                bg="blackAlpha.100"
                _dark={{ bg: 'whiteAlpha.100' }}
                _focusVisible={{ outline: '2px solid', outlineColor: 'brand.400' }}
                onClick={() => onPick(gif)}
                aria-label={gif.title}
              >
                <Image
                  src={gif.previewUrl}
                  alt={gif.title}
                  w="100%"
                  loading="lazy"
                  fallback={<Box w="100%" h="90px" />}
                />
              </Box>
            ))}
          </SimpleGrid>
        )}
      </Box>

      <Text fontSize="0.6rem" color="gray.500" textAlign="center">
        Powered by {status.data.provider}
      </Text>
    </VStack>
  );
}
