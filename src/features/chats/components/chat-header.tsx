'use client';

import {
  Box,
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useColorModeValue,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiInfo, FiLogOut, FiMoreVertical, FiTrash2 } from 'react-icons/fi';
import NextLink from 'next/link';
import { ChatAvatar } from '@/components/shared/chat-avatar';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { getApiErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { resolvePresence, useChatUiStore } from '@/store/chat-ui-store';
import { chatDisplayName, directChatPartner, formatLastSeen } from '@/utils/format';
import type { Chat } from '@/types/api';
import { useDeleteChat, useRemoveMember } from '../hooks/use-chats';
import { GroupInfoDrawer } from './group-info-drawer';

export function ChatHeader({ chat }: { chat: Chat }) {
  const user = useAuthStore((s) => s.user);
  const presence = useChatUiStore((s) => s.presence);
  const router = useRouter();
  const toast = useToast();
  const info = useDisclosure();
  const deleteConfirm = useDisclosure();
  const leaveConfirm = useDisclosure();
  const deleteChat = useDeleteChat();
  const removeMember = useRemoveMember(chat.id);
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const isGroup = chat.type === 'GROUP';
  const partner = user ? directChatPartner(chat, user.id) : null;
  const live = partner ? resolvePresence(partner, presence) : null;
  const myRole = chat.members.find((m) => m.userId === user?.id)?.role ?? 'MEMBER';

  const subtitle = isGroup
    ? `${chat.members.length} members`
    : live?.isOnline
      ? 'Online'
      : formatLastSeen(live?.lastSeen ?? null);

  const handleDelete = (): void => {
    deleteChat.mutate(chat.id, {
      onSuccess: () => router.push('/chat'),
      onError: (error) =>
        toast({ title: getApiErrorMessage(error), status: 'error', duration: 4000 }),
    });
  };

  const handleLeave = (): void => {
    if (!user) return;
    removeMember.mutate(user.id, {
      onSuccess: () => router.push('/chat'),
      onError: (error) =>
        toast({ title: getApiErrorMessage(error), status: 'error', duration: 4000 }),
    });
  };

  return (
    <HStack px={{ base: 2, md: 4 }} py={2.5} borderBottomWidth="1px" borderColor={borderColor} spacing={3}>
      <IconButton
        as={NextLink}
        href="/chat"
        aria-label="Back to chats"
        icon={<FiArrowLeft />}
        variant="ghost"
        size="sm"
        display={{ base: 'inline-flex', md: 'none' }}
      />
      <Box cursor={isGroup ? 'pointer' : 'default'} onClick={isGroup ? info.onOpen : undefined}>
        <ChatAvatar chat={chat} size="sm" />
      </Box>
      <Box
        flex="1"
        minW={0}
        cursor={isGroup ? 'pointer' : 'default'}
        onClick={isGroup ? info.onOpen : undefined}
      >
        <Text fontWeight="semibold" fontSize="sm" noOfLines={1}>
          {chatDisplayName(chat, user)}
        </Text>
        <Text fontSize="xs" color={!isGroup && live?.isOnline ? 'green.400' : 'gray.500'} noOfLines={1}>
          {subtitle}
        </Text>
      </Box>

      <Menu placement="bottom-end">
        <MenuButton
          as={IconButton}
          aria-label="Chat options"
          icon={<FiMoreVertical />}
          variant="ghost"
          size="sm"
        />
        <MenuList minW="200px">
          {isGroup && (
            <MenuItem icon={<FiInfo />} onClick={info.onOpen} fontSize="sm">
              Group info
            </MenuItem>
          )}
          {isGroup && (
            <MenuItem icon={<FiLogOut />} onClick={leaveConfirm.onOpen} fontSize="sm">
              Leave group
            </MenuItem>
          )}
          {(!isGroup || myRole === 'OWNER') && (
            <MenuItem
              icon={<FiTrash2 />}
              color="red.400"
              onClick={deleteConfirm.onOpen}
              fontSize="sm"
            >
              {isGroup ? 'Delete group' : 'Delete chat'}
            </MenuItem>
          )}
        </MenuList>
      </Menu>

      {isGroup && <GroupInfoDrawer chat={chat} isOpen={info.isOpen} onClose={info.onClose} />}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={deleteConfirm.onClose}
        title={isGroup ? 'Delete group' : 'Delete chat'}
        body={
          isGroup
            ? 'This permanently deletes the group and its messages for everyone.'
            : 'This permanently deletes the conversation for both participants.'
        }
        confirmLabel="Delete"
        isLoading={deleteChat.isPending}
        onConfirm={handleDelete}
      />
      <ConfirmDialog
        isOpen={leaveConfirm.isOpen}
        onClose={leaveConfirm.onClose}
        title="Leave group"
        body="You will stop receiving messages from this group."
        confirmLabel="Leave"
        isLoading={removeMember.isPending}
        onConfirm={handleLeave}
      />
    </HStack>
  );
}
