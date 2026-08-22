'use client';

import { Center } from '@chakra-ui/react';
import { FiMessageCircle } from 'react-icons/fi';
import { EmptyState } from '@/components/shared/empty-state';

export default function ChatEmptyPage() {
  return (
    <Center h="100%" display={{ base: 'none', md: 'flex' }}>
      <EmptyState
        icon={FiMessageCircle}
        title="Select a conversation"
        description="Choose a chat from the list, or start a new one to begin messaging."
      />
    </Center>
  );
}
