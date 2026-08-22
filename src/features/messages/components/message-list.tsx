'use client';

import { Box, Button, Center, Divider, HStack, Spinner, Tag, Text } from '@chakra-ui/react';
import { Fragment, useEffect, useMemo, useRef } from 'react';
import { FiArrowDown, FiMessageCircle } from 'react-icons/fi';
import { EmptyState } from '@/components/shared/empty-state';
import { MessageListSkeleton } from '@/components/shared/skeletons';
import type { Chat, Message } from '@/types/api';
import { formatDaySeparator } from '@/utils/format';
import { MessageItem, MessageItemProps } from './message-item';

interface MessageListProps
  extends Pick<
    MessageItemProps,
    | 'onReply'
    | 'onEdit'
    | 'onDelete'
    | 'onToggleReaction'
    | 'onToggleStar'
    | 'onForward'
    | 'onSelect'
    | 'onRetry'
    | 'onJumpToMessage'
    | 'onOpenProfile'
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
  searchTerm?: string;
  /** Shown when viewing an anchored (search-result) history slice. */
  isAnchored: boolean;
  onJumpToLatest: () => void;
  selectionChatId: string | null;
  selectedMessageIds: string[];
  /** Chat background (wallpaper preset resolved by the parent). */
  background: string;
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
  searchTerm,
  isAnchored,
  onJumpToLatest,
  selectionChatId,
  selectedMessageIds,
  background,
  onReply,
  onEdit,
  onDelete,
  onToggleReaction,
  onToggleStar,
  onForward,
  onSelect,
  onRetry,
  onJumpToMessage,
  onOpenProfile,
}: MessageListProps) {
  // Collected once so the render memo below depends on stable identities
  // rather than a fresh rest-spread object on every render.
  const handlers = useMemo(
    () => ({
      onReply,
      onEdit,
      onDelete,
      onToggleReaction,
      onToggleStar,
      onForward,
      onSelect,
      onRetry,
      onJumpToMessage,
      onOpenProfile,
    }),
    [
      onReply,
      onEdit,
      onDelete,
      onToggleReaction,
      onToggleStar,
      onForward,
      onSelect,
      onRetry,
      onJumpToMessage,
      onOpenProfile,
    ],
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const topSentinelRef = useRef<HTMLDivElement | null>(null);

  const isSelectionMode = selectionChatId === chat.id;
  const selectedSet = useMemo(() => new Set(selectedMessageIds), [selectedMessageIds]);

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

  // Scroll the highlighted (search-result / reply target) message into view.
  useEffect(() => {
    if (!highlightedId) return;
    const el = containerRef.current?.querySelector(`[data-message-id="${highlightedId}"]`);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
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
            searchTerm={searchTerm}
            isSelectionMode={isSelectionMode}
            isSelected={selectedSet.has(message.id)}
            {...handlers}
          />
          {daySeparator && (
            <Center my={3}>
              <Tag
                size="sm"
                borderRadius="full"
                variant="subtle"
                colorScheme="gray"
                boxShadow="sm"
                bg="whiteAlpha.900"
                color="gray.700"
                _dark={{ bg: 'blackAlpha.600', color: 'gray.200' }}
              >
                {formatDaySeparator(message.createdAt)}
              </Tag>
            </Center>
          )}
        </Fragment>,
      );
    });
    return items;
  }, [
    messages,
    chat,
    currentUserId,
    highlightedId,
    searchTerm,
    isSelectionMode,
    selectedSet,
    handlers,
  ]);

  if (isLoading) {
    return (
      <Box flex="1" minH={0} background={background}>
        <MessageListSkeleton />
      </Box>
    );
  }

  return (
    <Box position="relative" flex="1" minH={0} background={background} backgroundAttachment="local">
      <Box
        ref={containerRef}
        h="100%"
        overflowY="auto"
        display="flex"
        flexDirection="column-reverse"
        px={{ base: 2, md: 4 }}
        py={3}
        role="log"
        aria-live="polite"
        aria-label="Conversation messages"
      >
        {/* column-reverse: first child = visual bottom */}
        {messages.length === 0 && (
          <EmptyState
            icon={FiMessageCircle}
            title="No messages yet"
            description="Send a message to start the conversation."
          />
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
        <Center position="absolute" bottom={3} left={0} right={0} pointerEvents="none">
          <Button
            size="sm"
            borderRadius="full"
            boxShadow="md"
            pointerEvents="auto"
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
