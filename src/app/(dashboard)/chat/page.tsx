'use client';

import { Center, useDisclosure } from '@chakra-ui/react';
import { FiMessageCircle } from 'react-icons/fi';
import { EmptyState } from '@/components/shared/empty-state';
import { NewChatModal } from '@/features/chats/components/new-chat-modal';
import { NewGroupModal } from '@/features/chats/components/new-group-modal';

export default function ChatEmptyPage() {
  const newChat = useDisclosure();
  const newGroup = useDisclosure();

  return (
    <Center h="100%" display={{ base: 'none', md: 'flex' }}>
      <EmptyState
        icon={FiMessageCircle}
        title="Select a conversation"
        description="Pick a chat from the list, or start a new one."
        actionLabel="New chat"
        onAction={newChat.onOpen}
        secondaryActionLabel="New group"
        onSecondaryAction={newGroup.onOpen}
      />
      <NewChatModal isOpen={newChat.isOpen} onClose={newChat.onClose} />
      <NewGroupModal isOpen={newGroup.isOpen} onClose={newGroup.onClose} />
    </Center>
  );
}
