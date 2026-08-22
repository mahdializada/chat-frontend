'use client';

import {
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
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
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Switch,
  Text,
  Tooltip,
  useColorModeValue,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  FiBell,
  FiBellOff,
  FiCamera,
  FiDownload,
  FiLogOut,
  FiMoreVertical,
  FiSearch,
  FiTrash2,
  FiUserPlus,
} from 'react-icons/fi';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { UserAvatar } from '@/components/shared/user-avatar';
import { SharedMediaPanel } from '@/features/media/components/shared-media-panel';
import { useUserSearch } from '@/features/users/hooks/use-user-search';
import { getApiErrorMessage } from '@/lib/api-client';
import { absoluteUrl } from '@/lib/env';
import { uploadsService } from '@/services/uploads-service';
import { useAuthStore } from '@/store/auth-store';
import { resolvePresence, useChatUiStore } from '@/store/chat-ui-store';
import { formatFullDate, fullName } from '@/utils/format';
import type { Chat, MemberRole } from '@/types/api';
import {
  useAddMembers,
  useClearChat,
  useDeleteChat,
  useMuteChat,
  useRemoveMember,
  useTransferOwnership,
  useUpdateChat,
  useUpdateMemberRole,
} from '../hooks/use-chats';
import { chatsService } from '../services/chats-service';
import { InviteLinkSection } from './invite-link-section';

interface GroupInfoDrawerProps {
  chat: Chat;
  isOpen: boolean;
  onClose: () => void;
  onSearchInConversation?: () => void;
  onOpenMessage?: (messageId: string) => void;
  onOpenProfile?: (userId: string) => void;
}

export function GroupInfoDrawer({
  chat,
  isOpen,
  onClose,
  onSearchInConversation,
  onOpenMessage,
  onOpenProfile,
}: GroupInfoDrawerProps) {
  const user = useAuthStore((s) => s.user);
  const presence = useChatUiStore((s) => s.presence);
  const router = useRouter();
  const toast = useToast();

  const updateChat = useUpdateChat(chat.id);
  const addMembers = useAddMembers(chat.id);
  const removeMember = useRemoveMember(chat.id);
  const updateRole = useUpdateMemberRole(chat.id);
  const transferOwnership = useTransferOwnership(chat.id);
  const muteChat = useMuteChat(chat.id);
  const clearChat = useClearChat(chat.id);
  const deleteChat = useDeleteChat();

  const [isAdding, setIsAdding] = useState(false);
  const [term, setTerm] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const search = useUserSearch(term);

  const leaveConfirm = useDisclosure();
  const deleteConfirm = useDisclosure();
  const clearConfirm = useDisclosure();
  const [transferTarget, setTransferTarget] = useState<{ id: string; name: string } | null>(null);

  const sectionBg = useColorModeValue('white', 'gray.750');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200');

  const myRole: MemberRole = chat.members.find((m) => m.userId === user?.id)?.role ?? 'MEMBER';
  const isOwner = myRole === 'OWNER';
  const isAdmin = myRole === 'ADMIN';
  const canManageMembers = isOwner || isAdmin;
  const canEditInfo = isOwner || isAdmin || chat.membersCanEditInfo;

  const creator = chat.members.find((m) => m.userId === chat.createdById)?.user ?? null;
  const admins = chat.members.filter((m) => m.role !== 'MEMBER');
  const regularMembers = chat.members.filter((m) => m.role === 'MEMBER');

  const onError = (error: unknown): void => {
    toast({ title: getApiErrorMessage(error), status: 'error', duration: 4000 });
  };

  const candidates = search.data?.filter((u) => !chat.members.some((m) => m.userId === u.id)) ?? [];

  const exportChat = async (): Promise<void> => {
    setIsExporting(true);
    try {
      await chatsService.exportChat(chat.id, 'txt');
      toast({ title: 'Chat exported', status: 'success', duration: 3000 });
    } catch (error) {
      onError(error);
    } finally {
      setIsExporting(false);
    }
  };

  const uploadAvatar = async (file: File): Promise<void> => {
    setUploadingAvatar(true);
    try {
      const uploaded = await uploadsService.upload(file);
      updateChat.mutate({ avatar: uploaded.url }, { onError });
    } catch (error) {
      onError(error);
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <>
      <Drawer isOpen={isOpen} onClose={onClose} placement="right" size="sm">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader fontSize="md">Group info</DrawerHeader>

          <DrawerBody pb={8} px={{ base: 3, md: 5 }}>
            <VStack align="stretch" spacing={5}>
              {/* header */}
              <VStack spacing={2} py={2}>
                <Box position="relative">
                  <Avatar
                    size="2xl"
                    name={chat.name ?? 'Group'}
                    src={chat.avatar ? absoluteUrl(chat.avatar) : undefined}
                  />
                  {canEditInfo && (
                    <>
                      <IconButton
                        as="label"
                        htmlFor="group-avatar-input"
                        aria-label="Change group photo"
                        icon={<FiCamera />}
                        size="sm"
                        borderRadius="full"
                        position="absolute"
                        bottom={0}
                        right={0}
                        isLoading={uploadingAvatar}
                        cursor="pointer"
                      />
                      <input
                        id="group-avatar-input"
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void uploadAvatar(file);
                          event.target.value = '';
                        }}
                      />
                    </>
                  )}
                </Box>

                <Editable
                  key={`name-${chat.name}`}
                  defaultValue={chat.name ?? ''}
                  isDisabled={!canEditInfo}
                  fontSize="xl"
                  fontWeight="bold"
                  textAlign="center"
                  onSubmit={(value) => {
                    const name = value.trim();
                    if (name && name !== chat.name) updateChat.mutate({ name }, { onError });
                  }}
                >
                  <EditablePreview px={2} />
                  <EditableInput textAlign="center" />
                </Editable>

                <Text fontSize="sm" color="gray.500">
                  Group · {chat.members.length} member{chat.members.length === 1 ? '' : 's'}
                </Text>
              </VStack>

              {/* quick actions */}
              <HStack spacing={2} justify="center">
                {onSearchInConversation && (
                  <Button
                    variant="ghost"
                    size="sm"
                    h="auto"
                    py={2.5}
                    px={4}
                    flexDirection="column"
                    gap={1}
                    onClick={() => {
                      onClose();
                      onSearchInConversation();
                    }}
                  >
                    <Icon as={FiSearch} boxSize={4} aria-hidden />
                    <Text fontSize="xs">Search</Text>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  h="auto"
                  py={2.5}
                  px={4}
                  flexDirection="column"
                  gap={1}
                  onClick={() =>
                    muteChat.mutate(
                      { duration: chat.settings.isMuted ? undefined : 'forever' },
                      { onError },
                    )
                  }
                >
                  <Icon as={chat.settings.isMuted ? FiBell : FiBellOff} boxSize={4} aria-hidden />
                  <Text fontSize="xs">{chat.settings.isMuted ? 'Unmute' : 'Mute'}</Text>
                </Button>
              </HStack>

              {/* description */}
              <Section bg={sectionBg} borderColor={borderColor} title="Description">
                <Editable
                  key={`desc-${chat.description}`}
                  defaultValue={chat.description ?? ''}
                  placeholder="Add a group description…"
                  isDisabled={!canEditInfo}
                  fontSize="sm"
                  onSubmit={(value) => {
                    if (value.trim() !== (chat.description ?? '')) {
                      updateChat.mutate({ description: value.trim() }, { onError });
                    }
                  }}
                >
                  <EditablePreview w="100%" color={chat.description ? undefined : 'gray.500'} />
                  <EditableTextarea rows={3} />
                </Editable>

                <Divider my={3} />
                <VStack align="stretch" spacing={1}>
                  <Text fontSize="xs" color="gray.500">
                    Created {formatFullDate(chat.createdAt)}
                    {creator ? ` by ${creator.id === user?.id ? 'you' : fullName(creator)}` : ''}
                  </Text>
                </VStack>
              </Section>

              {/* shared media */}
              <Section bg={sectionBg} borderColor={borderColor} title="Media, links and docs">
                <SharedMediaPanel
                  chatId={chat.id}
                  onOpenMessage={(messageId) => {
                    onClose();
                    onOpenMessage?.(messageId);
                  }}
                />
              </Section>

              {/* invite link */}
              {canManageMembers && (
                <Section bg={sectionBg} borderColor={borderColor} title="Invite link">
                  <InviteLinkSection chatId={chat.id} canManage={canManageMembers} isOpen={isOpen} />
                </Section>
              )}

              {/* permissions (owner only) */}
              {isOwner && (
                <Section bg={sectionBg} borderColor={borderColor} title="Group permissions">
                  <VStack align="stretch" spacing={3}>
                    <PermissionToggle
                      label="Members can send messages"
                      helper="Turn off to make this an announcement group"
                      isChecked={chat.membersCanSend}
                      onChange={(value) => updateChat.mutate({ membersCanSend: value }, { onError })}
                    />
                    <PermissionToggle
                      label="Members can edit group info"
                      helper="Name, description and photo"
                      isChecked={chat.membersCanEditInfo}
                      onChange={(value) =>
                        updateChat.mutate({ membersCanEditInfo: value }, { onError })
                      }
                    />
                    <PermissionToggle
                      label="Members can use @everyone"
                      helper="Notify every member at once"
                      isChecked={chat.membersCanMentionAll}
                      onChange={(value) =>
                        updateChat.mutate({ membersCanMentionAll: value }, { onError })
                      }
                    />
                  </VStack>
                </Section>
              )}

              {/* members */}
              <Section
                bg={sectionBg}
                borderColor={borderColor}
                title={`${chat.members.length} members`}
                action={
                  canManageMembers ? (
                    <Button
                      size="xs"
                      variant="ghost"
                      leftIcon={<FiUserPlus />}
                      onClick={() => setIsAdding((value) => !value)}
                    >
                      Add
                    </Button>
                  ) : undefined
                }
              >
                {isAdding && (
                  <Box mb={3}>
                    <InputGroup size="sm">
                      <InputLeftElement pointerEvents="none">
                        <Icon as={FiSearch} color="gray.400" aria-hidden />
                      </InputLeftElement>
                      <Input
                        autoFocus
                        placeholder="Search people…"
                        value={term}
                        onChange={(event) => setTerm(event.target.value)}
                        borderRadius="md"
                        aria-label="Search people to add"
                      />
                    </InputGroup>
                    <VStack align="stretch" spacing={1} maxH="180px" overflowY="auto" mt={2}>
                      {candidates.map((candidate) => (
                        <HStack
                          key={candidate.id}
                          as="button"
                          type="button"
                          p={1.5}
                          borderRadius="md"
                          _hover={{ bg: 'blackAlpha.50', _dark: { bg: 'whiteAlpha.200' } }}
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
                          <Text fontSize="xs" color="gray.500">
                            @{candidate.username}
                          </Text>
                        </HStack>
                      ))}
                      {term.trim().length >= 2 && candidates.length === 0 && !search.isFetching && (
                        <Text fontSize="sm" color="gray.500" py={2}>
                          No matching people
                        </Text>
                      )}
                    </VStack>
                  </Box>
                )}

                <VStack align="stretch" spacing={1}>
                  {[...admins, ...regularMembers].map((member) => {
                    const live = resolvePresence(member.user, presence);
                    const isSelf = member.userId === user?.id;
                    const canRemove =
                      !isSelf && (isOwner || (isAdmin && member.role === 'MEMBER'));
                    const canChangeRole = isOwner && !isSelf && member.role !== 'OWNER';

                    return (
                      <HStack key={member.id} p={1.5} borderRadius="md" spacing={3}>
                        <UserAvatar
                          user={member.user}
                          size="sm"
                          showOnline
                          isOnline={live.isOnline}
                          onClick={
                            !isSelf && onOpenProfile
                              ? () => {
                                  onClose();
                                  onOpenProfile(member.userId);
                                }
                              : undefined
                          }
                        />
                        <Box flex="1" minW={0}>
                          <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                            {isSelf ? 'You' : fullName(member.user)}
                          </Text>
                          <Text fontSize="xs" color="gray.500" noOfLines={1}>
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
                        {(canRemove || canChangeRole || (!isSelf && onOpenProfile)) && (
                          <Menu placement="bottom-end" isLazy>
                            <MenuButton
                              as={IconButton}
                              aria-label={`Options for ${fullName(member.user)}`}
                              icon={<FiMoreVertical />}
                              size="xs"
                              variant="ghost"
                            />
                            <MenuList minW="190px">
                              {!isSelf && onOpenProfile && (
                                <MenuItem
                                  fontSize="sm"
                                  onClick={() => {
                                    onClose();
                                    onOpenProfile(member.userId);
                                  }}
                                >
                                  View profile
                                </MenuItem>
                              )}
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
                                  {member.role === 'ADMIN' ? 'Dismiss as admin' : 'Make admin'}
                                </MenuItem>
                              )}
                              {isOwner && !isSelf && (
                                <MenuItem
                                  fontSize="sm"
                                  onClick={() =>
                                    setTransferTarget({
                                      id: member.userId,
                                      name: fullName(member.user),
                                    })
                                  }
                                >
                                  Transfer ownership
                                </MenuItem>
                              )}
                              {canRemove && (
                                <>
                                  <MenuDivider />
                                  <MenuItem
                                    fontSize="sm"
                                    color="red.400"
                                    onClick={() => removeMember.mutate(member.userId, { onError })}
                                  >
                                    Remove from group
                                  </MenuItem>
                                </>
                              )}
                            </MenuList>
                          </Menu>
                        )}
                      </HStack>
                    );
                  })}
                </VStack>
              </Section>

              <Divider />

              {/* destructive actions */}
              <VStack align="stretch" spacing={1}>
                <DangerRow
                  icon={FiDownload}
                  tone="brand"
                  label={isExporting ? 'Preparing export…' : 'Export chat'}
                  description="Download this group's messages as a text transcript"
                  onClick={() => void exportChat()}
                />
                <DangerRow
                  icon={FiTrash2}
                  label="Clear chat"
                  description="Hide this group's history for you only"
                  onClick={clearConfirm.onOpen}
                />
                <DangerRow
                  icon={FiLogOut}
                  label="Exit group"
                  description="You will stop receiving messages from this group"
                  onClick={leaveConfirm.onOpen}
                />
                {isOwner && (
                  <DangerRow
                    icon={FiTrash2}
                    label="Delete group"
                    description="Permanently removes the group for everyone"
                    onClick={deleteConfirm.onOpen}
                  />
                )}
              </VStack>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

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
        body="Every message will be hidden for you. Other members keep their copies. This cannot be undone."
        confirmLabel="Clear chat"
      />

      <ConfirmDialog
        isOpen={leaveConfirm.isOpen}
        onClose={leaveConfirm.onClose}
        onConfirm={() => {
          if (!user) return;
          removeMember.mutate(user.id, {
            onSuccess: () => {
              leaveConfirm.onClose();
              onClose();
              router.push('/chat');
            },
            onError,
          });
        }}
        isLoading={removeMember.isPending}
        title="Exit group?"
        body={
          isOwner
            ? 'You are the owner. Ownership will pass to the longest-standing admin, or the oldest member if there are no admins.'
            : 'You will no longer receive messages from this group. You can rejoin if someone adds you back or shares an invite link.'
        }
        confirmLabel="Exit"
      />

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={deleteConfirm.onClose}
        onConfirm={() =>
          deleteChat.mutate(chat.id, {
            onSuccess: () => {
              deleteConfirm.onClose();
              onClose();
              router.push('/chat');
            },
            onError,
          })
        }
        isLoading={deleteChat.isPending}
        title="Delete this group?"
        body="The group and all of its messages are removed for every member. This cannot be undone."
        confirmLabel="Delete group"
      />

      <ConfirmDialog
        isOpen={!!transferTarget}
        onClose={() => setTransferTarget(null)}
        onConfirm={() => {
          if (!transferTarget) return;
          transferOwnership.mutate(transferTarget.id, {
            onSuccess: () => {
              toast({ title: `${transferTarget.name} is now the owner`, status: 'success', duration: 3000 });
              setTransferTarget(null);
            },
            onError,
          });
        }}
        isLoading={transferOwnership.isPending}
        title="Transfer ownership?"
        body={`${transferTarget?.name ?? 'This member'} will become the group owner and you will become an admin. You cannot undo this yourself.`}
        confirmLabel="Transfer"
      />
    </>
  );
}

function Section({
  title,
  children,
  bg,
  borderColor,
  action,
}: {
  title: string;
  children: React.ReactNode;
  bg: string;
  borderColor: string;
  action?: React.ReactNode;
}) {
  return (
    <Box borderWidth="1px" borderColor={borderColor} borderRadius="lg" bg={bg} p={3}>
      <HStack justify="space-between" mb={2}>
        <Text
          fontSize="xs"
          fontWeight="bold"
          color="gray.500"
          textTransform="uppercase"
          letterSpacing="wide"
        >
          {title}
        </Text>
        {action}
      </HStack>
      {children}
    </Box>
  );
}

function PermissionToggle({
  label,
  helper,
  isChecked,
  onChange,
}: {
  label: string;
  helper: string;
  isChecked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <HStack justify="space-between" align="flex-start" spacing={3}>
      <Box flex="1" minW={0}>
        <Text fontSize="sm">{label}</Text>
        <Text fontSize="xs" color="gray.500">
          {helper}
        </Text>
      </Box>
      <Switch
        size="sm"
        isChecked={isChecked}
        onChange={(event) => onChange(event.target.checked)}
        aria-label={label}
      />
    </HStack>
  );
}

function DangerRow({
  icon,
  label,
  description,
  onClick,
  tone = 'red',
}: {
  icon: typeof FiTrash2;
  label: string;
  description: string;
  onClick: () => void;
  tone?: 'red' | 'brand';
}) {
  const color = tone === 'red' ? 'red.400' : 'brand.400';
  return (
    <HStack
      as="button"
      type="button"
      spacing={3}
      p={2.5}
      borderRadius="md"
      textAlign="left"
      w="100%"
      _hover={{ bg: 'blackAlpha.50', _dark: { bg: 'whiteAlpha.100' } }}
      onClick={onClick}
    >
      <Icon as={icon} color={color} boxSize={4} aria-hidden />
      <Box flex="1" minW={0}>
        <Text fontSize="sm" fontWeight="medium" color={color}>
          {label}
        </Text>
        <Text fontSize="xs" color="gray.500" noOfLines={2}>
          {description}
        </Text>
      </Box>
    </HStack>
  );
}
