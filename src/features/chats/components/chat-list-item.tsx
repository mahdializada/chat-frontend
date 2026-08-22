'use client';

import {
  Badge,
  Box,
  HStack,
  Icon,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { useState } from 'react';
import {
  FiArchive,
  FiBell,
  FiBellOff,
  FiCheckCircle,
  FiCircle,
  FiEdit3,
} from 'react-icons/fi';
import { TbPin, TbPinnedOff } from 'react-icons/tb';
import { ChatAvatar } from '@/components/shared/chat-avatar';
import { useAuthStore } from '@/store/auth-store';
import { useChatUiStore } from '@/store/chat-ui-store';
import {
  chatDisplayName,
  formatChatListTime,
  mentionsUser,
  messagePreview,
} from '@/utils/format';
import type { Chat } from '@/types/api';
import { MessageStatusTicks } from './message-status-ticks';
import { useMuteChat, useUpdateChatSettings } from '../hooks/use-chats';

interface ChatListItemProps {
  chat: Chat;
  isActive: boolean;
}

export function ChatListItem({ chat, isActive }: ChatListItemProps) {
  const user = useAuthStore((s) => s.user);
  const typingUsers = useChatUiStore((s) => s.typing[chat.id]);
  const localDraft = useChatUiStore((s) => s.drafts[chat.id]);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);

  const updateSettings = useUpdateChatSettings(chat.id);
  const muteChat = useMuteChat(chat.id);

  const activeBg = useColorModeValue('brand.50', 'whiteAlpha.100');
  const hoverBg = useColorModeValue('gray.50', 'whiteAlpha.50');
  const pinnedBg = useColorModeValue('blackAlpha.50', 'whiteAlpha.50');

  const typingList = Object.values(typingUsers ?? {});
  const draft = localDraft ?? chat.settings.draft;
  const timeSource = chat.lastMessageAt ?? chat.lastMessage?.createdAt ?? null;
  const hasMention =
    chat.unreadCount > 0 && chat.lastMessage && mentionsUser(chat.lastMessage, user?.id);

  const showOwnTicks =
    !!chat.lastMessage &&
    chat.lastMessage.senderId === user?.id &&
    chat.lastMessage.type !== 'SYSTEM' &&
    !chat.lastMessage.deletedAt &&
    typingList.length === 0 &&
    !draft;

  const previewNode = (): React.ReactNode => {
    if (typingList.length > 0) {
      return (
        <Text as="span" color="brand.400" fontStyle="italic">
          {chat.type === 'GROUP'
            ? `${typingList.map((t) => t.firstName).join(', ')} typing…`
            : 'typing…'}
        </Text>
      );
    }
    if (draft) {
      return (
        <>
          <Text as="span" color="red.400">
            Draft:{' '}
          </Text>
          {draft}
        </>
      );
    }
    const senderPrefix =
      chat.type === 'GROUP' &&
      chat.lastMessage &&
      !chat.lastMessage.deletedAt &&
      chat.lastMessage.type !== 'SYSTEM' &&
      chat.lastMessage.sender &&
      chat.lastMessage.senderId !== user?.id
        ? `${chat.lastMessage.sender.firstName}: `
        : '';
    return `${senderPrefix}${messagePreview(chat.lastMessage, user?.id)}`;
  };

  return (
    <>
      <Box
        as={NextLink}
        href={`/chat/${chat.id}`}
        px={3}
        py={2.5}
        borderRadius="lg"
        bg={isActive ? activeBg : chat.settings.isPinned ? pinnedBg : 'transparent'}
        _hover={{ bg: isActive ? activeBg : hoverBg }}
        display="block"
        onContextMenu={(event: React.MouseEvent) => {
          event.preventDefault();
          setMenuPosition({ x: event.clientX, y: event.clientY });
        }}
        aria-current={isActive ? 'page' : undefined}
      >
        <HStack spacing={3} align="center">
          <ChatAvatar chat={chat} size="md" />
          <Box flex="1" minW={0}>
            <HStack justify="space-between" align="baseline" spacing={2}>
              <HStack spacing={1.5} minW={0}>
                <Text fontWeight={chat.isUnread ? 'bold' : 'semibold'} noOfLines={1} fontSize="sm">
                  {chatDisplayName(chat, user)}
                </Text>
                {chat.settings.isPinned && (
                  <Icon as={TbPin} boxSize={3} color="gray.400" aria-label="Pinned" />
                )}
              </HStack>
              {timeSource && (
                <Text
                  fontSize="xs"
                  color={chat.isUnread ? 'brand.400' : 'gray.500'}
                  fontWeight={chat.isUnread ? 'semibold' : 'normal'}
                  flexShrink={0}
                >
                  {formatChatListTime(timeSource)}
                </Text>
              )}
            </HStack>

            <HStack justify="space-between" align="center" mt={0.5} spacing={2}>
              <HStack spacing={1} minW={0} flex="1">
                {showOwnTicks && chat.lastMessage && (
                  <MessageStatusTicks
                    message={chat.lastMessage}
                    chat={chat}
                    currentUserId={user?.id ?? ''}
                  />
                )}
                <Text fontSize="xs" color="gray.500" noOfLines={1}>
                  {previewNode()}
                </Text>
              </HStack>

              <HStack spacing={1.5} flexShrink={0}>
                {chat.settings.isMuted && (
                  <Icon as={FiBellOff} boxSize={3} color="gray.400" aria-label="Muted" />
                )}
                {hasMention && (
                  <Badge
                    colorScheme="brand"
                    variant="solid"
                    borderRadius="full"
                    fontSize="0.6rem"
                    px={1.5}
                    aria-label="You were mentioned"
                  >
                    @
                  </Badge>
                )}
                {chat.unreadCount > 0 ? (
                  <Badge
                    colorScheme={chat.settings.isMuted ? 'gray' : 'brand'}
                    variant="solid"
                    borderRadius="full"
                    fontSize="0.65rem"
                    minW="1.25rem"
                    textAlign="center"
                    aria-label={`${chat.unreadCount} unread messages`}
                  >
                    {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                  </Badge>
                ) : (
                  chat.isUnread && (
                    <Box
                      boxSize="9px"
                      borderRadius="full"
                      bg="brand.400"
                      aria-label="Marked as unread"
                    />
                  )
                )}
              </HStack>
            </HStack>
          </Box>
        </HStack>
      </Box>

      {/* right-click quick actions */}
      <Menu
        isOpen={!!menuPosition}
        onClose={() => setMenuPosition(null)}
        isLazy
        gutter={0}
        placement="right-start"
      >
        {/* Invisible anchor that positions the context menu at the cursor.
            aria-hidden + tabIndex -1 keeps it out of the tab order entirely. */}
        <MenuButton
          position="fixed"
          left={menuPosition ? `${menuPosition.x}px` : '-9999px'}
          top={menuPosition ? `${menuPosition.y}px` : '-9999px'}
          w="1px"
          h="1px"
          aria-hidden
          tabIndex={-1}
          aria-label="Chat actions"
        />
        <MenuList minW="200px">
          <MenuItem
            fontSize="sm"
            icon={chat.settings.isPinned ? <TbPinnedOff /> : <TbPin />}
            onClick={() => updateSettings.mutate({ isPinned: !chat.settings.isPinned })}
          >
            {chat.settings.isPinned ? 'Unpin chat' : 'Pin chat'}
          </MenuItem>
          <MenuItem
            fontSize="sm"
            icon={chat.settings.isMuted ? <FiBell /> : <FiBellOff />}
            onClick={() =>
              muteChat.mutate({ duration: chat.settings.isMuted ? undefined : 'forever' })
            }
          >
            {chat.settings.isMuted ? 'Unmute' : 'Mute'}
          </MenuItem>
          <MenuItem
            fontSize="sm"
            icon={chat.isUnread ? <FiCheckCircle /> : <FiCircle />}
            onClick={() => updateSettings.mutate({ isUnread: !chat.isUnread })}
          >
            {chat.isUnread ? 'Mark as read' : 'Mark as unread'}
          </MenuItem>
          <MenuItem
            fontSize="sm"
            icon={<FiArchive />}
            onClick={() => updateSettings.mutate({ isArchived: !chat.settings.isArchived })}
          >
            {chat.settings.isArchived ? 'Unarchive' : 'Archive'}
          </MenuItem>
          {draft && (
            <MenuItem fontSize="sm" icon={<FiEdit3 />} isDisabled>
              Draft: {draft.slice(0, 30)}
              {draft.length > 30 ? '…' : ''}
            </MenuItem>
          )}
        </MenuList>
      </Menu>
    </>
  );
}
