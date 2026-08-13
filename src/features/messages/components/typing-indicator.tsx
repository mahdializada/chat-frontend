'use client';

import { HStack, Text } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { useChatUiStore } from '@/store/chat-ui-store';
import { fullName } from '@/utils/format';

const bounce = keyframes`
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-4px); }
`;

export function TypingIndicator({ chatId }: { chatId: string }) {
  const typingUsers = useChatUiStore((s) => s.typing[chatId]);
  const list = Object.values(typingUsers ?? {});
  if (list.length === 0) return null;

  const label =
    list.length === 1
      ? `${fullName(list[0])} is typing`
      : list.length === 2
        ? `${list[0].firstName} and ${list[1].firstName} are typing`
        : `${list[0].firstName} and ${list.length - 1} others are typing`;

  return (
    <HStack px={4} py={1} spacing={2}>
      <HStack spacing={0.5}>
        {[0, 1, 2].map((i) => (
          <Text
            key={i}
            as="span"
            w="4px"
            h="4px"
            borderRadius="full"
            bg="gray.400"
            animation={`${bounce} 1.2s infinite ${i * 0.15}s`}
          />
        ))}
      </HStack>
      <Text fontSize="xs" color="gray.500" fontStyle="italic">
        {label}…
      </Text>
    </HStack>
  );
}
