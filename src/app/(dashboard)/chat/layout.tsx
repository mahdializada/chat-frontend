'use client';

import { Flex, useColorModeValue } from '@chakra-ui/react';
import { useParams } from 'next/navigation';
import { ChatSidebar } from '@/features/chats/components/chat-sidebar';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ chatId?: string }>();
  const hasOpenChat = !!params?.chatId;
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  return (
    <Flex h="100dvh" overflow="hidden">
      {/* Mobile shows either the list or the conversation; desktop shows both. */}
      <Flex
        w={{ base: '100%', md: '340px', lg: '380px' }}
        flexShrink={0}
        borderRightWidth={{ base: 0, md: '1px' }}
        borderColor={borderColor}
        display={{ base: hasOpenChat ? 'none' : 'flex', md: 'flex' }}
        direction="column"
        minW={0}
      >
        <ChatSidebar />
      </Flex>
      <Flex
        flex="1"
        direction="column"
        minW={0}
        display={{ base: hasOpenChat ? 'flex' : 'none', md: 'flex' }}
      >
        {children}
      </Flex>
    </Flex>
  );
}
