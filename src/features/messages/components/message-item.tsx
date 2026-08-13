'use client';

import {
  Box,
  Center,
  HStack,
  IconButton,
  Menu,
  MenuButton,
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
  Wrap,
  WrapItem,
} from '@chakra-ui/react';
import { memo } from 'react';
import { FiCornerUpLeft, FiEdit2, FiMoreHorizontal, FiSmile, FiTrash2 } from 'react-icons/fi';
import { UserAvatar } from '@/components/shared/user-avatar';
import { formatMessageTime, fullName, messagePreview } from '@/utils/format';
import type { Chat, Message } from '@/types/api';
import { EmojiPicker, QUICK_REACTIONS } from './emoji-picker';
import { AttachmentView } from './attachment-view';
import { MessageStatus } from './message-status';

export interface MessageItemProps {
  message: Message;
  chat: Chat;
  currentUserId: string;
  showSender: boolean;
  isHighlighted?: boolean;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDelete: (message: Message, forEveryone: boolean) => void;
  onToggleReaction: (message: Message, emoji: string) => void;
  onRetry?: (message: Message) => void;
}

export const MessageItem = memo(function MessageItem({
  message,
  chat,
  currentUserId,
  showSender,
  isHighlighted = false,
  onReply,
  onEdit,
  onDelete,
  onToggleReaction,
  onRetry,
}: MessageItemProps) {
  const isOwn = message.senderId === currentUserId;
  const isDeleted = !!message.deletedAt;
  const isGroup = chat.type === 'GROUP';

  const ownBg = useColorModeValue('brand.500', 'brand.600');
  const otherBg = useColorModeValue('gray.100', 'gray.700');
  const highlightRing = useColorModeValue('yellow.300', 'yellow.500');
  const isModerator =
    isGroup &&
    ['OWNER', 'ADMIN'].includes(
      chat.members.find((m) => m.userId === currentUserId)?.role ?? 'MEMBER',
    );

  if (message.type === 'SYSTEM') {
    return (
      <Center my={2}>
        <Tag size="sm" borderRadius="full" variant="subtle" colorScheme="gray" px={3}>
          {message.content}
        </Tag>
      </Center>
    );
  }

  // Group reactions by emoji for the pill row.
  const reactionGroups = new Map<string, { count: number; mine: boolean; names: string[] }>();
  for (const reaction of message.reactions) {
    const group = reactionGroups.get(reaction.emoji) ?? { count: 0, mine: false, names: [] };
    group.count += 1;
    group.names.push(fullName(reaction.user));
    if (reaction.userId === currentUserId) group.mine = true;
    reactionGroups.set(reaction.emoji, group);
  }

  return (
    <HStack
      align="flex-end"
      justify={isOwn ? 'flex-end' : 'flex-start'}
      spacing={2}
      my={0.5}
      px={1}
      role="group"
      data-message-id={message.id}
    >
      {!isOwn && (
        <Box w="28px" flexShrink={0}>
          {showSender && <UserAvatar user={message.sender} size="xs" />}
        </Box>
      )}

      <Box maxW={{ base: '80%', md: '65%' }} position="relative">
        {!isOwn && showSender && isGroup && message.sender && (
          <Text fontSize="xs" fontWeight="semibold" color="brand.400" mb={0.5} ml={1}>
            {fullName(message.sender)}
          </Text>
        )}

        <Box
          bg={isOwn ? ownBg : otherBg}
          color={isOwn ? 'white' : undefined}
          borderRadius="xl"
          borderBottomRightRadius={isOwn ? 'sm' : 'xl'}
          borderBottomLeftRadius={isOwn ? 'xl' : 'sm'}
          px={3}
          py={2}
          boxShadow={isHighlighted ? `0 0 0 2px var(--chakra-colors-${highlightRing.replace('.', '-')})` : undefined}
          opacity={message.optimistic ? 0.75 : 1}
        >
          {/* reply context */}
          {message.replyTo && !isDeleted && (
            <Box
              borderLeftWidth="3px"
              borderColor={isOwn ? 'whiteAlpha.600' : 'brand.400'}
              bg={isOwn ? 'whiteAlpha.200' : 'blackAlpha.100'}
              borderRadius="md"
              px={2}
              py={1}
              mb={1.5}
            >
              <Text fontSize="xs" fontWeight="semibold" opacity={0.9}>
                {message.replyTo.senderId === currentUserId
                  ? 'You'
                  : fullName(message.replyTo.sender)}
              </Text>
              <Text fontSize="xs" opacity={0.8} noOfLines={2}>
                {message.replyTo.deletedAt
                  ? 'Message deleted'
                  : (message.replyTo.content ??
                    messagePreview(message.replyTo as unknown as Message))}
              </Text>
            </Box>
          )}

          {isDeleted ? (
            <Text fontSize="sm" fontStyle="italic" opacity={0.7}>
              This message was deleted
            </Text>
          ) : (
            <>
              {message.attachments.length > 0 && (
                <Box mb={message.content ? 1.5 : 0}>
                  <AttachmentView attachments={message.attachments} isOwn={isOwn} />
                </Box>
              )}
              {message.content && (
                <Text fontSize="sm" whiteSpace="pre-wrap" wordBreak="break-word">
                  {message.content}
                </Text>
              )}
            </>
          )}

          {/* time + edited + status */}
          <HStack spacing={1} justify="flex-end" mt={0.5}>
            {message.editedAt && !isDeleted && (
              <Text fontSize="0.65rem" opacity={0.7}>
                edited
              </Text>
            )}
            <Text fontSize="0.65rem" opacity={0.7}>
              {formatMessageTime(message.createdAt)}
            </Text>
            {isOwn && !isDeleted && (
              <MessageStatus message={message} chat={chat} currentUserId={currentUserId} />
            )}
          </HStack>
        </Box>

        {/* failed → retry */}
        {message.failed && (
          <HStack spacing={2} mt={1} justify="flex-end">
            <Text fontSize="xs" color="red.400">
              Failed to send
            </Text>
            {onRetry && (
              <Text
                fontSize="xs"
                color="brand.400"
                cursor="pointer"
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
                    onClick={() => onToggleReaction(message, emoji)}
                  >
                    {emoji} {group.count > 1 ? group.count : ''}
                  </Tag>
                </Tooltip>
              </WrapItem>
            ))}
          </Wrap>
        )}
      </Box>

      {/* hover actions */}
      {!isDeleted && !message.optimistic && (
        <HStack
          spacing={0}
          opacity={0}
          _groupHover={{ opacity: 1 }}
          transition="opacity 0.15s"
          flexShrink={0}
        >
          <Popover placement="top" isLazy>
            <PopoverTrigger>
              <IconButton
                aria-label="React"
                icon={<FiSmile />}
                size="xs"
                variant="ghost"
              />
            </PopoverTrigger>
            <PopoverContent w="auto">
              <PopoverBody p={1}>
                <HStack spacing={0.5}>
                  {QUICK_REACTIONS.map((emoji) => (
                    <Box
                      key={emoji}
                      as="button"
                      type="button"
                      fontSize="lg"
                      p={1}
                      borderRadius="md"
                      _hover={{ bg: 'whiteAlpha.300', transform: 'scale(1.2)' }}
                      transition="transform 0.1s"
                      onClick={() => onToggleReaction(message, emoji)}
                    >
                      {emoji}
                    </Box>
                  ))}
                </HStack>
              </PopoverBody>
            </PopoverContent>
          </Popover>
          <IconButton
            aria-label="Reply"
            icon={<FiCornerUpLeft />}
            size="xs"
            variant="ghost"
            onClick={() => onReply(message)}
          />
          <Menu isLazy placement="bottom-end">
            <MenuButton
              as={IconButton}
              aria-label="More"
              icon={<FiMoreHorizontal />}
              size="xs"
              variant="ghost"
            />
            <MenuList minW="180px">
              {isOwn && (
                <MenuItem icon={<FiEdit2 />} onClick={() => onEdit(message)} fontSize="sm">
                  Edit
                </MenuItem>
              )}
              <MenuItem
                icon={<FiTrash2 />}
                onClick={() => onDelete(message, false)}
                fontSize="sm"
              >
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
  );
});
