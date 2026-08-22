'use client';

import {
  Box,
  Center,
  HStack,
  Icon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react';
import { FiCheck, FiEye } from 'react-icons/fi';
import { UserAvatar } from '@/components/shared/user-avatar';
import { useMessageReceipts } from '../hooks/use-messages';
import { formatFullDate, fullName } from '@/utils/format';

interface ReadByDialogProps {
  messageId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

/** Group "Read by" sheet — only the sender can open it. */
export function ReadByDialog({ messageId, isOpen, onClose }: ReadByDialogProps) {
  const receipts = useMessageReceipts(isOpen ? messageId : null);

  const read = receipts.data?.filter((receipt) => receipt.readAt) ?? [];
  const delivered = receipts.data?.filter((receipt) => !receipt.readAt && receipt.deliveredAt) ?? [];
  const pending = receipts.data?.filter((receipt) => !receipt.deliveredAt) ?? [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" isCentered>
      <ModalOverlay />
      <ModalContent mx={4}>
        <ModalHeader fontSize="md">Message info</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={5}>
          {receipts.isLoading ? (
            <Center py={8}>
              <Spinner size="sm" />
            </Center>
          ) : (
            <VStack align="stretch" spacing={4} maxH="360px" overflowY="auto">
              <ReceiptGroup
                icon={FiEye}
                label="Read by"
                color="cyan.400"
                entries={read.map((r) => ({ user: r.user, at: r.readAt }))}
                emptyLabel="Nobody has read this yet"
              />
              {delivered.length > 0 && (
                <ReceiptGroup
                  icon={FiCheck}
                  label="Delivered to"
                  color="gray.400"
                  entries={delivered.map((r) => ({ user: r.user, at: r.deliveredAt }))}
                />
              )}
              {pending.length > 0 && (
                <ReceiptGroup
                  icon={FiCheck}
                  label="Pending"
                  color="gray.400"
                  entries={pending.map((r) => ({ user: r.user, at: null }))}
                />
              )}
            </VStack>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

function ReceiptGroup({
  icon,
  label,
  color,
  entries,
  emptyLabel,
}: {
  icon: typeof FiEye;
  label: string;
  color: string;
  entries: { user: { id: string; firstName: string; lastName: string; avatar: string | null }; at: string | null }[];
  emptyLabel?: string;
}) {
  return (
    <Box>
      <HStack spacing={2} mb={2}>
        <Icon as={icon} color={color} boxSize={3.5} aria-hidden />
        <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase">
          {label} {entries.length > 0 && `· ${entries.length}`}
        </Text>
      </HStack>
      {entries.length === 0 ? (
        <Text fontSize="sm" color="gray.500" pl={5}>
          {emptyLabel}
        </Text>
      ) : (
        <VStack align="stretch" spacing={1}>
          {entries.map((entry) => (
            <HStack key={entry.user.id} spacing={3} py={1}>
              <UserAvatar user={entry.user} size="xs" />
              <Text fontSize="sm" flex="1" noOfLines={1}>
                {fullName(entry.user)}
              </Text>
              {entry.at && (
                <Text fontSize="xs" color="gray.500" flexShrink={0}>
                  {formatFullDate(entry.at)}
                </Text>
              )}
            </HStack>
          ))}
        </VStack>
      )}
    </Box>
  );
}
