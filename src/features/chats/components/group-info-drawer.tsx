'use client';

import {
  Badge,
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Editable,
  EditableInput,
  EditablePreview,
  EditableTextarea,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { useState } from 'react';
import { FiMoreVertical, FiSearch, FiUserPlus } from 'react-icons/fi';
import { UserAvatar } from '@/components/shared/user-avatar';
import { useUserSearch } from '@/features/users/hooks/use-user-search';
import { getApiErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { resolvePresence, useChatUiStore } from '@/store/chat-ui-store';
import { fullName } from '@/utils/format';
import type { Chat, MemberRole } from '@/types/api';
import {
  useAddMembers,
  useRemoveMember,
  useUpdateChat,
  useUpdateMemberRole,
} from '../hooks/use-chats';

interface GroupInfoDrawerProps {
  chat: Chat;
  isOpen: boolean;
  onClose: () => void;
}

export function GroupInfoDrawer({ chat, isOpen, onClose }: GroupInfoDrawerProps) {
  const user = useAuthStore((s) => s.user);
  const presence = useChatUiStore((s) => s.presence);
  const toast = useToast();

  const updateChat = useUpdateChat(chat.id);
  const addMembers = useAddMembers(chat.id);
  const removeMember = useRemoveMember(chat.id);
  const updateRole = useUpdateMemberRole(chat.id);

  const [isAdding, setIsAdding] = useState(false);
  const [term, setTerm] = useState('');
  const search = useUserSearch(term);

  const myRole: MemberRole = chat.members.find((m) => m.userId === user?.id)?.role ?? 'MEMBER';
  const canManage = myRole === 'OWNER' || myRole === 'ADMIN';
  const isOwner = myRole === 'OWNER';

  const onError = (error: unknown): void => {
    toast({ title: getApiErrorMessage(error), status: 'error', duration: 4000 });
  };

  const candidates =
    search.data?.filter((u) => !chat.members.some((m) => m.userId === u.id)) ?? [];

  return (
    <Drawer isOpen={isOpen} onClose={onClose} placement="right" size="sm">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>Group info</DrawerHeader>
        <DrawerBody pb={8}>
          <VStack align="stretch" spacing={5}>
            {/* name + description (editable for owner/admin) */}
            <Box>
              <Text fontSize="xs" color="gray.500" mb={1}>
                NAME
              </Text>
              <Editable
                key={`name-${chat.name}`}
                defaultValue={chat.name ?? ''}
                isDisabled={!canManage}
                fontWeight="semibold"
                onSubmit={(value) => {
                  const name = value.trim();
                  if (name && name !== chat.name) {
                    updateChat.mutate({ name }, { onError });
                  }
                }}
              >
                <EditablePreview w="100%" />
                <EditableInput />
              </Editable>
            </Box>
            <Box>
              <Text fontSize="xs" color="gray.500" mb={1}>
                DESCRIPTION
              </Text>
              <Editable
                key={`desc-${chat.description}`}
                defaultValue={chat.description ?? ''}
                placeholder="Add a description…"
                isDisabled={!canManage}
                fontSize="sm"
                onSubmit={(value) => {
                  if (value.trim() !== (chat.description ?? '')) {
                    updateChat.mutate({ description: value.trim() }, { onError });
                  }
                }}
              >
                <EditablePreview w="100%" color={chat.description ? undefined : 'gray.500'} />
                <EditableTextarea rows={2} />
              </Editable>
            </Box>

            {/* members */}
            <Box>
              <HStack justify="space-between" mb={2}>
                <Text fontSize="xs" color="gray.500">
                  {chat.members.length} MEMBERS
                </Text>
                {canManage && (
                  <Button
                    size="xs"
                    variant="ghost"
                    leftIcon={<FiUserPlus />}
                    onClick={() => setIsAdding((v) => !v)}
                  >
                    Add
                  </Button>
                )}
              </HStack>

              {isAdding && (
                <Box mb={3}>
                  <InputGroup size="sm">
                    <InputLeftElement pointerEvents="none">
                      <FiSearch color="gray" />
                    </InputLeftElement>
                    <Input
                      placeholder="Search people…"
                      value={term}
                      onChange={(e) => setTerm(e.target.value)}
                      borderRadius="md"
                    />
                  </InputGroup>
                  <VStack align="stretch" spacing={1} maxH="180px" overflowY="auto" mt={2}>
                    {candidates.map((candidate) => (
                      <HStack
                        key={candidate.id}
                        p={1.5}
                        borderRadius="md"
                        cursor="pointer"
                        _hover={{ bg: 'whiteAlpha.200' }}
                        onClick={() =>
                          addMembers.mutate([candidate.id], {
                            onSuccess: () => {
                              setTerm('');
                              setIsAdding(false);
                            },
                            onError,
                          })
                        }
                      >
                        <UserAvatar user={candidate} size="xs" />
                        <Text fontSize="sm">{fullName(candidate)}</Text>
                      </HStack>
                    ))}
                  </VStack>
                </Box>
              )}

              <VStack align="stretch" spacing={1}>
                {chat.members.map((member) => {
                  const live = resolvePresence(member.user, presence);
                  const isSelf = member.userId === user?.id;
                  const canRemove =
                    !isSelf &&
                    (isOwner || (myRole === 'ADMIN' && member.role === 'MEMBER'));
                  const canChangeRole = isOwner && !isSelf && member.role !== 'OWNER';

                  return (
                    <HStack key={member.id} p={1.5} borderRadius="md" spacing={3}>
                      <UserAvatar
                        user={member.user}
                        size="sm"
                        showOnline
                        isOnline={live.isOnline}
                      />
                      <Box flex="1" minW={0}>
                        <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                          {isSelf ? 'You' : fullName(member.user)}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          @{member.user.username}
                        </Text>
                      </Box>
                      {member.role !== 'MEMBER' && (
                        <Badge
                          colorScheme={member.role === 'OWNER' ? 'purple' : 'blue'}
                          fontSize="0.6rem"
                        >
                          {member.role}
                        </Badge>
                      )}
                      {(canRemove || canChangeRole) && (
                        <Menu placement="bottom-end" isLazy>
                          <MenuButton
                            as={IconButton}
                            aria-label="Member options"
                            icon={<FiMoreVertical />}
                            size="xs"
                            variant="ghost"
                          />
                          <MenuList minW="170px">
                            {canChangeRole && (
                              <MenuItem
                                fontSize="sm"
                                onClick={() =>
                                  updateRole.mutate(
                                    {
                                      userId: member.userId,
                                      role: member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN',
                                    },
                                    { onError },
                                  )
                                }
                              >
                                {member.role === 'ADMIN' ? 'Demote to member' : 'Make admin'}
                              </MenuItem>
                            )}
                            {canRemove && (
                              <MenuItem
                                fontSize="sm"
                                color="red.400"
                                onClick={() => removeMember.mutate(member.userId, { onError })}
                              >
                                Remove from group
                              </MenuItem>
                            )}
                          </MenuList>
                        </Menu>
                      )}
                    </HStack>
                  );
                })}
              </VStack>
            </Box>
          </VStack>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
