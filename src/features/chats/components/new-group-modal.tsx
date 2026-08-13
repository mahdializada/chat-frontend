'use client';

import {
  Box,
  Button,
  FormControl,
  FormLabel,
  HStack,
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
  Tag,
  TagCloseButton,
  TagLabel,
  Text,
  Textarea,
  useToast,
  VStack,
  Wrap,
  WrapItem,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import { UserAvatar } from '@/components/shared/user-avatar';
import { getApiErrorMessage } from '@/lib/api-client';
import { useUserSearch } from '@/features/users/hooks/use-user-search';
import { fullName } from '@/utils/format';
import type { User } from '@/types/api';
import { useCreateGroup } from '../hooks/use-chats';

interface NewGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewGroupModal({ isOpen, onClose }: NewGroupModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [term, setTerm] = useState('');
  const [selected, setSelected] = useState<User[]>([]);
  const search = useUserSearch(term);
  const createGroup = useCreateGroup();
  const router = useRouter();
  const toast = useToast();

  const reset = (): void => {
    setName('');
    setDescription('');
    setTerm('');
    setSelected([]);
  };

  const toggleUser = (user: User): void => {
    setSelected((prev) =>
      prev.some((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user],
    );
  };

  const handleCreate = (): void => {
    createGroup.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        memberIds: selected.map((u) => u.id),
      },
      {
        onSuccess: (chat) => {
          reset();
          onClose();
          router.push(`/chat/${chat.id}`);
        },
        onError: (error) =>
          toast({ title: getApiErrorMessage(error), status: 'error', duration: 4000 }),
      },
    );
  };

  const candidates = search.data?.filter((u) => !selected.some((s) => s.id === u.id)) ?? [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" motionPreset="none">
      <ModalOverlay />
      <ModalContent mx={4}>
        <ModalHeader>Create group</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack align="stretch" spacing={4}>
            <FormControl isRequired>
              <FormLabel>Group name</FormLabel>
              <Input
                placeholder="Weekend plans"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Description</FormLabel>
              <Textarea
                placeholder="What is this group about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={2}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Members</FormLabel>
              {selected.length > 0 && (
                <Wrap mb={2}>
                  {selected.map((user) => (
                    <WrapItem key={user.id}>
                      <Tag borderRadius="full" colorScheme="brand">
                        <TagLabel>{fullName(user)}</TagLabel>
                        <TagCloseButton onClick={() => toggleUser(user)} />
                      </Tag>
                    </WrapItem>
                  ))}
                </Wrap>
              )}
              <InputGroup>
                <InputLeftElement pointerEvents="none">
                  <FiSearch color="gray" />
                </InputLeftElement>
                <Input
                  placeholder="Search people to add…"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                />
              </InputGroup>
              <VStack align="stretch" spacing={1} maxH="200px" overflowY="auto" mt={2}>
                {candidates.map((user) => (
                  <HStack
                    key={user.id}
                    p={2}
                    spacing={3}
                    borderRadius="lg"
                    cursor="pointer"
                    _hover={{ bg: 'whiteAlpha.200' }}
                    onClick={() => toggleUser(user)}
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
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose} colorScheme="gray">
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            isDisabled={!name.trim() || selected.length === 0}
            isLoading={createGroup.isPending}
          >
            Create group
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
