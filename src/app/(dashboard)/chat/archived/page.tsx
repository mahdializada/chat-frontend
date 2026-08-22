'use client';

import { Center } from '@chakra-ui/react';
import { FiArchive } from 'react-icons/fi';
import { EmptyState } from '@/components/shared/empty-state';

export default function ArchivedChatsPage() {
  return (
    <Center h="100%" display={{ base: 'none', md: 'flex' }}>
      <EmptyState
        icon={FiArchive}
        title="Archived chats"
        description="Pick a conversation on the left to read it. Archived chats stay out of your main list until you unarchive them."
      />
    </Center>
  );
}
