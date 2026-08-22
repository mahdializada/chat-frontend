'use client';

import {
  Box,
  Button,
  Center,
  Checkbox,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Text,
  Textarea,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { useMemo, useState } from 'react';
import { FiCornerUpRight, FiSearch } from 'react-icons/fi';
import { ChatAvatar } from '@/components/shared/chat-avatar';
import { EmptyState } from '@/components/shared/empty-state';
import { useChats } from '@/features/chats/hooks/use-chats';
import { getApiErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { chatDisplayName } from '@/utils/format';
import { useForwardMessages } from '../hooks/use-messages';

interface ForwardDialogProps {
  messageIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onForwarded?: () => void;
}

const MAX_TARGETS = 20;

/** Pick one or more conversations and forward the selected messages. */
export function ForwardDialog({ messageIds, isOpen, onClose, onForwarded }: ForwardDialogProps) {
  const user = useAuthStore((s) => s.user);
  const chats = useChats();
  const forward = useForwardMessages();
  const toast = useToast();

  const [term, setTerm] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [comment, setComment] = useState('');

  const candidates = useMemo(() => {
    const list = chats.data ?? [];
    const lower = term.trim().toLowerCase();
    // Conversations you cannot post into are not offered as destinations.
    const writable = list.filter((chat) => !chat.blockState?.blockedByMe && !chat.blockState?.blockedMe);
    if (!lower) return writable;
    return writable.filter((chat) => chatDisplayName(chat, user).toLowerCase().includes(lower));
  }, [chats.data, term, user]);

  const close = (): void => {
    setSelected([]);
    setTerm('');
    setComment('');
    onClose();
  };

  const submit = (): void => {
    if (selected.length === 0) return;
    forward.mutate(
      { messageIds, chatIds: selected, comment },
      {
        onSuccess: (result) => {
          toast({
            title: `Forwarded to ${selected.length} chat${selected.length === 1 ? '' : 's'}`,
            description: `${result.forwarded} message${result.forwarded === 1 ? '' : 's'} sent`,
            status: 'success',
            duration: 3000,
          });
          onForwarded?.();
          close();
        },
        onError: (error) =>
          toast({ title: getApiErrorMessage(error), status: 'error', duration: 4000 }),
      },
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={close} size="md" isCentered>
      <ModalOverlay />
      <ModalContent mx={4}>
        <ModalHeader fontSize="md">
          Forward {messageIds.length} message{messageIds.length === 1 ? '' : 's'}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <InputGroup size="sm" mb={3}>
            <InputLeftElement pointerEvents="none">
              <Icon as={FiSearch} color="gray.400" aria-hidden />
            </InputLeftElement>
            <Input
              autoFocus
              placeholder="Search conversations…"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              borderRadius="md"
              aria-label="Search conversations"
            />
          </InputGroup>

          {chats.isLoading ? (
            <Center py={8}>
              <Spinner size="sm" />
            </Center>
          ) : candidates.length === 0 ? (
            <EmptyState compact icon={FiCornerUpRight} title="No conversations found" />
          ) : (
            <VStack align="stretch" spacing={0.5} maxH="280px" overflowY="auto">
              {candidates.map((chat) => {
                const isSelected = selected.includes(chat.id);
                const atLimit = !isSelected && selected.length >= MAX_TARGETS;
                return (
                  <HStack
                    key={chat.id}
                    as="label"
                    spacing={3}
                    p={2}
                    borderRadius="md"
                    cursor={atLimit ? 'not-allowed' : 'pointer'}
                    opacity={atLimit ? 0.5 : 1}
                    _hover={atLimit ? undefined : { bg: 'blackAlpha.50', _dark: { bg: 'whiteAlpha.100' } }}
                  >
                    <Checkbox
                      isChecked={isSelected}
                      isDisabled={atLimit}
                      onChange={() =>
                        setSelected((prev) =>
                          prev.includes(chat.id)
                            ? prev.filter((id) => id !== chat.id)
                            : [...prev, chat.id],
                        )
                      }
                    />
                    <ChatAvatar chat={chat} size="sm" />
                    <Box flex="1" minW={0}>
                      <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                        {chatDisplayName(chat, user)}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {chat.type === 'GROUP' ? `${chat.members.length} members` : 'Direct chat'}
                      </Text>
                    </Box>
                  </HStack>
                );
              })}
            </VStack>
          )}

          {selected.length > 0 && (
            <Textarea
              mt={3}
              size="sm"
              rows={2}
              placeholder="Add a message (optional)"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              aria-label="Optional message to send with the forward"
            />
          )}
        </ModalBody>
        <ModalFooter gap={2}>
          <Button variant="ghost" colorScheme="gray" size="sm" onClick={close}>
            Cancel
          </Button>
          <Button
            size="sm"
            leftIcon={<FiCornerUpRight />}
            isDisabled={selected.length === 0}
            isLoading={forward.isPending}
            onClick={submit}
          >
            Send{selected.length > 0 ? ` to ${selected.length}` : ''}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
