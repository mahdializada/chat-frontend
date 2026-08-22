'use client';

import { HStack, Icon, Spinner, Tooltip } from '@chakra-ui/react';
import { FiAlertCircle, FiCheck, FiClock } from 'react-icons/fi';
import type { Chat, Message } from '@/types/api';

interface MessageStatusProps {
  message: Message;
  chat: Chat;
  currentUserId: string;
  /** Opens the "read by" sheet in group chats. */
  onShowInfo?: () => void;
}

type Status = 'queued' | 'sending' | 'failed' | 'sent' | 'delivered' | 'read';

const LABELS: Record<Status, string> = {
  queued: 'Waiting for connection',
  sending: 'Sending',
  failed: 'Failed to send',
  sent: 'Sent',
  delivered: 'Delivered',
  read: 'Read',
};

/** WhatsApp-style ticks for own messages: ✓ sent, ✓✓ delivered, coloured ✓✓ read. */
export function MessageStatus({ message, chat, currentUserId, onShowInfo }: MessageStatusProps) {
  const status = computeStatus(message, chat, currentUserId);
  const label = LABELS[status];

  if (status === 'queued') {
    return (
      <Tooltip label={label}>
        <span>
          <Icon as={FiClock} boxSize={3.5} color="whiteAlpha.700" aria-label={label} />
        </span>
      </Tooltip>
    );
  }
  if (status === 'sending') {
    return <Spinner size="xs" speed="0.8s" color="whiteAlpha.700" aria-label={label} />;
  }
  if (status === 'failed') {
    return <Icon as={FiAlertCircle} color="red.300" boxSize={3.5} aria-label={label} />;
  }

  const color = status === 'read' ? 'cyan.300' : 'whiteAlpha.700';
  return (
    <Tooltip label={onShowInfo ? `${label} — tap for details` : label}>
      <HStack
        spacing={0}
        display="inline-flex"
        as={onShowInfo ? 'button' : 'div'}
        onClick={onShowInfo}
        aria-label={label}
      >
        <Icon as={FiCheck} boxSize={3.5} color={color} aria-hidden />
        {(status === 'delivered' || status === 'read') && (
          <Icon as={FiCheck} boxSize={3.5} color={color} ml="-2" aria-hidden />
        )}
      </HStack>
    </Tooltip>
  );
}

function computeStatus(message: Message, chat: Chat, currentUserId: string): Status {
  if (message.failed) return 'failed';
  if (message.queued) return 'queued';
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
