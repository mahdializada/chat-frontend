'use client';

import {
  Box,
  Center,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Text,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FiSearch, FiUserPlus } from 'react-icons/fi';
import { EmptyState } from '@/components/shared/empty-state';
import { UserAvatar } from '@/components/shared/user-avatar';
import { getApiErrorMessage } from '@/lib/api-client';
import { useUserSearch } from '@/features/users/hooks/use-user-search';
import { fullName } from '@/utils/format';
import { useCreateDirectChat } from '../hooks/use-chats';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewChatModal({ isOpen, onClose }: NewChatModalProps) {
  const [term, setTerm] = useState('');
  const search = useUserSearch(term);
  const createDirect = useCreateDirectChat();
  const router = useRouter();
  const toast = useToast();

  const trimmed = term.trim();

  const handlePick = (userId: string): void => {
    createDirect.mutate(userId, {
      onSuccess: (chat) => {
        onClose();
        setTerm('');
        router.push(`/chat/${chat.id}`);
      },
      onError: (error) =>
        toast({ title: getApiErrorMessage(error), status: 'error' }),
    });
  };

  // motionPreset="none": the modal must unmount instantly on close, otherwise its
  // focus/scroll locks swallow keystrokes aimed at the chat input right after picking.
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" motionPreset="none">
      <ModalOverlay />
      <ModalContent mx={4}>
        <ModalHeader>New chat</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <InputGroup mb={4}>
            <InputLeftElement pointerEvents="none">
              <Icon as={FiSearch} color="gray.400" aria-hidden />
            </InputLeftElement>
            <Input
              autoFocus
              placeholder="Search people by name or @username"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              aria-label="Search people"
            />
          </InputGroup>

          {trimmed.length < 2 && (
            <EmptyState
              compact
              icon={FiUserPlus}
              title="Find someone to chat with"
              description="Type at least two letters of their name or username."
            />
          )}

          {search.isFetching && (
            <Center py={6}>
              <Spinner size="sm" />
            </Center>
          )}

          {!search.isFetching && trimmed.length >= 2 && search.data?.length === 0 && (
            <EmptyState
              compact
              icon={FiSearch}
              title="No one found"
              description={`Nobody matches "${trimmed}". Check the spelling or try their username.`}
            />
          )}

          <VStack align="stretch" spacing={1} maxH="320px" overflowY="auto">
            {search.data?.map((user) => (
              <HStack
                key={user.id}
                as="button"
                type="button"
                w="100%"
                textAlign="left"
                p={2}
                spacing={3}
                borderRadius="lg"
                _hover={{ bg: 'bg.hover' }}
                _focusVisible={{ bg: 'bg.hover' }}
                disabled={createDirect.isPending}
                _disabled={{ opacity: 0.6, cursor: 'wait' }}
                onClick={() => handlePick(user.id)}
              >
                <UserAvatar user={user} size="sm" />
                <Box minW={0}>
                  <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                    {fullName(user)}
                  </Text>
                  <Text fontSize="xs" color="text.muted" noOfLines={1}>
                    @{user.username}
                  </Text>
                </Box>
              </HStack>
            ))}
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
