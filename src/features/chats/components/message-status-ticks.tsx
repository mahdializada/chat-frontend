'use client';

import { HStack, Icon } from '@chakra-ui/react';
import { FiCheck, FiClock } from 'react-icons/fi';
import type { Chat, Message } from '@/types/api';

interface MessageStatusTicksProps {
  message: Message;
  chat: Chat;
  currentUserId: string;
}

/**
 * Compact delivery ticks for the chat-list preview row.
 * Uses neutral colours (unlike the in-bubble variant, which sits on brand blue).
 */
export function MessageStatusTicks({ message, chat, currentUserId }: MessageStatusTicksProps) {
  if (message.queued || message.optimistic) {
    return <Icon as={FiClock} boxSize={3} color="gray.400" aria-label="Pending" />;
  }

  const recipients = chat.members.filter((m) => m.userId !== currentUserId);
  const receiptByUser = new Map(message.receipts.map((r) => [r.userId, r]));
  const allRead =
    recipients.length > 0 && recipients.every((m) => receiptByUser.get(m.userId)?.readAt);
  const allDelivered =
    recipients.length > 0 && recipients.every((m) => receiptByUser.get(m.userId)?.deliveredAt);

  const color = allRead ? 'brand.400' : 'gray.400';
  const label = allRead ? 'Read' : allDelivered ? 'Delivered' : 'Sent';

  return (
    <HStack spacing={0} display="inline-flex" flexShrink={0} aria-label={label}>
      <Icon as={FiCheck} boxSize={3} color={color} aria-hidden />
      {(allDelivered || allRead) && (
        <Icon as={FiCheck} boxSize={3} color={color} ml="-1.5" aria-hidden />
      )}
    </HStack>
  );
}
