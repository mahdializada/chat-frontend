'use client';

import {
  Box,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  SimpleGrid,
  Text,
  Tooltip,
  VStack,
} from '@chakra-ui/react';
import { useMemo, useRef, useState } from 'react';
import { FiClock, FiSearch } from 'react-icons/fi';
import { EMOJI_CATEGORIES, searchEmojis } from '@/lib/emoji-data';
import { useUpdatePreferences } from '@/features/users/hooks/use-users';
import { useAuthStore } from '@/store/auth-store';

export { QUICK_REACTIONS } from '@/lib/emoji-data';

interface EmojiPickerProps {
  onPick: (emoji: string) => void;
}

const MAX_RECENT = 24;

/**
 * Full emoji picker with the standard categories, keyword search and a
 * "recently used" row persisted on the account (so it follows the user).
 */
export function EmojiPicker({ onPick }: EmojiPickerProps) {
  const recentEmojis = useAuthStore((s) => s.user?.recentEmojis ?? []);
  const updatePreferences = useUpdatePreferences();
  const [term, setTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState(EMOJI_CATEGORIES[0].id);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const searchResults = useMemo(() => (term.trim() ? searchEmojis(term) : []), [term]);

  const handlePick = (emoji: string): void => {
    onPick(emoji);
    const next = [emoji, ...recentEmojis.filter((e) => e !== emoji)].slice(0, MAX_RECENT);
    // Fire-and-forget: a failed preference save must never block sending.
    updatePreferences.mutate({ recentEmojis: next });
  };

  const scrollToCategory = (categoryId: string): void => {
    setActiveCategory(categoryId);
    const target = scrollRef.current?.querySelector(`[data-category="${categoryId}"]`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <VStack align="stretch" spacing={2} w="100%">
      <InputGroup size="sm">
        <InputLeftElement pointerEvents="none">
          <Icon as={FiSearch} color="gray.400" aria-hidden />
        </InputLeftElement>
        <Input
          placeholder="Search emoji"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          borderRadius="md"
          aria-label="Search emoji"
        />
      </InputGroup>

      {!term && (
        <HStack spacing={0.5} overflowX="auto" pb={1} role="tablist" aria-label="Emoji categories">
          {recentEmojis.length > 0 && (
            <Tooltip label="Recently used">
              <Box
                as="button"
                type="button"
                role="tab"
                aria-selected={activeCategory === 'recent'}
                aria-label="Recently used"
                px={2}
                py={1}
                borderRadius="md"
                bg={activeCategory === 'recent' ? 'blackAlpha.100' : 'transparent'}
                _dark={{ bg: activeCategory === 'recent' ? 'whiteAlpha.200' : 'transparent' }}
                onClick={() => scrollToCategory('recent')}
              >
                <Icon as={FiClock} boxSize={4} aria-hidden />
              </Box>
            </Tooltip>
          )}
          {EMOJI_CATEGORIES.map((category) => (
            <Tooltip key={category.id} label={category.label}>
              <Box
                as="button"
                type="button"
                role="tab"
                aria-selected={activeCategory === category.id}
                aria-label={category.label}
                fontSize="lg"
                px={1.5}
                py={0.5}
                borderRadius="md"
                bg={activeCategory === category.id ? 'blackAlpha.100' : 'transparent'}
                _dark={{ bg: activeCategory === category.id ? 'whiteAlpha.200' : 'transparent' }}
                onClick={() => scrollToCategory(category.id)}
              >
                {category.icon}
              </Box>
            </Tooltip>
          ))}
        </HStack>
      )}

      <Box ref={scrollRef} maxH="240px" overflowY="auto" pr={1}>
        {term ? (
          searchResults.length > 0 ? (
            <EmojiGrid emojis={searchResults} onPick={handlePick} />
          ) : (
            <Text fontSize="sm" color="gray.500" textAlign="center" py={6}>
              No emoji found
            </Text>
          )
        ) : (
          <>
            {recentEmojis.length > 0 && (
              <Box data-category="recent" mb={2}>
                <CategoryLabel>Recently used</CategoryLabel>
                <EmojiGrid emojis={recentEmojis} onPick={handlePick} />
              </Box>
            )}
            {EMOJI_CATEGORIES.map((category) => (
              <Box key={category.id} data-category={category.id} mb={2}>
                <CategoryLabel>{category.label}</CategoryLabel>
                <EmojiGrid emojis={category.emojis} onPick={handlePick} />
              </Box>
            ))}
          </>
        )}
      </Box>
    </VStack>
  );
}

function CategoryLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      fontSize="0.65rem"
      fontWeight="bold"
      color="gray.500"
      textTransform="uppercase"
      mb={1}
      position="sticky"
      top={0}
      bg="chakra-body-bg"
      zIndex={1}
      py={0.5}
    >
      {children}
    </Text>
  );
}

function EmojiGrid({ emojis, onPick }: { emojis: string[]; onPick: (emoji: string) => void }) {
  return (
    <SimpleGrid columns={8} spacing={0.5}>
      {emojis.map((emoji, index) => (
        <Box
          key={`${emoji}-${index}`}
          as="button"
          type="button"
          fontSize="xl"
          lineHeight="1.6"
          borderRadius="md"
          aria-label={`Emoji ${emoji}`}
          _hover={{ bg: 'blackAlpha.100', transform: 'scale(1.15)' }}
          _dark={{ _hover: { bg: 'whiteAlpha.200' } }}
          _focusVisible={{ outline: '2px solid', outlineColor: 'brand.400' }}
          transition="transform 0.1s"
          onClick={() => onPick(emoji)}
        >
          {emoji}
        </Box>
      ))}
    </SimpleGrid>
  );
}
