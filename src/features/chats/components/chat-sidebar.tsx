'use client';

import {
  Badge,
  Box,
  Divider,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Spinner,
  Tag,
  Text,
  Tooltip,
  useColorMode,
  useColorModeValue,
  useDisclosure,
  VStack,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import {
  FiArchive,
  FiArrowLeft,
  FiEdit,
  FiLogOut,
  FiMessageCircle,
  FiMoon,
  FiSearch,
  FiStar,
  FiSun,
  FiUser,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import { EmptyState } from '@/components/shared/empty-state';
import { ChatListSkeleton } from '@/components/shared/skeletons';
import { UserAvatar } from '@/components/shared/user-avatar';
import { useLogout } from '@/features/auth/hooks/use-auth';
import { StarredMessagesDrawer } from '@/features/messages/components/starred-messages-drawer';
import { useMessageSearch } from '@/features/messages/hooks/use-messages';
import { NotificationsPopover } from '@/features/notifications/components/notifications-popover';
import { useDebouncedValue } from '@/features/users/hooks/use-user-search';
import { useAuthStore } from '@/store/auth-store';
import {
  chatDisplayName,
  formatChatListTime,
  fullName,
  splitOnMatch,
} from '@/utils/format';
import type { Chat, MessageSearchResult } from '@/types/api';
import { useArchivedSummary, useChats } from '../hooks/use-chats';
import { ChatListItem } from './chat-list-item';
import { NewChatModal } from './new-chat-modal';
import { NewGroupModal } from './new-group-modal';

interface ChatSidebarProps {
  /** Renders the archived list instead of the active one. */
  archived?: boolean;
}

export function ChatSidebar({ archived = false }: ChatSidebarProps) {
  const user = useAuthStore((s) => s.user);
  const params = useParams<{ chatId?: string }>();
  const chats = useChats({ archived });
  const archivedSummary = useArchivedSummary();
  const logout = useLogout();
  const router = useRouter();
  const { colorMode, toggleColorMode } = useColorMode();
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [term, setTerm] = useState('');
  const debouncedTerm = useDebouncedValue(term.trim());
  const messageSearch = useMessageSearch(debouncedTerm);

  const newChat = useDisclosure();
  const newGroup = useDisclosure();
  const starred = useDisclosure();

  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200');
  const hoverBg = useColorModeValue('gray.50', 'whiteAlpha.100');

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

  const pinned = filteredChats.filter((chat) => chat.settings.isPinned);
  const regular = filteredChats.filter((chat) => !chat.settings.isPinned);

  const handleSearchResult = (result: MessageSearchResult): void => {
    setTerm('');
    router.push(`/chat/${result.chat.id}?around=${result.id}`);
  };

  return (
    <>
      {/* header: current user + actions */}
      <HStack px={4} py={3} spacing={3}>
        {archived ? (
          <IconButton
            as={NextLink}
            href="/chat"
            aria-label="Back to chats"
            icon={<FiArrowLeft />}
            variant="ghost"
            size="sm"
          />
        ) : (
          <Menu isLazy>
            <MenuButton aria-label="Account menu">
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
                Profile & settings
              </MenuItem>
              <MenuItem icon={<FiStar />} onClick={starred.onOpen}>
                Starred messages
              </MenuItem>
              <MenuItem as={NextLink} href="/chat/archived" icon={<FiArchive />}>
                Archived chats
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
        )}

        <Text fontWeight="bold" fontSize="lg" flex="1">
          {archived ? 'Archived' : 'Chats'}
        </Text>

        {!archived && (
          <>
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
          </>
        )}
      </HStack>

      {/* search */}
      <Box px={4} pb={2}>
        <InputGroup size="sm">
          <InputLeftElement pointerEvents="none">
            <Icon as={FiSearch} color="gray.400" aria-hidden />
          </InputLeftElement>
          <Input
            ref={searchInputRef}
            data-sidebar-search
            placeholder="Search chats and messages…"
            borderRadius="lg"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setTerm('');
            }}
            aria-label="Search chats and messages"
          />
          {term && (
            <InputRightElement>
              <IconButton
                aria-label="Clear search"
                icon={<FiX />}
                size="xs"
                variant="ghost"
                onClick={() => setTerm('')}
              />
            </InputRightElement>
          )}
        </InputGroup>
      </Box>

      {/* chat list + search results */}
      <Box flex="1" overflowY="auto" px={2} pb={4}>
        {chats.isLoading && <ChatListSkeleton />}

        {chats.isError && (
          <EmptyState
            icon={FiMessageCircle}
            title="Could not load chats"
            description="Check your connection and try again."
            actionLabel="Retry"
            onAction={() => void chats.refetch()}
          />
        )}

        {!chats.isLoading && filteredChats.length === 0 && !debouncedTerm && (
          <EmptyState
            icon={FiMessageCircle}
            title={archived ? 'No archived chats' : 'No conversations yet'}
            description={
              archived
                ? 'Chats you archive will be kept here.'
                : 'Start a new conversation or create a group.'
            }
            actionLabel={archived ? undefined : 'Start a new conversation'}
            onAction={archived ? undefined : newChat.onOpen}
          />
        )}

        {/* archived entry point */}
        {!archived && !debouncedTerm && (archivedSummary.data?.count ?? 0) > 0 && (
          <HStack
            as={NextLink}
            href="/chat/archived"
            px={3}
            py={2.5}
            mb={1}
            borderRadius="lg"
            spacing={3}
            _hover={{ bg: hoverBg }}
          >
            <Box
              boxSize="40px"
              borderRadius="full"
              display="grid"
              placeItems="center"
              bg="blackAlpha.100"
              _dark={{ bg: 'whiteAlpha.200' }}
            >
              <Icon as={FiArchive} color="gray.500" aria-hidden />
            </Box>
            <Text fontSize="sm" fontWeight="medium" flex="1">
              Archived
            </Text>
            {(archivedSummary.data?.unreadCount ?? 0) > 0 && (
              <Badge colorScheme="brand" borderRadius="full" fontSize="0.65rem">
                {archivedSummary.data?.unreadCount}
              </Badge>
            )}
            <Text fontSize="xs" color="gray.500">
              {archivedSummary.data?.count}
            </Text>
          </HStack>
        )}

        {pinned.length > 0 && (
          <>
            <Text px={3} py={1} fontSize="0.65rem" fontWeight="bold" color="gray.500" textTransform="uppercase">
              Pinned
            </Text>
            <VStack align="stretch" spacing={0.5} mb={2}>
              {pinned.map((chat) => (
                <ChatListItem key={chat.id} chat={chat} isActive={params?.chatId === chat.id} />
              ))}
            </VStack>
            {regular.length > 0 && <Divider mb={2} />}
          </>
        )}

        <VStack align="stretch" spacing={0.5}>
          {regular.map((chat: Chat) => (
            <ChatListItem key={chat.id} chat={chat} isActive={params?.chatId === chat.id} />
          ))}
        </VStack>

        {debouncedTerm.length >= 2 && (
          <>
            <Divider my={3} />
            <HStack px={2} mb={1} justify="space-between">
              <Text fontSize="xs" fontWeight="semibold" color="gray.500">
                MESSAGES
              </Text>
              {messageSearch.data && (
                <Tag size="sm" borderRadius="full" fontSize="0.6rem">
                  {messageSearch.data.total}
                </Tag>
              )}
            </HStack>

            {messageSearch.isFetching && (
              <HStack justify="center" py={4}>
                <Spinner size="sm" />
              </HStack>
            )}

            {messageSearch.data?.items.length === 0 && !messageSearch.isFetching && (
              <EmptyState compact icon={FiSearch} title="No messages found" />
            )}

            <VStack align="stretch" spacing={0.5}>
              {messageSearch.data?.items.map((result) => (
                <Box
                  key={result.id}
                  as="button"
                  type="button"
                  textAlign="left"
                  px={3}
                  py={2}
                  borderRadius="lg"
                  _hover={{ bg: hoverBg }}
                  onClick={() => handleSearchResult(result)}
                >
                  <HStack justify="space-between" align="baseline">
                    <Text fontSize="sm" fontWeight="semibold" noOfLines={1}>
                      {result.chat.type === 'GROUP'
                        ? (result.chat.name ?? 'Group')
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
                    {splitOnMatch(result.content ?? '', debouncedTerm).map((segment, index) => (
                      <Box
                        key={index}
                        as={segment.match ? 'mark' : 'span'}
                        bg={segment.match ? 'yellow.200' : undefined}
                        color={segment.match ? 'gray.900' : undefined}
                        borderRadius="sm"
                      >
                        {segment.text}
                      </Box>
                    ))}
                  </Text>
                </Box>
              ))}
            </VStack>
          </>
        )}
      </Box>

      <Box px={2} pb={2} borderTopWidth="1px" borderColor={borderColor} pt={2}>
        <HStack
          as="button"
          type="button"
          w="100%"
          px={2}
          py={1.5}
          borderRadius="md"
          spacing={2}
          _hover={{ bg: hoverBg }}
          onClick={starred.onOpen}
        >
          <Icon as={FiStar} boxSize={3.5} color="gray.500" aria-hidden />
          <Text fontSize="xs" color="gray.500">
            Starred messages
          </Text>
        </HStack>
      </Box>

      <NewChatModal isOpen={newChat.isOpen} onClose={newChat.onClose} />
      <NewGroupModal isOpen={newGroup.isOpen} onClose={newGroup.onClose} />
      <StarredMessagesDrawer isOpen={starred.isOpen} onClose={starred.onClose} />
    </>
  );
}
