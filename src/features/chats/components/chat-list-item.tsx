'use client';

import { Badge, Box, HStack, Text, useColorModeValue } from '@chakra-ui/react';
import NextLink from 'next/link';
import { ChatAvatar } from '@/components/shared/chat-avatar';
import { useAuthStore } from '@/store/auth-store';
import { useChatUiStore } from '@/store/chat-ui-store';
import {
  chatDisplayName,
  formatChatListTime,
  fullName,
  messagePreview,
} from '@/utils/format';
import type { Chat } from '@/types/api';

interface ChatListItemProps {
  chat: Chat;
  isActive: boolean;
}

export function ChatListItem({ chat, isActive }: ChatListItemProps) {
  const user = useAuthStore((s) => s.user);
  const typingUsers = useChatUiStore((s) => s.typing[chat.id]);
  const activeBg = useColorModeValue('brand.50', 'whiteAlpha.100');
  const hoverBg = useColorModeValue('gray.50', 'whiteAlpha.50');

  const typingList = Object.values(typingUsers ?? {});
  const preview =
    typingList.length > 0
      ? `${typingList.map((t) => t.firstName).join(', ')} typing…`
      : messagePreview(chat.lastMessage, user?.id);
  const timeSource = chat.lastMessageAt ?? chat.lastMessage?.createdAt ?? null;

  return (
    <Box
      as={NextLink}
      href={`/chat/${chat.id}`}
      px={3}
      py={2.5}
      borderRadius="lg"
      bg={isActive ? activeBg : 'transparent'}
      _hover={{ bg: isActive ? activeBg : hoverBg }}
      display="block"
    >
      <HStack spacing={3} align="center">
        <ChatAvatar chat={chat} size="md" />
        <Box flex="1" minW={0}>
          <HStack justify="space-between" align="baseline">
            <Text fontWeight="semibold" noOfLines={1} fontSize="sm">
              {chatDisplayName(chat, user)}
            </Text>
            {timeSource && (
              <Text fontSize="xs" color="gray.500" flexShrink={0}>
                {formatChatListTime(timeSource)}
              </Text>
            )}
          </HStack>
          <HStack justify="space-between" align="center" mt={0.5}>
            <Text
              fontSize="xs"
              color={typingList.length > 0 ? 'brand.400' : 'gray.500'}
              fontStyle={typingList.length > 0 ? 'italic' : 'normal'}
              noOfLines={1}
            >
              {chat.type === 'GROUP' &&
              chat.lastMessage &&
              !chat.lastMessage.deletedAt &&
              chat.lastMessage.type !== 'SYSTEM' &&
              chat.lastMessage.sender &&
              typingList.length === 0 &&
              chat.lastMessage.senderId !== user?.id
                ? `${chat.lastMessage.sender.firstName}: ${preview}`
                : preview}
            </Text>
            {chat.unreadCount > 0 && (
              <Badge
                colorScheme="brand"
                variant="solid"
                borderRadius="full"
                fontSize="0.65rem"
                minW="1.25rem"
                textAlign="center"
                flexShrink={0}
              >
                {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
              </Badge>
            )}
          </HStack>
        </Box>
      </HStack>
    </Box>
  );
}
