'use client';

import {
  Box,
  Center,
  Checkbox,
  HStack,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Tag,
  Text,
  Tooltip,
  useDisclosure,
  Wrap,
  WrapItem,
} from '@chakra-ui/react';
import { Fragment, memo, useMemo, useState } from 'react';
import {
  FiCheckSquare,
  FiCopy,
  FiCornerUpLeft,
  FiCornerUpRight,
  FiEdit2,
  FiInfo,
  FiMoreHorizontal,
  FiSmile,
  FiStar,
  FiTrash2,
} from 'react-icons/fi';
import { UserAvatar } from '@/components/shared/user-avatar';
import { useLongPress } from '@/hooks/use-long-press';
import {
  formatFullDate,
  formatMessageTime,
  fullName,
  mentionsUser,
  messagePreview,
} from '@/utils/format';
import type { Chat, Message } from '@/types/api';
import { EmojiPicker, QUICK_REACTIONS } from './emoji-picker';
import { AttachmentView } from './attachment-view';
import { LinkPreviewCard } from './link-preview-card';
import { MessageActionSheet, SheetAction } from './message-action-sheet';
import { MessageStatus } from './message-status';
import { MessageText } from './message-text';
import { ReactionDetails } from './reaction-details';
import { ReadByDialog } from './read-by-dialog';

export interface MessageItemProps {
  message: Message;
  chat: Chat;
  currentUserId: string;
  /** First message of a run from the same sender — shows the name in groups. */
  isFirstInGroup: boolean;
  /** Last message of that run — gets the bubble tail and, in groups, the avatar. */
  isLastInGroup: boolean;
  isHighlighted?: boolean;
  /** Term highlighted inside the bubble during in-conversation search. */
  searchTerm?: string;
  isSelectionMode: boolean;
  isSelected: boolean;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDelete: (message: Message, forEveryone: boolean) => void;
  onToggleReaction: (message: Message, emoji: string) => void;
  onToggleStar: (message: Message) => void;
  onForward: (message: Message) => void;
  onSelect: (message: Message) => void;
  onRetry?: (message: Message) => void;
  onRemoveFailed?: (message: Message) => void;
  onJumpToMessage?: (messageId: string) => void;
  onOpenProfile?: (userId: string) => void;
}

// Hover affordances only exist with a mouse; touch devices long-press instead.
const HOVER_ONLY = { '@media (hover: none)': { display: 'none' } };
const TOUCH_BUBBLE = {
  '@media (hover: none)': {
    WebkitTouchCallout: 'none',
    WebkitUserSelect: 'none',
    userSelect: 'none',
  },
};

export const MessageItem = memo(function MessageItem({
  message,
  chat,
  currentUserId,
  isFirstInGroup,
  isLastInGroup,
  isHighlighted = false,
  searchTerm,
  isSelectionMode,
  isSelected,
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
}: MessageItemProps) {
  const isOwn = message.senderId === currentUserId;
  const isDeleted = !!message.deletedAt;
  const isGroup = chat.type === 'GROUP';
  const isPending = !!message.optimistic || !!message.queued;

  const reactionDetails = useDisclosure();
  const readBy = useDisclosure();
  const actionSheet = useDisclosure();
  const [copied, setCopied] = useState(false);

  const myRole = chat.members.find((m) => m.userId === currentUserId)?.role ?? 'MEMBER';
  const isModerator = isGroup && (myRole === 'OWNER' || myRole === 'ADMIN');
  const isMentioningMe = !isOwn && mentionsUser(message, currentUserId);
  const canAct = !isDeleted && !isPending && !isSelectionMode;

  const longPress = useLongPress(actionSheet.onOpen, { enabled: canAct });

  // Group reactions by emoji for the pill row.
  const reactionGroups = useMemo(() => {
    const groups = new Map<string, { count: number; mine: boolean; names: string[] }>();
    for (const reaction of message.reactions) {
      const group = groups.get(reaction.emoji) ?? { count: 0, mine: false, names: [] };
      group.count += 1;
      group.names.push(reaction.userId === currentUserId ? 'You' : fullName(reaction.user));
      if (reaction.userId === currentUserId) group.mine = true;
      groups.set(reaction.emoji, group);
    }
    return groups;
  }, [message.reactions, currentUserId]);

  const copyText = async (): Promise<void> => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied; the menu simply does nothing.
    }
  };

  // One list drives the desktop "more" menu and the touch action sheet.
  const actions: SheetAction[] = [
    { key: 'reply', label: 'Reply', icon: FiCornerUpLeft, group: 'primary', onClick: () => onReply(message) },
    ...(message.content
      ? [{ key: 'copy', label: copied ? 'Copied' : 'Copy', icon: FiCopy, group: 'primary' as const, onClick: () => void copyText() }]
      : []),
    { key: 'forward', label: 'Forward', icon: FiCornerUpRight, group: 'primary', onClick: () => onForward(message) },
    { key: 'star', label: message.isStarred ? 'Unstar' : 'Star', icon: FiStar, group: 'primary', onClick: () => onToggleStar(message) },
    { key: 'select', label: 'Select', icon: FiCheckSquare, group: 'primary', onClick: () => onSelect(message) },
    ...(isOwn && isGroup
      ? [{ key: 'info', label: 'Message info', icon: FiInfo, group: 'primary' as const, onClick: readBy.onOpen }]
      : []),
    ...(isOwn && message.type === 'TEXT'
      ? [{ key: 'edit', label: 'Edit', icon: FiEdit2, group: 'edit' as const, onClick: () => onEdit(message) }]
      : []),
    { key: 'delete-me', label: 'Delete for me', icon: FiTrash2, group: 'danger', onClick: () => onDelete(message, false) },
    ...(isOwn || isModerator
      ? [{ key: 'delete-all', label: 'Delete for everyone', icon: FiTrash2, group: 'danger' as const, isDestructive: true, onClick: () => onDelete(message, true) }]
      : []),
  ];

  if (message.type === 'SYSTEM') {
    return (
      <Center my={2} data-message-id={message.id}>
        <Tag size="sm" borderRadius="full" variant="subtle" colorScheme="gray" px={3} textAlign="center">
          {message.content}
        </Tag>
      </Center>
    );
  }

  // Sticker/GIF bubbles are transparent so the artwork sits on the wallpaper.
  const isBareMedia =
    (message.type === 'STICKER' || message.type === 'GIF') && !message.content && !isDeleted;

  const handleBodyClick = (): void => {
    if (isSelectionMode) onSelect(message);
  };

  const bubbleBg = isBareMedia
    ? 'transparent'
    : isOwn
      ? 'bubble.own'
      : isMentioningMe
        ? 'yellow.50'
        : 'bubble.other';

  return (
    <>
      <HStack
        align="flex-end"
        justify={isOwn ? 'flex-end' : 'flex-start'}
        spacing={2}
        mt={isFirstInGroup ? 2.5 : 0.5}
        px={1}
        py={isSelectionMode ? 1 : 0}
        role="group"
        data-message-id={message.id}
        bg={isSelected ? 'bg.active' : 'transparent'}
        borderRadius={isSelected ? 'md' : undefined}
        cursor={isSelectionMode ? 'pointer' : undefined}
        onClick={handleBodyClick}
        transition="background 0.15s"
      >
        {isSelectionMode && (
          <Checkbox
            isChecked={isSelected}
            pointerEvents="none"
            aria-label={`Select message from ${message.sender ? fullName(message.sender) : 'unknown'}`}
            flexShrink={0}
          />
        )}

        {/* Avatars only in groups — in a direct chat the sender is obvious. */}
        {!isOwn && isGroup && (
          <Box w="28px" flexShrink={0}>
            {isLastInGroup && (
              <UserAvatar
                user={message.sender}
                size="xs"
                onClick={
                  onOpenProfile && message.senderId
                    ? () => onOpenProfile(message.senderId as string)
                    : undefined
                }
              />
            )}
          </Box>
        )}

        <Box maxW={{ base: '85%', md: '65%' }} position="relative" minW={0}>
          {!isOwn && isFirstInGroup && isGroup && message.sender && (
            <Text
              as="button"
              type="button"
              fontSize="xs"
              fontWeight="semibold"
              color="brand.400"
              mb={0.5}
              ml={1}
              _hover={{ textDecoration: 'underline' }}
              onClick={(event) => {
                event.stopPropagation();
                if (onOpenProfile && message.senderId) onOpenProfile(message.senderId);
              }}
            >
              {fullName(message.sender)}
            </Text>
          )}

          <Box
            bg={bubbleBg}
            _dark={{
              bg: isMentioningMe && !isOwn && !isBareMedia ? 'yellow.900' : undefined,
              borderColor: isOwn ? 'transparent' : 'whiteAlpha.100',
            }}
            color={isOwn && !isBareMedia ? 'white' : undefined}
            borderRadius="2xl"
            borderBottomRightRadius={isOwn && isLastInGroup ? 'sm' : '2xl'}
            borderBottomLeftRadius={!isOwn && isLastInGroup ? 'sm' : '2xl'}
            borderWidth={isBareMedia ? 0 : '1px'}
            borderColor={isOwn ? 'transparent' : 'blackAlpha.100'}
            px={isBareMedia ? 0 : 3}
            py={isBareMedia ? 0 : 2}
            boxShadow={isHighlighted ? '0 0 0 2px var(--chakra-colors-yellow-400)' : 'bubble'}
            opacity={isPending ? 0.75 : 1}
            transition="box-shadow 0.3s"
            sx={TOUCH_BUBBLE}
            {...longPress}
          >
            {/* forwarded marker */}
            {message.isForwarded && !isDeleted && (
              <HStack spacing={1} mb={1} opacity={0.7}>
                <Icon as={FiCornerUpRight} boxSize={3} aria-hidden />
                <Text fontSize="xs" fontStyle="italic">
                  Forwarded
                </Text>
              </HStack>
            )}

            {/* reply context */}
            {message.replyTo && !isDeleted && (
              <Box
                as="button"
                type="button"
                textAlign="left"
                w="100%"
                borderLeftWidth="3px"
                borderColor={isOwn ? 'whiteAlpha.600' : 'brand.400'}
                bg={isOwn ? 'whiteAlpha.200' : 'blackAlpha.50'}
                _dark={{ bg: isOwn ? 'whiteAlpha.200' : 'whiteAlpha.100' }}
                borderRadius="md"
                px={2}
                py={1}
                mb={1.5}
                _hover={{ opacity: 0.85 }}
                onClick={(event: React.MouseEvent) => {
                  event.stopPropagation();
                  const target = message.replyTo;
                  if (target && !target.deletedAt && onJumpToMessage) {
                    onJumpToMessage(target.id);
                  }
                }}
              >
                <Text fontSize="xs" fontWeight="semibold" opacity={0.9}>
                  {message.replyTo.senderId === currentUserId
                    ? 'You'
                    : fullName(message.replyTo.sender)}
                </Text>
                <Text
                  fontSize="xs"
                  dir="auto"
                  opacity={0.8}
                  noOfLines={2}
                  fontStyle={message.replyTo.deletedAt ? 'italic' : undefined}
                >
                  {message.replyTo.deletedAt
                    ? 'Original message unavailable'
                    : (message.replyTo.content ??
                      messagePreview(message.replyTo as unknown as Message))}
                </Text>
              </Box>
            )}

            {isDeleted ? (
              <HStack spacing={1.5} opacity={0.7}>
                <Icon as={FiTrash2} boxSize={3} aria-hidden />
                <Text fontSize="sm" fontStyle="italic">
                  This message was deleted
                </Text>
              </HStack>
            ) : (
              <>
                {message.attachments.length > 0 && (
                  <Box mb={message.content ? 1.5 : 0}>
                    <AttachmentView message={message} isOwn={isOwn} />
                  </Box>
                )}
                {message.content && (
                  <MessageText
                    content={message.content}
                    chat={chat}
                    currentUserId={currentUserId}
                    highlight={searchTerm}
                    onOpenProfile={onOpenProfile}
                    isOwn={isOwn}
                  />
                )}
                {message.links.length > 0 && message.attachments.length === 0 && (
                  <LinkPreviewCard link={message.links[0]} isOwn={isOwn} />
                )}
              </>
            )}

            {/* time + edited + starred + status */}
            {!isBareMedia && (
              <HStack spacing={1} justify="flex-end" mt={0.5}>
                {message.isStarred && (
                  <Icon as={FiStar} boxSize={3} fill="currentColor" opacity={0.75} aria-label="Starred" />
                )}
                {message.editedAt && !isDeleted && (
                  <Text fontSize="0.65rem" opacity={0.7}>
                    edited
                  </Text>
                )}
                <Tooltip label={formatFullDate(message.createdAt)} openDelay={500}>
                  <Text as="span" fontSize="0.65rem" opacity={0.7} whiteSpace="nowrap">
                    {formatMessageTime(message.createdAt)}
                  </Text>
                </Tooltip>
                {isOwn && !isDeleted && (
                  <MessageStatus
                    message={message}
                    chat={chat}
                    currentUserId={currentUserId}
                    onShowInfo={isGroup ? readBy.onOpen : undefined}
                  />
                )}
              </HStack>
            )}
          </Box>

          {/* queued / failed states */}
          {message.queued && (
            <Text fontSize="xs" color="orange.400" mt={1} textAlign="right">
              Waiting for connection…
            </Text>
          )}
          {message.failed && (
            <HStack spacing={3} mt={1} justify="flex-end">
              <Text fontSize="xs" color="red.400">
                Failed to send
              </Text>
              {onRetry && (
                <Text
                  as="button"
                  type="button"
                  fontSize="xs"
                  color="brand.400"
                  fontWeight="semibold"
                  onClick={() => onRetry(message)}
                >
                  Retry
                </Text>
              )}
              {onRemoveFailed && (
                <Text
                  as="button"
                  type="button"
                  fontSize="xs"
                  color="text.muted"
                  fontWeight="semibold"
                  onClick={() => onRemoveFailed(message)}
                >
                  Delete
                </Text>
              )}
            </HStack>
          )}

          {/* reactions */}
          {reactionGroups.size > 0 && !isDeleted && (
            <Wrap spacing={1} mt={1} justify={isOwn ? 'flex-end' : 'flex-start'}>
              {Array.from(reactionGroups.entries()).map(([emoji, group]) => (
                <WrapItem key={emoji}>
                  <Tooltip label={group.names.join(', ')} fontSize="xs">
                    <Tag
                      as="button"
                      type="button"
                      size="sm"
                      borderRadius="full"
                      cursor="pointer"
                      variant={group.mine ? 'solid' : 'subtle'}
                      colorScheme={group.mine ? 'brand' : 'gray'}
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggleReaction(message, emoji);
                      }}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        reactionDetails.onOpen();
                      }}
                      aria-label={`${emoji} ${group.count} — ${group.names.join(', ')}`}
                    >
                      {emoji} {group.count > 1 ? group.count : ''}
                    </Tag>
                  </Tooltip>
                </WrapItem>
              ))}
              <WrapItem>
                <Tag
                  as="button"
                  type="button"
                  size="sm"
                  borderRadius="full"
                  variant="ghost"
                  cursor="pointer"
                  fontSize="0.65rem"
                  color="text.muted"
                  onClick={reactionDetails.onOpen}
                >
                  Details
                </Tag>
              </WrapItem>
            </Wrap>
          )}
        </Box>

        {/* hover actions (mouse only) */}
        {canAct && (
          <HStack
            spacing={0}
            opacity={0}
            _groupHover={{ opacity: 1 }}
            _focusWithin={{ opacity: 1 }}
            transition="opacity 0.15s"
            flexShrink={0}
            sx={HOVER_ONLY}
          >
            <Popover placement="top" isLazy>
              <PopoverTrigger>
                <IconButton aria-label="Add reaction" icon={<FiSmile />} size="xs" variant="ghost" />
              </PopoverTrigger>
              <PopoverContent w="320px">
                <PopoverBody p={2}>
                  <HStack spacing={0.5} mb={2}>
                    {QUICK_REACTIONS.map((emoji) => (
                      <Box
                        key={emoji}
                        as="button"
                        type="button"
                        fontSize="lg"
                        p={1}
                        borderRadius="md"
                        aria-label={`React with ${emoji}`}
                        _hover={{ bg: 'bg.hover', transform: 'scale(1.2)' }}
                        transition="transform 0.1s"
                        onClick={() => onToggleReaction(message, emoji)}
                      >
                        {emoji}
                      </Box>
                    ))}
                  </HStack>
                  <EmojiPicker onPick={(emoji) => onToggleReaction(message, emoji)} />
                </PopoverBody>
              </PopoverContent>
            </Popover>

            <Tooltip label="Reply">
              <IconButton
                aria-label="Reply"
                icon={<FiCornerUpLeft />}
                size="xs"
                variant="ghost"
                onClick={() => onReply(message)}
              />
            </Tooltip>

            <Menu isLazy placement="bottom-end">
              <MenuButton
                as={IconButton}
                aria-label="More actions"
                icon={<FiMoreHorizontal />}
                size="xs"
                variant="ghost"
              />
              <MenuList minW="200px">
                {actions.map((action, index) => (
                  <Fragment key={action.key}>
                    {index > 0 && actions[index - 1].group !== action.group && <MenuDivider />}
                    <MenuItem
                      icon={<action.icon />}
                      color={action.isDestructive ? 'red.400' : undefined}
                      onClick={action.onClick}
                    >
                      {action.label}
                    </MenuItem>
                  </Fragment>
                ))}
              </MenuList>
            </Menu>
          </HStack>
        )}
      </HStack>

      <MessageActionSheet
        isOpen={actionSheet.isOpen}
        onClose={actionSheet.onClose}
        actions={actions}
        onReact={(emoji) => onToggleReaction(message, emoji)}
        preview={message.content ?? messagePreview(message)}
      />
      <ReactionDetails
        reactions={message.reactions}
        isOpen={reactionDetails.isOpen}
        onClose={reactionDetails.onClose}
        currentUserId={currentUserId}
        onRemoveOwn={(emoji) => {
          onToggleReaction(message, emoji);
          reactionDetails.onClose();
        }}
      />
      <ReadByDialog messageId={message.id} isOpen={readBy.isOpen} onClose={readBy.onClose} />
    </>
  );
});
