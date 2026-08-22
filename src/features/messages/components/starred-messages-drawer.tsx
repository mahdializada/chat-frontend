'use client';

import {
  Box,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  HStack,
  Icon,
  IconButton,
  Text,
  Tooltip,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { FiStar, FiX } from 'react-icons/fi';
import { EmptyState } from '@/components/shared/empty-state';
import { ListRowsSkeleton } from '@/components/shared/skeletons';
import { UserAvatar } from '@/components/shared/user-avatar';
import { useAuthStore } from '@/store/auth-store';
import { formatFullDate, fullName, messagePreview } from '@/utils/format';
import { useStarredMessages, useToggleStar } from '../hooks/use-messages';
import type { StarredMessageResult } from '@/types/api';

interface StarredMessagesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Restrict to a single conversation when opened from a chat. */
  chatId?: string;
}

/** Per-user starred messages — never shared with other participants. */
export function StarredMessagesDrawer({ isOpen, onClose, chatId }: StarredMessagesDrawerProps) {
  const starred = useStarredMessages(chatId, isOpen);
  const router = useRouter();

  return (
    <Drawer isOpen={isOpen} onClose={onClose} placement="right" size="sm">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader fontSize="md">Starred messages</DrawerHeader>
        <DrawerBody pb={8}>
          {starred.isLoading ? (
            <ListRowsSkeleton />
          ) : (starred.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={FiStar}
              title="No starred messages"
              description="Star a message to keep it here for quick access. Only you can see your stars."
            />
          ) : (
            <VStack align="stretch" spacing={2}>
              {starred.data?.map((entry) => (
                <StarredRow
                  key={entry.message.id}
                  entry={entry}
                  onOpen={() => {
                    onClose();
                    router.push(`/chat/${entry.chat.id}?around=${entry.message.id}`);
                  }}
                />
              ))}
            </VStack>
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

function StarredRow({ entry, onOpen }: { entry: StarredMessageResult; onOpen: () => void }) {
  const user = useAuthStore((s) => s.user);
  const toggleStar = useToggleStar(entry.chat.id);
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200');
  const hoverBg = useColorModeValue('gray.50', 'whiteAlpha.100');

  const chatLabel =
    entry.chat.type === 'GROUP'
      ? (entry.chat.name ?? 'Group')
      : fullName(entry.chat.members.find((m) => m.userId !== user?.id)?.user ?? null);

  return (
    <Box borderWidth="1px" borderColor={borderColor} borderRadius="lg" p={2.5} _hover={{ bg: hoverBg }}>
      <HStack align="flex-start" spacing={3}>
        <UserAvatar user={entry.message.sender} size="xs" />
        <Box flex="1" minW={0} as="button" type="button" textAlign="left" onClick={onOpen}>
          <HStack justify="space-between" align="baseline" spacing={2}>
            <Text fontSize="xs" fontWeight="semibold" noOfLines={1}>
              {entry.message.senderId === user?.id
                ? 'You'
                : fullName(entry.message.sender)}
            </Text>
            <Text fontSize="0.65rem" color="gray.500" flexShrink={0}>
              {formatFullDate(entry.message.createdAt)}
            </Text>
          </HStack>
          <Text fontSize="xs" color="gray.500" noOfLines={1} mb={1}>
            in {chatLabel}
          </Text>
          <Text fontSize="sm" noOfLines={3}>
            {messagePreview(entry.message, user?.id)}
          </Text>
        </Box>
        <Tooltip label="Remove star">
          <IconButton
            aria-label="Remove star"
            icon={<Icon as={FiX} />}
            size="xs"
            variant="ghost"
            onClick={() => toggleStar.mutate({ message: entry.message })}
          />
        </Tooltip>
      </HStack>
    </Box>
  );
}
