'use client';

import {
  Badge,
  Box,
  Button,
  Center,
  Divider,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  HStack,
  Icon,
  Spinner,
  Text,
  useColorModeValue,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  FiAlertTriangle,
  FiBellOff,
  FiBell,
  FiDownload,
  FiMessageSquare,
  FiSearch,
  FiSlash,
  FiTrash2,
  FiUserCheck,
  FiUserX,
} from 'react-icons/fi';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { UserAvatar } from '@/components/shared/user-avatar';
import { SharedMediaPanel } from '@/features/media/components/shared-media-panel';
import {
  useClearChat,
  useCreateDirectChat,
  useMuteChat,
} from '@/features/chats/hooks/use-chats';
import { chatsService } from '@/features/chats/services/chats-service';
import { getApiErrorMessage } from '@/lib/api-client';
import { resolvePresence, useChatUiStore } from '@/store/chat-ui-store';
import { formatLastSeen, fullName } from '@/utils/format';
import type { Chat } from '@/types/api';
import { useBlockUser, useContactProfile } from '../hooks/use-users';
import { CommonGroupsList } from './common-groups-list';
import { ReportDialog } from './report-dialog';

interface ContactProfileDrawerProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
  /** The direct chat this profile was opened from, when there is one. */
  chat?: Chat | null;
  onSearchInConversation?: () => void;
  onOpenMessage?: (messageId: string) => void;
}

/**
 * Contact info panel: profile header, actions, shared media and groups in common.
 * Everything shown here respects the contact's privacy settings — the server
 * omits fields the viewer is not allowed to see.
 */
export function ContactProfileDrawer({
  userId,
  isOpen,
  onClose,
  chat,
  onSearchInConversation,
  onOpenMessage,
}: ContactProfileDrawerProps) {
  const router = useRouter();
  const toast = useToast();
  const presence = useChatUiStore((s) => s.presence);

  const profile = useContactProfile(isOpen ? userId : null);
  const createDirect = useCreateDirectChat();
  const blockUser = useBlockUser();
  const muteChat = useMuteChat(chat?.id ?? '');
  const clearChat = useClearChat(chat?.id ?? '');

  const blockConfirm = useDisclosure();
  const clearConfirm = useDisclosure();
  const reportDialog = useDisclosure();
  const [reported, setReported] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const sectionBg = useColorModeValue('white', 'gray.750');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200');

  const data = profile.data;
  const user = data?.user;
  const live = user ? resolvePresence(user, presence) : null;
  const isBlockedByMe = data?.blockState.blockedByMe ?? false;

  const onError = (error: unknown): void => {
    toast({ title: getApiErrorMessage(error), status: 'error', duration: 4000 });
  };

  const openConversation = (): void => {
    if (!userId) return;
    if (data?.directChatId) {
      onClose();
      router.push(`/chat/${data.directChatId}`);
      return;
    }
    createDirect.mutate(userId, {
      onSuccess: (created) => {
        onClose();
        router.push(`/chat/${created.id}`);
      },
      onError,
    });
  };

  const toggleBlock = (): void => {
    if (!userId) return;
    blockUser.mutate(
      { userId, block: !isBlockedByMe },
      {
        onSuccess: () => {
          toast({
            title: isBlockedByMe ? 'Contact unblocked' : 'Contact blocked',
            description: isBlockedByMe
              ? 'You can message each other again.'
              : 'They can no longer message you or see your activity.',
            status: 'success',
            duration: 3000,
          });
          blockConfirm.onClose();
        },
        onError,
      },
    );
  };

  const exportChat = async (): Promise<void> => {
    if (!chat) return;
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

  const statusLine = (): string => {
    if (!data) return '';
    if (isBlockedByMe) return 'Blocked';
    if (!data.visibility.online && !data.visibility.lastSeen) return 'Status hidden';
    if (live?.isOnline && data.visibility.online) return 'online';
    if (data.visibility.lastSeen) return formatLastSeen(live?.lastSeen ?? null);
    return 'offline';
  };

  return (
    <>
      <Drawer isOpen={isOpen} onClose={onClose} placement="right" size="sm">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader fontSize="md">Contact info</DrawerHeader>

          <DrawerBody pb={8} px={{ base: 3, md: 5 }}>
            {profile.isLoading ? (
              <Center py={12}>
                <Spinner color="brand.500" />
              </Center>
            ) : !data || !user ? (
              <Center py={12}>
                <Text fontSize="sm" color="gray.500">
                  This profile is unavailable.
                </Text>
              </Center>
            ) : (
              <VStack align="stretch" spacing={5}>
                {/* header */}
                <VStack spacing={2} py={2}>
                  <UserAvatar user={user} size="2xl" />
                  <Text fontSize="xl" fontWeight="bold" textAlign="center">
                    {fullName(user)}
                  </Text>
                  <Text fontSize="sm" color="gray.500">
                    @{user.username}
                  </Text>
                  <HStack spacing={2}>
                    {isBlockedByMe && (
                      <Badge colorScheme="red" fontSize="0.65rem">
                        Blocked
                      </Badge>
                    )}
                    <Text
                      fontSize="sm"
                      color={live?.isOnline && data.visibility.online ? 'green.400' : 'gray.500'}
                    >
                      {statusLine()}
                    </Text>
                  </HStack>
                </VStack>

                {/* quick actions */}
                <HStack spacing={2} justify="center">
                  <ActionButton icon={FiMessageSquare} label="Message" onClick={openConversation} />
                  {chat && onSearchInConversation && (
                    <ActionButton
                      icon={FiSearch}
                      label="Search"
                      onClick={() => {
                        onClose();
                        onSearchInConversation();
                      }}
                    />
                  )}
                  {chat && (
                    <ActionButton
                      icon={chat.settings.isMuted ? FiBell : FiBellOff}
                      label={chat.settings.isMuted ? 'Unmute' : 'Mute'}
                      onClick={() =>
                        muteChat.mutate(
                          { duration: chat.settings.isMuted ? undefined : 'forever' },
                          { onError },
                        )
                      }
                    />
                  )}
                </HStack>

                {/* about */}
                <Section bg={sectionBg} borderColor={borderColor} title="About">
                  <Text fontSize="sm" color={user.bio ? undefined : 'gray.500'}>
                    {user.bio ??
                      (data.visibility.about ? 'No about set' : 'Hidden by privacy settings')}
                  </Text>
                </Section>

                {/* shared media (only when a conversation exists) */}
                {chat && (
                  <Section
                    bg={sectionBg}
                    borderColor={borderColor}
                    title="Media, links and docs"
                  >
                    <SharedMediaPanel
                      chatId={chat.id}
                      onOpenMessage={(messageId) => {
                        onClose();
                        onOpenMessage?.(messageId);
                      }}
                    />
                  </Section>
                )}

                {/* groups in common */}
                <Section bg={sectionBg} borderColor={borderColor} title="Groups in common">
                  <CommonGroupsList
                    userId={user.id}
                    enabled={isOpen}
                    onOpenGroup={(chatId) => {
                      onClose();
                      router.push(`/chat/${chatId}`);
                    }}
                  />
                </Section>

                <Divider />

                {/* destructive actions */}
                <VStack align="stretch" spacing={1}>
                  {chat && (
                    <DangerRow
                      icon={FiDownload}
                      tone="brand"
                      label={isExporting ? 'Preparing export…' : 'Export chat'}
                      description="Download this conversation as a text transcript"
                      onClick={() => void exportChat()}
                      isDisabled={isExporting}
                    />
                  )}
                  {chat && (
                    <DangerRow
                      icon={FiTrash2}
                      label="Clear chat"
                      description="Removes this conversation's history for you only"
                      onClick={clearConfirm.onOpen}
                    />
                  )}
                  <DangerRow
                    icon={isBlockedByMe ? FiUserCheck : FiUserX}
                    label={isBlockedByMe ? `Unblock ${user.firstName}` : `Block ${user.firstName}`}
                    description={
                      isBlockedByMe
                        ? 'Allow messages and calls again'
                        : 'They can no longer message you'
                    }
                    onClick={blockConfirm.onOpen}
                    tone={isBlockedByMe ? 'brand' : 'red'}
                  />
                  <DangerRow
                    icon={FiAlertTriangle}
                    label={reported ? 'Reported' : `Report ${user.firstName}`}
                    description={
                      reported
                        ? 'Our team is reviewing this account'
                        : 'Send this account to moderation for review'
                    }
                    onClick={reportDialog.onOpen}
                    isDisabled={reported}
                  />
                </VStack>
              </VStack>
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <ConfirmDialog
        isOpen={blockConfirm.isOpen}
        onClose={blockConfirm.onClose}
        onConfirm={toggleBlock}
        isLoading={blockUser.isPending}
        title={isBlockedByMe ? 'Unblock contact?' : 'Block contact?'}
        body={
          isBlockedByMe
            ? `${user ? fullName(user) : 'This contact'} will be able to message you again.`
            : `${user ? fullName(user) : 'This contact'} will no longer be able to message you, and will not see your online status or profile details. They are not told that you blocked them.`
        }
        confirmLabel={isBlockedByMe ? 'Unblock' : 'Block'}
      />

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
        body="Every message in this conversation will be hidden for you. The other person keeps their copy. This cannot be undone."
        confirmLabel="Clear chat"
      />

      <ReportDialog
        userId={userId}
        userName={user ? fullName(user) : 'this contact'}
        chatId={chat?.id}
        isOpen={reportDialog.isOpen}
        onClose={reportDialog.onClose}
        onReported={() => setReported(true)}
      />
    </>
  );
}

function Section({
  title,
  children,
  bg,
  borderColor,
}: {
  title: string;
  children: React.ReactNode;
  bg: string;
  borderColor: string;
}) {
  return (
    <Box borderWidth="1px" borderColor={borderColor} borderRadius="lg" bg={bg} p={3}>
      <Text
        fontSize="xs"
        fontWeight="bold"
        color="gray.500"
        textTransform="uppercase"
        mb={2}
        letterSpacing="wide"
      >
        {title}
      </Text>
      {children}
    </Box>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: typeof FiMessageSquare;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      h="auto"
      py={2.5}
      px={4}
      flexDirection="column"
      gap={1}
      onClick={onClick}
    >
      <Icon as={icon} boxSize={4} aria-hidden />
      <Text fontSize="xs">{label}</Text>
    </Button>
  );
}

function DangerRow({
  icon,
  label,
  description,
  onClick,
  tone = 'red',
  isDisabled = false,
}: {
  icon: typeof FiSlash;
  label: string;
  description: string;
  onClick: () => void;
  tone?: 'red' | 'brand';
  isDisabled?: boolean;
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
      opacity={isDisabled ? 0.6 : 1}
      cursor={isDisabled ? 'default' : 'pointer'}
      _hover={isDisabled ? undefined : { bg: 'blackAlpha.50', _dark: { bg: 'whiteAlpha.100' } }}
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
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
