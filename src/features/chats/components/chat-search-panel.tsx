'use client';

import {
  Box,
  Center,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Spinner,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';
import { FiChevronDown, FiChevronUp, FiSearch, FiX } from 'react-icons/fi';
import { EmptyState } from '@/components/shared/empty-state';
import { UserAvatar } from '@/components/shared/user-avatar';
import { useMessageSearch } from '@/features/messages/hooks/use-messages';
import { useDebouncedValue } from '@/features/users/hooks/use-user-search';
import { formatFullDate, fullName, splitOnMatch } from '@/utils/format';

interface ChatSearchPanelProps {
  chatId: string;
  isOpen: boolean;
  onClose: () => void;
  /** Called with the message the user picked so the list can jump to it. */
  onSelectResult: (messageId: string) => void;
  currentUserId: string;
}

/**
 * In-conversation search. Matching is done by the database (scoped to this
 * chat) — the client never downloads the whole history to filter locally.
 */
export function ChatSearchPanel({
  chatId,
  isOpen,
  onClose,
  onSelectResult,
  currentUserId,
}: ChatSearchPanelProps) {
  const [term, setTerm] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const debouncedTerm = useDebouncedValue(term.trim(), 300);
  const results = useMessageSearch(debouncedTerm, chatId);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const bg = useColorModeValue('white', 'gray.800');
  const border = useColorModeValue('gray.200', 'whiteAlpha.200');
  const activeBg = useColorModeValue('brand.50', 'whiteAlpha.200');
  const hoverBg = useColorModeValue('gray.50', 'whiteAlpha.100');

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    } else {
      setTerm('');
      setActiveIndex(0);
    }
  }, [isOpen]);

  useEffect(() => setActiveIndex(0), [debouncedTerm]);

  if (!isOpen) return null;

  const items = results.data?.items ?? [];
  const total = results.data?.total ?? 0;

  const jumpTo = (index: number): void => {
    const item = items[index];
    if (!item) return;
    setActiveIndex(index);
    onSelectResult(item.id);
  };

  const step = (delta: number): void => {
    if (items.length === 0) return;
    const next = (activeIndex + delta + items.length) % items.length;
    jumpTo(next);
  };

  return (
    <Box
      borderBottomWidth="1px"
      borderColor={border}
      bg={bg}
      maxH="45vh"
      display="flex"
      flexDirection="column"
    >
      <HStack px={{ base: 2, md: 4 }} py={2} spacing={2}>
        <InputGroup size="sm">
          <InputLeftElement pointerEvents="none">
            <Icon as={FiSearch} color="gray.400" aria-hidden />
          </InputLeftElement>
          <Input
            ref={inputRef}
            placeholder="Search in this conversation…"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') onClose();
              if (event.key === 'Enter') step(event.shiftKey ? -1 : 1);
            }}
            borderRadius="md"
            aria-label="Search in this conversation"
          />
        </InputGroup>

        {items.length > 0 && (
          <>
            <Text fontSize="xs" color="gray.500" whiteSpace="nowrap">
              {activeIndex + 1} / {total}
            </Text>
            <IconButton
              aria-label="Previous match"
              icon={<FiChevronUp />}
              size="sm"
              variant="ghost"
              onClick={() => step(-1)}
            />
            <IconButton
              aria-label="Next match"
              icon={<FiChevronDown />}
              size="sm"
              variant="ghost"
              onClick={() => step(1)}
            />
          </>
        )}

        <IconButton
          aria-label="Close search"
          icon={<FiX />}
          size="sm"
          variant="ghost"
          onClick={onClose}
        />
      </HStack>

      <Box flex="1" overflowY="auto" px={{ base: 2, md: 4 }} pb={2}>
        {debouncedTerm.length < 2 ? (
          <Text fontSize="xs" color="gray.500" px={1} pb={2}>
            Type at least 2 characters to search this conversation.
          </Text>
        ) : results.isFetching && items.length === 0 ? (
          <Center py={6}>
            <Spinner size="sm" />
          </Center>
        ) : items.length === 0 ? (
          <EmptyState
            compact
            icon={FiSearch}
            title="No messages found"
            description="Try a different word or phrase."
          />
        ) : (
          <VStack align="stretch" spacing={0.5}>
            {items.map((item, index) => (
              <Box
                key={item.id}
                as="button"
                type="button"
                textAlign="left"
                px={2}
                py={2}
                borderRadius="md"
                bg={index === activeIndex ? activeBg : 'transparent'}
                _hover={{ bg: index === activeIndex ? activeBg : hoverBg }}
                onClick={() => jumpTo(index)}
                aria-current={index === activeIndex}
              >
                <HStack spacing={2.5} align="flex-start">
                  <UserAvatar user={item.sender} size="xs" />
                  <Box flex="1" minW={0}>
                    <HStack justify="space-between" align="baseline">
                      <Text fontSize="xs" fontWeight="semibold" noOfLines={1}>
                        {item.sender?.id === currentUserId
                          ? 'You'
                          : item.sender
                            ? fullName(item.sender)
                            : 'Unknown'}
                      </Text>
                      <Text fontSize="0.65rem" color="gray.500" flexShrink={0}>
                        {formatFullDate(item.createdAt)}
                      </Text>
                    </HStack>
                    <Text fontSize="xs" color="gray.500" noOfLines={2}>
                      {splitOnMatch(item.content ?? '', debouncedTerm).map((segment, i) => (
                        <Box
                          key={i}
                          as={segment.match ? 'mark' : 'span'}
                          bg={segment.match ? 'yellow.200' : undefined}
                          color={segment.match ? 'gray.900' : undefined}
                          borderRadius="sm"
                        >
                          {segment.text}
                        </Box>
                      ))}
                    </Text>
                  </Box>
                </HStack>
              </Box>
            ))}
          </VStack>
        )}
      </Box>
    </Box>
  );
}
