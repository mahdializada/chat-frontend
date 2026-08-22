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
  useColorModeValue,
  useDisclosure,
  Wrap,
  WrapItem,
} from '@chakra-ui/react';
import { memo, useMemo, useState } from 'react';
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
import { formatMessageTime, fullName, mentionsUser, messagePreview } from '@/utils/format';
import type { Chat, Message } from '@/types/api';
import { EmojiPicker, QUICK_REACTIONS } from './emoji-picker';
import { AttachmentView } from './attachment-view';
import { LinkPreviewCard } from './link-preview-card';
import { MessageStatus } from './message-status';
import { MessageText } from './message-text';
import { ReactionDetails } from './reaction-details';
import { ReadByDialog } from './read-by-dialog';

export interface MessageItemProps {
  message: Message;
  chat: Chat;
  currentUserId: string;
  showSender: boolean;
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
  onJumpToMessage?: (messageId: string) => void;
  onOpenProfile?: (userId: string) => void;
}

export const MessageItem = memo(function MessageItem({
  message,
  chat,
  currentUserId,
  showSender,
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
  onJumpToMessage,
  onOpenProfile,
}: MessageItemProps) {
  const isOwn = message.senderId === currentUserId;
  const isDeleted = !!message.deletedAt;
  const isGroup = chat.type === 'GROUP';
  const isPending = !!message.optimistic || !!message.queued;

  const reactionDetails = useDisclosure();
  const readBy = useDisclosure();
  const [copied, setCopied] = useState(false);

  const ownBg = useColorModeValue('brand.500', 'brand.600');
  const otherBg = useColorModeValue('white', 'gray.700');
  const mentionBg = useColorModeValue('yellow.50', 'yellow.900');
  const highlightRing = useColorModeValue('yellow.400', 'yellow.300');
  const selectedBg = useColorModeValue('brand.50', 'whiteAlpha.100');

  const myRole = chat.members.find((m) => m.userId === currentUserId)?.role ?? 'MEMBER';
  const isModerator = isGroup && (myRole === 'OWNER' || myRole === 'ADMIN');
  const isMentioningMe = !isOwn && mentionsUser(message, currentUserId);

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

  if (message.type === 'SYSTEM') {
    return (
      <Center my={2} data-message-id={message.id}>
        <Tag size="sm" borderRadius="full" variant="subtle" colorScheme="gray" px={3} textAlign="center">
          {message.content}
        </Tag>
      </Center>
    );
  }

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

  // Sticker/GIF bubbles are transparent so the artwork sits on the wallpaper.
  const isBareMedia =
    (message.type === 'STICKER' || message.type === 'GIF') && !message.content && !isDeleted;

  const handleBodyClick = (): void => {
    if (isSelectionMode) onSelect(message);
  };

  return (
    <>
      <HStack
        align="flex-end"
        justify={isOwn ? 'flex-end' : 'flex-start'}
        spacing={2}
        my={0.5}
        px={1}
        py={isSelectionMode ? 1 : 0}
        role="group"
        data-message-id={message.id}
        bg={isSelected ? selectedBg : 'transparent'}
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

        {!isOwn && (
          <Box w="28px" flexShrink={0}>
            {showSender && (
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

        <Box maxW={{ base: '82%', md: '65%' }} position="relative" minW={0}>
          {!isOwn && showSender && isGroup && message.sender && (
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
            bg={isBareMedia ? 'transparent' : isOwn ? ownBg : isMentioningMe ? mentionBg : otherBg}
            color={isOwn && !isBareMedia ? 'white' : undefined}
            borderRadius="xl"
            borderBottomRightRadius={isOwn ? 'sm' : 'xl'}
            borderBottomLeftRadius={isOwn ? 'xl' : 'sm'}
            borderWidth={isBareMedia ? 0 : '1px'}
            borderColor={isOwn ? 'transparent' : 'blackAlpha.100'}
            _dark={{ borderColor: isOwn ? 'transparent' : 'whiteAlpha.100' }}
            px={isBareMedia ? 0 : 3}
            py={isBareMedia ? 0 : 2}
            boxShadow={isHighlighted ? `0 0 0 2px var(--chakra-colors-yellow-400)` : 'xs'}
            outline={isHighlighted ? `2px solid ${highlightRing}` : undefined}
            opacity={isPending ? 0.75 : 1}
            transition="box-shadow 0.3s"
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
                <Text fontSize="xs" opacity={0.8} noOfLines={2} fontStyle={message.replyTo.deletedAt ? 'italic' : undefined}>
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
                <Text fontSize="0.65rem" opacity={0.7}>
                  {formatMessageTime(message.createdAt)}
                </Text>
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
            <HStack spacing={2} mt={1} justify="flex-end">
              <Text fontSize="xs" color="red.400">
                Failed to send
              </Text>
              {onRetry && (
                <Text
                  as="button"
                  fontSize="xs"
                  color="brand.400"
                  fontWeight="semibold"
                  onClick={() => onRetry(message)}
                >
                  Retry
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
                  size="sm"
                  borderRadius="full"
                  variant="ghost"
                  cursor="pointer"
                  fontSize="0.6rem"
                  color="gray.500"
                  onClick={reactionDetails.onOpen}
                >
                  details
                </Tag>
              </WrapItem>
            </Wrap>
          )}
        </Box>

        {/* hover actions */}
        {!isDeleted && !isPending && !isSelectionMode && (
          <HStack
            spacing={0}
            opacity={0}
            _groupHover={{ opacity: 1 }}
            _focusWithin={{ opacity: 1 }}
            transition="opacity 0.15s"
            flexShrink={0}
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
                        _hover={{ bg: 'blackAlpha.100', transform: 'scale(1.2)' }}
                        _dark={{ _hover: { bg: 'whiteAlpha.200' } }}
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
                <MenuItem icon={<FiCornerUpLeft />} onClick={() => onReply(message)} fontSize="sm">
                  Reply
                </MenuItem>
                {message.content && (
                  <MenuItem icon={<FiCopy />} onClick={() => void copyText()} fontSize="sm">
                    {copied ? 'Copied' : 'Copy'}
                  </MenuItem>
                )}
                <MenuItem
                  icon={<FiCornerUpRight />}
                  onClick={() => onForward(message)}
                  fontSize="sm"
                >
                  Forward
                </MenuItem>
                <MenuItem icon={<FiStar />} onClick={() => onToggleStar(message)} fontSize="sm">
                  {message.isStarred ? 'Unstar' : 'Star'}
                </MenuItem>
                <MenuItem
                  icon={<FiCheckSquare />}
                  onClick={() => onSelect(message)}
                  fontSize="sm"
                >
                  Select
                </MenuItem>
                {isOwn && isGroup && (
                  <MenuItem icon={<FiInfo />} onClick={readBy.onOpen} fontSize="sm">
                    Message info
                  </MenuItem>
                )}
                {isOwn && message.type === 'TEXT' && (
                  <>
                    <MenuDivider />
                    <MenuItem icon={<FiEdit2 />} onClick={() => onEdit(message)} fontSize="sm">
                      Edit
                    </MenuItem>
                  </>
                )}
                <MenuDivider />
                <MenuItem icon={<FiTrash2 />} onClick={() => onDelete(message, false)} fontSize="sm">
                  Delete for me
                </MenuItem>
                {(isOwn || isModerator) && (
                  <MenuItem
                    icon={<FiTrash2 />}
                    color="red.400"
                    onClick={() => onDelete(message, true)}
                    fontSize="sm"
                  >
                    Delete for everyone
                  </MenuItem>
                )}
              </MenuList>
            </Menu>
          </HStack>
        )}
      </HStack>

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
