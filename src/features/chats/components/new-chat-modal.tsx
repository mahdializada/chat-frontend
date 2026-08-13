'use client';

import {
  Box,
  Center,
  HStack,
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
import { FiSearch } from 'react-icons/fi';
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

  const handlePick = (userId: string): void => {
    createDirect.mutate(userId, {
      onSuccess: (chat) => {
        onClose();
        setTerm('');
        router.push(`/chat/${chat.id}`);
      },
      onError: (error) =>
        toast({ title: getApiErrorMessage(error), status: 'error', duration: 4000 }),
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
              <FiSearch color="gray" />
            </InputLeftElement>
            <Input
              autoFocus
              placeholder="Search people by name or username…"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
          </InputGroup>

          {search.isFetching && (
            <Center py={6}>
              <Spinner size="sm" />
            </Center>
          )}

          {!search.isFetching && term.trim().length >= 2 && search.data?.length === 0 && (
            <Text color="gray.500" fontSize="sm" textAlign="center" py={4}>
              No users found
            </Text>
          )}

          <VStack align="stretch" spacing={1} maxH="320px" overflowY="auto">
            {search.data?.map((user) => (
              <HStack
                key={user.id}
                p={2}
                spacing={3}
                borderRadius="lg"
                cursor="pointer"
                _hover={{ bg: 'whiteAlpha.200' }}
                onClick={() => handlePick(user.id)}
              >
                <UserAvatar user={user} size="sm" />
                <Box>
                  <Text fontSize="sm" fontWeight="medium">
                    {fullName(user)}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
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
