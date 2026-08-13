'use client';

import { HStack, Icon, Spinner } from '@chakra-ui/react';
import { FiAlertCircle, FiCheck } from 'react-icons/fi';
import type { Chat, Message } from '@/types/api';

interface MessageStatusProps {
  message: Message;
  chat: Chat;
  currentUserId: string;
}

type Status = 'sending' | 'failed' | 'sent' | 'delivered' | 'read';

/** WhatsApp-style ticks for own messages: ✓ sent, ✓✓ delivered, blue ✓✓ read. */
export function MessageStatus({ message, chat, currentUserId }: MessageStatusProps) {
  const status = computeStatus(message, chat, currentUserId);

  if (status === 'sending') return <Spinner size="xs" speed="0.8s" color="gray.400" />;
  if (status === 'failed') return <Icon as={FiAlertCircle} color="red.400" boxSize={3.5} />;

  const color = status === 'read' ? 'cyan.300' : 'whiteAlpha.700';
  return (
    <HStack spacing={0} display="inline-flex">
      <Icon as={FiCheck} boxSize={3.5} color={color} />
      {(status === 'delivered' || status === 'read') && (
        <Icon as={FiCheck} boxSize={3.5} color={color} ml="-2" />
      )}
    </HStack>
  );
}

function computeStatus(message: Message, chat: Chat, currentUserId: string): Status {
  if (message.failed) return 'failed';
  if (message.optimistic) return 'sending';

  const recipients = chat.members.filter((m) => m.userId !== currentUserId);
  if (recipients.length === 0) return 'sent';

  const receiptByUser = new Map(message.receipts.map((r) => [r.userId, r]));
  const allRead = recipients.every((m) => receiptByUser.get(m.userId)?.readAt);
  if (allRead) return 'read';
  const allDelivered = recipients.every((m) => receiptByUser.get(m.userId)?.deliveredAt);
  if (allDelivered) return 'delivered';
  return 'sent';
}
