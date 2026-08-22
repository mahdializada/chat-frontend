'use client';

import { Flex, useColorModeValue } from '@chakra-ui/react';
import { useParams, usePathname } from 'next/navigation';
import { ChatSidebar } from '@/features/chats/components/chat-sidebar';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ chatId?: string }>();
  const pathname = usePathname();
  const hasOpenChat = !!params?.chatId;
  const isArchivedView = pathname === '/chat/archived';
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200');
  const sidebarBg = useColorModeValue('white', 'gray.800');

  return (
    <Flex h="100dvh" overflow="hidden">
      {/* Mobile shows either the list or the conversation; desktop shows both. */}
      <Flex
        as="nav"
        aria-label="Conversations"
        w={{ base: '100%', md: '340px', lg: '380px' }}
        flexShrink={0}
        borderRightWidth={{ base: 0, md: '1px' }}
        borderColor={borderColor}
        bg={sidebarBg}
        display={{ base: hasOpenChat ? 'none' : 'flex', md: 'flex' }}
        direction="column"
        minW={0}
      >
        <ChatSidebar archived={isArchivedView} />
      </Flex>
      <Flex
        as="main"
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
