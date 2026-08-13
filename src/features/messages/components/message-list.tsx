'use client';

import { Box, Button, Center, Divider, HStack, Spinner, Tag, Text } from '@chakra-ui/react';
import { Fragment, useEffect, useMemo, useRef } from 'react';
import { FiArrowDown } from 'react-icons/fi';
import type { Chat, Message } from '@/types/api';
import { formatDaySeparator } from '@/utils/format';
import { MessageItem, MessageItemProps } from './message-item';

interface MessageListProps
  extends Pick<
    MessageItemProps,
    'onReply' | 'onEdit' | 'onDelete' | 'onToggleReaction' | 'onRetry'
  > {
  chat: Chat;
  currentUserId: string;
  /** Messages newest → oldest (as returned by the API pages, flattened). */
  messages: Message[];
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  highlightedId?: string | null;
  /** Shown when viewing an anchored (search-result) history slice. */
  isAnchored: boolean;
  onJumpToLatest: () => void;
}

/**
 * Renders messages inside a column-reverse container: scrollTop≈0 is the
 * bottom (newest). Loading older pages appends items visually at the top
 * without any scroll-position juggling.
 */
export function MessageList({
  chat,
  currentUserId,
  messages,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  highlightedId,
  isAnchored,
  onJumpToLatest,
  ...handlers
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const topSentinelRef = useRef<HTMLDivElement | null>(null);

  // Infinite scroll upwards: observe a sentinel at the (visual) top.
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    const container = containerRef.current;
    if (!sentinel || !container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { root: container, rootMargin: '200px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Scroll the highlighted (search-result) message into view once loaded.
  useEffect(() => {
    if (!highlightedId) return;
    const el = containerRef.current?.querySelector(`[data-message-id="${highlightedId}"]`);
    el?.scrollIntoView({ block: 'center' });
  }, [highlightedId, messages.length]);

  /** Grouped for day separators + sender grouping, still newest-first. */
  const rendered = useMemo(() => {
    const items: React.ReactNode[] = [];
    messages.forEach((message, index) => {
      // The next-older message (below in data, above visually).
      const older = messages[index + 1];
      const showSender =
        !older ||
        older.senderId !== message.senderId ||
        older.type === 'SYSTEM' ||
        new Date(message.createdAt).getTime() - new Date(older.createdAt).getTime() >
          5 * 60 * 1000;

      const daySeparator =
        !older ||
        new Date(older.createdAt).toDateString() !== new Date(message.createdAt).toDateString();

      items.push(
        <Fragment key={message.clientId ?? message.id}>
          <MessageItem
            message={message}
            chat={chat}
            currentUserId={currentUserId}
            showSender={showSender}
            isHighlighted={highlightedId === message.id}
            {...handlers}
          />
          {daySeparator && (
            <Center my={3}>
              <Tag size="sm" borderRadius="full" variant="subtle" colorScheme="gray">
                {formatDaySeparator(message.createdAt)}
              </Tag>
            </Center>
          )}
        </Fragment>,
      );
    });
    return items;
  }, [messages, chat, currentUserId, highlightedId, handlers]);

  if (isLoading) {
    return (
      <Center flex="1">
        <Spinner color="brand.500" />
      </Center>
    );
  }

  return (
    <Box position="relative" flex="1" minH={0}>
      <Box
        ref={containerRef}
        h="100%"
        overflowY="auto"
        display="flex"
        flexDirection="column-reverse"
        px={{ base: 2, md: 4 }}
        py={3}
      >
        {/* column-reverse: first child = visual bottom */}
        {messages.length === 0 && (
          <Center py={10}>
            <Text color="gray.500" fontSize="sm">
              No messages yet — say hi 👋
            </Text>
          </Center>
        )}
        {rendered}
        <div ref={topSentinelRef} />
        {isFetchingNextPage && (
          <Center py={3}>
            <Spinner size="sm" color="brand.500" />
          </Center>
        )}
        {!hasNextPage && messages.length > 20 && (
          <HStack my={3} px={8}>
            <Divider />
            <Text fontSize="xs" color="gray.500" whiteSpace="nowrap">
              Beginning of conversation
            </Text>
            <Divider />
          </HStack>
        )}
      </Box>

      {isAnchored && (
        <Center position="absolute" bottom={3} left={0} right={0}>
          <Button
            size="sm"
            borderRadius="full"
            boxShadow="md"
            rightIcon={<FiArrowDown />}
            onClick={onJumpToLatest}
          >
            Jump to latest
          </Button>
        </Center>
      )}
    </Box>
  );
}
