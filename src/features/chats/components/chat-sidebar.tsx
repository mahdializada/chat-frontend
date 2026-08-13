'use client';

import {
  Box,
  Center,
  Divider,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Spinner,
  Text,
  Tooltip,
  useColorMode,
  useDisclosure,
  VStack,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  FiEdit,
  FiLogOut,
  FiMoon,
  FiPlus,
  FiSearch,
  FiSun,
  FiUser,
  FiUsers,
} from 'react-icons/fi';
import { UserAvatar } from '@/components/shared/user-avatar';
import { useLogout } from '@/features/auth/hooks/use-auth';
import { useMessageSearch } from '@/features/messages/hooks/use-messages';
import { NotificationsPopover } from '@/features/notifications/components/notifications-popover';
import { useDebouncedValue } from '@/features/users/hooks/use-user-search';
import { useAuthStore } from '@/store/auth-store';
import { chatDisplayName, formatChatListTime, fullName } from '@/utils/format';
import type { MessageSearchResult } from '@/types/api';
import { useChats } from '../hooks/use-chats';
import { ChatListItem } from './chat-list-item';
import { NewChatModal } from './new-chat-modal';
import { NewGroupModal } from './new-group-modal';

export function ChatSidebar() {
  const user = useAuthStore((s) => s.user);
  const params = useParams<{ chatId?: string }>();
  const chats = useChats();
  const logout = useLogout();
  const router = useRouter();
  const { colorMode, toggleColorMode } = useColorMode();

  const [term, setTerm] = useState('');
  const debouncedTerm = useDebouncedValue(term.trim());
  const messageSearch = useMessageSearch(debouncedTerm);

  const newChat = useDisclosure();
  const newGroup = useDisclosure();

  const filteredChats = useMemo(() => {
    const list = chats.data ?? [];
    if (!debouncedTerm) return list;
    const lower = debouncedTerm.toLowerCase();
    return list.filter((chat) => {
      const name = chatDisplayName(chat, user).toLowerCase();
      if (name.includes(lower)) return true;
      return chat.members.some(
        (m) =>
          m.userId !== user?.id &&
          (fullName(m.user).toLowerCase().includes(lower) ||
            m.user.username.toLowerCase().includes(lower)),
      );
    });
  }, [chats.data, debouncedTerm, user]);

  const handleSearchResult = (result: MessageSearchResult): void => {
    setTerm('');
    router.push(`/chat/${result.chat.id}?around=${result.id}`);
  };

  return (
    <>
      {/* header: current user + actions */}
      <HStack px={4} py={3} spacing={3}>
        <Menu>
          <MenuButton>
            <UserAvatar user={user} size="sm" />
          </MenuButton>
          <MenuList>
            <Box px={3} py={1.5}>
              <Text fontWeight="semibold" fontSize="sm">
                {user ? fullName(user) : ''}
              </Text>
              <Text fontSize="xs" color="gray.500">
                @{user?.username}
              </Text>
            </Box>
            <MenuDivider />
            <MenuItem as={NextLink} href="/profile" icon={<FiUser />}>
              Profile
            </MenuItem>
            <MenuItem
              icon={colorMode === 'light' ? <FiMoon /> : <FiSun />}
              onClick={toggleColorMode}
            >
              {colorMode === 'light' ? 'Dark mode' : 'Light mode'}
            </MenuItem>
            <MenuDivider />
            <MenuItem icon={<FiLogOut />} onClick={() => logout.mutate()} color="red.400">
              Log out
            </MenuItem>
          </MenuList>
        </Menu>
        <Text fontWeight="bold" fontSize="lg" flex="1">
          Chats
        </Text>
        <NotificationsPopover />
        <Tooltip label="New group">
          <IconButton
            aria-label="New group"
            icon={<FiUsers />}
            variant="ghost"
            size="sm"
            onClick={newGroup.onOpen}
          />
        </Tooltip>
        <Tooltip label="New chat">
          <IconButton
            aria-label="New chat"
            icon={<FiEdit />}
            variant="ghost"
            size="sm"
            onClick={newChat.onOpen}
          />
        </Tooltip>
      </HStack>

      {/* search */}
      <Box px={4} pb={2}>
        <InputGroup size="sm">
          <InputLeftElement pointerEvents="none">
            <FiSearch color="gray" />
          </InputLeftElement>
          <Input
            placeholder="Search chats and messages…"
            borderRadius="lg"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </InputGroup>
      </Box>

      {/* chat list + search results */}
      <Box flex="1" overflowY="auto" px={2} pb={4}>
        {chats.isLoading && (
          <Center py={10}>
            <Spinner />
          </Center>
        )}

        {chats.isError && (
          <Text color="red.400" fontSize="sm" textAlign="center" py={6}>
            Could not load chats
          </Text>
        )}

        {!chats.isLoading && filteredChats.length === 0 && !debouncedTerm && (
          <VStack py={10} spacing={3} color="gray.500">
            <FiPlus size={28} />
            <Text fontSize="sm" textAlign="center" px={6}>
              No conversations yet. Start a new chat or create a group.
            </Text>
          </VStack>
        )}

        <VStack align="stretch" spacing={0.5}>
          {filteredChats.map((chat) => (
            <ChatListItem key={chat.id} chat={chat} isActive={params?.chatId === chat.id} />
          ))}
        </VStack>

        {debouncedTerm.length >= 2 && (
          <>
            <Divider my={3} />
            <Text px={2} fontSize="xs" fontWeight="semibold" color="gray.500" mb={1}>
              MESSAGES
            </Text>
            {messageSearch.isFetching && (
              <Center py={4}>
                <Spinner size="sm" />
              </Center>
            )}
            {messageSearch.data?.length === 0 && !messageSearch.isFetching && (
              <Text px={2} fontSize="sm" color="gray.500">
                No messages found
              </Text>
            )}
            <VStack align="stretch" spacing={0.5}>
              {messageSearch.data?.map((result) => (
                <Box
                  key={result.id}
                  px={3}
                  py={2}
                  borderRadius="lg"
                  cursor="pointer"
                  _hover={{ bg: 'whiteAlpha.100' }}
                  onClick={() => handleSearchResult(result)}
                >
                  <HStack justify="space-between" align="baseline">
                    <Text fontSize="sm" fontWeight="semibold" noOfLines={1}>
                      {result.chat.type === 'GROUP'
                        ? result.chat.name
                        : result.sender
                          ? fullName(result.sender)
                          : 'Direct chat'}
                    </Text>
                    <Text fontSize="xs" color="gray.500" flexShrink={0}>
                      {formatChatListTime(result.createdAt)}
                    </Text>
                  </HStack>
                  <Text fontSize="xs" color="gray.500" noOfLines={2}>
                    {result.sender ? `${result.sender.firstName}: ` : ''}
                    {result.content}
                  </Text>
                </Box>
              ))}
            </VStack>
          </>
        )}
      </Box>

      <NewChatModal isOpen={newChat.isOpen} onClose={newChat.onClose} />
      <NewGroupModal isOpen={newGroup.isOpen} onClose={newGroup.onClose} />
    </>
  );
}
