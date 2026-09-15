'use client';

import { Flex } from '@chakra-ui/react';
import { useParams, usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { ChatSidebar } from '@/features/chats/components/chat-sidebar';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { focusGlobalSearch, useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ chatId?: string }>();
  const pathname = usePathname();
  const hasOpenChat = !!params?.chatId;
  const isArchivedView = pathname === '/chat/archived';

  useDocumentTitle();
  // Ctrl/Cmd+K works on every chat page, not only inside an open conversation.
  useKeyboardShortcuts(useMemo(() => ({ onGlobalSearch: focusGlobalSearch }), []));

  return (
    <Flex h="100dvh" overflow="hidden">
      {/* Mobile shows either the list or the conversation; desktop shows both. */}
      <Flex
        as="nav"
        aria-label="Conversations"
        w={{ base: '100%', md: '340px', lg: '380px' }}
        flexShrink={0}
        borderRightWidth={{ base: 0, md: '1px' }}
        borderColor="border.subtle"
        bg="bg.surface"
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
