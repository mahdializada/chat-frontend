'use client';

import {
  Badge,
  Box,
  Center,
  Divider,
  HStack,
  IconButton,
  Spinner,
  Tag,
  Text,
  VisuallyHidden,
} from '@chakra-ui/react';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiAlertCircle, FiArrowDown, FiMessageCircle } from 'react-icons/fi';
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
    | 'onRemoveFailed'
    | 'onJumpToMessage'
    | 'onOpenProfile'
  > {
  chat: Chat;
  currentUserId: string;
  /** Messages newest → oldest (as returned by the API pages, flattened). */
  messages: Message[];
  isLoading: boolean;
  isError: boolean;
  onRetryLoad: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  highlightedId?: string | null;
  searchTerm?: string;
  /** Shown when viewing an anchored (search-result) history slice. */
  isAnchored: boolean;
  onJumpToLatest: () => void;
  /** Unread messages when the chat was opened — places the "unread" divider. */
  unreadCount?: number;
  selectionChatId: string | null;
  selectedMessageIds: string[];
  /** Chat background (wallpaper preset resolved by the parent). */
  background: string;
}

const GROUP_GAP_MS = 5 * 60 * 1000;
/** Distance from the bottom (px) after which the jump button appears. */
const SCROLLED_UP_THRESHOLD = 240;

function inSameRun(a: Message, b: Message): boolean {
  return (
    a.senderId === b.senderId &&
    a.type !== 'SYSTEM' &&
    b.type !== 'SYSTEM' &&
    Math.abs(new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) <= GROUP_GAP_MS
  );
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
  isError,
  onRetryLoad,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  highlightedId,
  searchTerm,
  isAnchored,
  onJumpToLatest,
  unreadCount = 0,
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
  onRemoveFailed,
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
      onRemoveFailed,
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
      onRemoveFailed,
      onJumpToMessage,
      onOpenProfile,
    ],
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const topSentinelRef = useRef<HTMLDivElement | null>(null);

  const isSelectionMode = selectionChatId === chat.id;
  const selectedSet = useMemo(() => new Set(selectedMessageIds), [selectedMessageIds]);

  // ── scroll position, "new messages" counter ─────────────────────────────
  const [distanceFromBottom, setDistanceFromBottom] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const isAtBottom = distanceFromBottom < 80;
  const isAtBottomRef = useRef(true);
  isAtBottomRef.current = isAtBottom;
  const newestIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // column-reverse: scrollTop is 0 at the bottom and grows negative upwards.
    const onScroll = (): void => setDistanceFromBottom(Math.abs(container.scrollTop));
    onScroll();
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [isLoading, isError]);

  // Switching chats resets the counter and the "seen newest" marker.
  useEffect(() => {
    newestIdRef.current = undefined;
    setNewCount(0);
  }, [chat.id]);

  useEffect(() => {
    const newest = messages[0];
    const newestId = newest?.id ?? null;
    if (newestIdRef.current === undefined) {
      newestIdRef.current = newestId;
      return;
    }
    if (newestId === newestIdRef.current) return;
    newestIdRef.current = newestId;
    if (!newest) return;
    if (newest.senderId === currentUserId) {
      // Sending a message always brings the user back to the bottom.
      containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (!isAtBottomRef.current) {
      setNewCount((count) => count + 1);
    }
  }, [messages, currentUserId]);

  useEffect(() => {
    if (isAtBottom) setNewCount(0);
  }, [isAtBottom]);

  const scrollToBottom = useCallback(() => {
    if (isAnchored) {
      onJumpToLatest();
      return;
    }
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isAnchored, onJumpToLatest]);

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
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, isLoading, isError]);

  // Scroll the highlighted (search-result / reply target) message into view.
  useEffect(() => {
    if (!highlightedId) return;
    const el = containerRef.current?.querySelector(`[data-message-id="${highlightedId}"]`);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [highlightedId, messages.length]);

  // Opening a chat with unread messages starts at the divider, like WhatsApp.
  useEffect(() => {
    if (isLoading || unreadCount === 0) return;
    const divider = containerRef.current?.querySelector('[data-unread-divider]');
    divider?.scrollIntoView({ block: 'center' });
  }, [chat.id, isLoading, unreadCount]);

  /** Grouped for day separators + sender runs, still newest-first. */
  const rendered = useMemo(() => {
    const items: React.ReactNode[] = [];
    // The server's unread count only covers other people's messages, so the
    // divider goes above the Nth incoming message, skipping the user's own.
    let incomingSeen = 0;
    messages.forEach((message, index) => {
      // Data order is newest-first: `older` sits above visually, `newer` below.
      const older = messages[index + 1];
      const newer = messages[index - 1];
      const sameDayAsOlder =
        !!older &&
        new Date(older.createdAt).toDateString() === new Date(message.createdAt).toDateString();
      const isFirstInGroup = !older || !sameDayAsOlder || !inSameRun(message, older);
      const isLastInGroup = !newer || !inSameRun(message, newer);
      const daySeparator = !older || !sameDayAsOlder;
      if (message.senderId !== currentUserId) incomingSeen += 1;
      const unreadDivider =
        unreadCount > 0 && message.senderId !== currentUserId && incomingSeen === unreadCount;

      items.push(
        <Fragment key={message.clientId ?? message.id}>
          <MessageItem
            message={message}
            chat={chat}
            currentUserId={currentUserId}
            isFirstInGroup={isFirstInGroup}
            isLastInGroup={isLastInGroup}
            isHighlighted={highlightedId === message.id}
            searchTerm={searchTerm}
            isSelectionMode={isSelectionMode}
            isSelected={selectedSet.has(message.id)}
            {...handlers}
          />
          {unreadDivider && (
            <HStack my={3} px={4} data-unread-divider spacing={3}>
              <Divider borderColor="brand.400" />
              <Text fontSize="xs" fontWeight="semibold" color="brand.400" whiteSpace="nowrap">
                {unreadCount} unread message{unreadCount === 1 ? '' : 's'}
              </Text>
              <Divider borderColor="brand.400" />
            </HStack>
          )}
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
    unreadCount,
  ]);

  if (isLoading) {
    return (
      <Box flex="1" minH={0} background={background}>
        <MessageListSkeleton />
      </Box>
    );
  }

  if (isError && messages.length === 0) {
    return (
      <Center flex="1" minH={0} background={background}>
        <EmptyState
          icon={FiAlertCircle}
          title="Couldn't load messages"
          description="Check your connection and try again."
          actionLabel="Retry"
          onAction={onRetryLoad}
        />
      </Center>
    );
  }

  const showJumpButton = isAnchored || distanceFromBottom > SCROLLED_UP_THRESHOLD;

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
        aria-label="Conversation messages"
      >
        {/* column-reverse: first child = visual bottom */}
        {messages.length === 0 && (
          <EmptyState
            icon={FiMessageCircle}
            title="No messages yet"
            description="Say hello — your first message starts the conversation."
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
            <Text fontSize="xs" color="text.muted" whiteSpace="nowrap">
              Beginning of conversation
            </Text>
            <Divider />
          </HStack>
        )}
      </Box>

      {/* Polite live region: only newly arrived messages are announced. */}
      <VisuallyHidden aria-live="polite">
        {newCount > 0 ? `${newCount} new message${newCount === 1 ? '' : 's'}` : ''}
      </VisuallyHidden>

      {showJumpButton && (
        <Box position="absolute" bottom={4} right={{ base: 3, md: 5 }}>
          <IconButton
            aria-label={
              isAnchored
                ? 'Jump to latest messages'
                : newCount > 0
                  ? `${newCount} new message${newCount === 1 ? '' : 's'} — scroll to bottom`
                  : 'Scroll to bottom'
            }
            icon={<FiArrowDown />}
            isRound
            size="md"
            bg="bg.surface"
            color="brand.500"
            boxShadow="float"
            borderWidth="1px"
            borderColor="border.subtle"
            _hover={{ bg: 'bg.hover' }}
            onClick={scrollToBottom}
          />
          {newCount > 0 && (
            <Badge
              position="absolute"
              top="-6px"
              right="-4px"
              colorScheme="brand"
              variant="solid"
              borderRadius="full"
              fontSize="0.65rem"
              px={1.5}
              pointerEvents="none"
            >
              {newCount > 99 ? '99+' : newCount}
            </Badge>
          )}
        </Box>
      )}
    </Box>
  );
}
