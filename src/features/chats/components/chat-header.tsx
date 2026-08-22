'use client';

import {
  Badge,
  Box,
  HStack,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Text,
  Tooltip,
  useColorModeValue,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FiArchive,
  FiArrowLeft,
  FiBell,
  FiBellOff,
  FiCheckCircle,
  FiInfo,
  FiLogOut,
  FiMoreVertical,
  FiSearch,
  FiStar,
  FiTrash2,
} from 'react-icons/fi';
import { TbPin, TbPinnedOff } from 'react-icons/tb';
import { ChatAvatar } from '@/components/shared/chat-avatar';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { getApiErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { resolvePresence, useChatUiStore } from '@/store/chat-ui-store';
import {
  chatDisplayName,
  directChatPartner,
  formatLastSeen,
  formatMuteUntil,
} from '@/utils/format';
import type { Chat } from '@/types/api';
import {
  useClearChat,
  useDeleteChat,
  useMuteChat,
  useRemoveMember,
  useUpdateChatSettings,
} from '../hooks/use-chats';

interface ChatHeaderProps {
  chat: Chat;
  onOpenInfo: () => void;
  onToggleSearch: () => void;
  onOpenStarred: () => void;
}

export function ChatHeader({ chat, onOpenInfo, onToggleSearch, onOpenStarred }: ChatHeaderProps) {
  const user = useAuthStore((s) => s.user);
  const presence = useChatUiStore((s) => s.presence);
  const typingUsers = useChatUiStore((s) => s.typing[chat.id]);
  const router = useRouter();
  const toast = useToast();

  const deleteConfirm = useDisclosure();
  const leaveConfirm = useDisclosure();
  const clearConfirm = useDisclosure();

  const deleteChat = useDeleteChat();
  const removeMember = useRemoveMember(chat.id);
  const updateSettings = useUpdateChatSettings(chat.id);
  const muteChat = useMuteChat(chat.id);
  const clearChat = useClearChat(chat.id);

  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200');
  const headerBg = useColorModeValue('white', 'gray.800');

  const isGroup = chat.type === 'GROUP';
  const partner = user ? directChatPartner(chat, user.id) : null;
  const live = partner ? resolvePresence(partner, presence) : null;
  const typingCount = Object.keys(typingUsers ?? {}).length;

  const onError = (error: unknown): void => {
    toast({ title: getApiErrorMessage(error), status: 'error', duration: 4000 });
  };

  const subtitle = (): string => {
    if (typingCount > 0) return 'typing…';
    if (isGroup) {
      const online = chat.members.filter((m) => resolvePresence(m.user, presence).isOnline).length;
      return `${chat.members.length} members${online > 1 ? `, ${online} online` : ''}`;
    }
    if (chat.blockState?.blockedByMe) return 'Blocked';
    if (live?.isOnline) return 'online';
    return formatLastSeen(live?.lastSeen ?? null);
  };

  return (
    <>
      <HStack
        px={{ base: 2, md: 4 }}
        py={2.5}
        borderBottomWidth="1px"
        borderColor={borderColor}
        bg={headerBg}
        spacing={3}
      >
        <IconButton
          as={NextLink}
          href="/chat"
          aria-label="Back to chats"
          icon={<FiArrowLeft />}
          variant="ghost"
          size="sm"
          display={{ base: 'inline-flex', md: 'none' }}
        />

        <ChatAvatar chat={chat} size="sm" onClick={onOpenInfo} />

        <Box
          as="button"
          type="button"
          flex="1"
          minW={0}
          textAlign="left"
          onClick={onOpenInfo}
          aria-label={isGroup ? 'Open group info' : 'Open contact info'}
        >
          <HStack spacing={1.5}>
            <Text fontWeight="semibold" fontSize="sm" noOfLines={1}>
              {chatDisplayName(chat, user)}
            </Text>
            {chat.settings.isMuted && (
              <Tooltip label={formatMuteUntil(chat.settings.mutedUntil)}>
                <span>
                  <Icon as={FiBellOff} boxSize={3} color="gray.400" aria-label="Muted" />
                </span>
              </Tooltip>
            )}
            {chat.settings.isPinned && (
              <Icon as={TbPin} boxSize={3} color="gray.400" aria-label="Pinned" />
            )}
            {chat.settings.isArchived && (
              <Badge fontSize="0.55rem" colorScheme="gray">
                Archived
              </Badge>
            )}
          </HStack>
          <Text
            fontSize="xs"
            color={
              typingCount > 0
                ? 'brand.400'
                : !isGroup && live?.isOnline
                  ? 'green.400'
                  : 'gray.500'
            }
            fontStyle={typingCount > 0 ? 'italic' : undefined}
            noOfLines={1}
          >
            {subtitle()}
          </Text>
        </Box>

        <Tooltip label="Search in conversation (⌘F)">
          <IconButton
            aria-label="Search in conversation"
            icon={<FiSearch />}
            variant="ghost"
            size="sm"
            onClick={onToggleSearch}
          />
        </Tooltip>

        <Menu placement="bottom-end" isLazy>
          <MenuButton
            as={IconButton}
            aria-label="Chat options"
            icon={<FiMoreVertical />}
            variant="ghost"
            size="sm"
          />
          <MenuList minW="220px">
            <MenuItem icon={<FiInfo />} onClick={onOpenInfo} fontSize="sm">
              {isGroup ? 'Group info' : 'Contact info'}
            </MenuItem>
            <MenuItem icon={<FiStar />} onClick={onOpenStarred} fontSize="sm">
              Starred messages
            </MenuItem>
            <MenuDivider />

            <MenuItem
              icon={chat.settings.isPinned ? <TbPinnedOff /> : <TbPin />}
              fontSize="sm"
              onClick={() =>
                updateSettings.mutate({ isPinned: !chat.settings.isPinned }, { onError })
              }
            >
              {chat.settings.isPinned ? 'Unpin chat' : 'Pin chat'}
            </MenuItem>
            <MenuItem
              icon={chat.settings.isMuted ? <FiBell /> : <FiBellOff />}
              fontSize="sm"
              onClick={() =>
                muteChat.mutate(
                  { duration: chat.settings.isMuted ? undefined : 'forever' },
                  { onError },
                )
              }
            >
              {chat.settings.isMuted ? 'Unmute notifications' : 'Mute notifications'}
            </MenuItem>
            <MenuItem
              icon={<FiArchive />}
              fontSize="sm"
              onClick={() =>
                updateSettings.mutate({ isArchived: !chat.settings.isArchived }, { onError })
              }
            >
              {chat.settings.isArchived ? 'Unarchive chat' : 'Archive chat'}
            </MenuItem>
            <MenuItem
              icon={<FiCheckCircle />}
              fontSize="sm"
              onClick={() => {
                updateSettings.mutate({ isUnread: true }, { onError });
                router.push('/chat');
              }}
            >
              Mark as unread
            </MenuItem>

            <MenuDivider />
            <MenuItem icon={<FiTrash2 />} onClick={clearConfirm.onOpen} fontSize="sm">
              Clear chat
            </MenuItem>
            {isGroup ? (
              <MenuItem
                icon={<FiLogOut />}
                onClick={leaveConfirm.onOpen}
                fontSize="sm"
                color="red.400"
              >
                Exit group
              </MenuItem>
            ) : (
              <MenuItem
                icon={<FiTrash2 />}
                onClick={deleteConfirm.onOpen}
                fontSize="sm"
                color="red.400"
              >
                Delete chat
              </MenuItem>
            )}
          </MenuList>
        </Menu>
      </HStack>

      <ConfirmDialog
        isOpen={clearConfirm.isOpen}
        onClose={clearConfirm.onClose}
        onConfirm={() =>
          clearChat.mutate(undefined, {
            onSuccess: () => {
              toast({ title: 'Chat cleared', status: 'success', duration: 3000 });
              clearConfirm.onClose();
            },
            onError,
          })
        }
        isLoading={clearChat.isPending}
        title="Clear this chat?"
        body="Every message will be hidden for you. Other participants keep their copies. This cannot be undone."
        confirmLabel="Clear chat"
      />

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={deleteConfirm.onClose}
        onConfirm={() =>
          deleteChat.mutate(chat.id, {
            onSuccess: () => router.push('/chat'),
            onError,
          })
        }
        isLoading={deleteChat.isPending}
        title="Delete this chat?"
        body="The conversation and its messages are removed for both participants. This cannot be undone."
        confirmLabel="Delete"
      />

      <ConfirmDialog
        isOpen={leaveConfirm.isOpen}
        onClose={leaveConfirm.onClose}
        onConfirm={() => {
          if (!user) return;
          removeMember.mutate(user.id, {
            onSuccess: () => router.push('/chat'),
            onError,
          });
        }}
        isLoading={removeMember.isPending}
        title="Exit group?"
        body="You will stop receiving messages from this group."
        confirmLabel="Exit"
      />
    </>
  );
}
