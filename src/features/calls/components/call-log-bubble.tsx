'use client';

import { Box, Button, Center, HStack, Icon, Text, useToast } from '@chakra-ui/react';
import { FiPhone, FiPhoneIncoming, FiPhoneMissed, FiPhoneOutgoing, FiVideo } from 'react-icons/fi';
import { formatMessageTime } from '@/utils/format';
import type { Chat, Message } from '@/types/api';
import { useInCall } from '../hooks/use-call';
import { callManager } from '../lib/call-manager';
import { describeCallLog } from '../lib/call-utils';

interface CallLogBubbleProps {
  message: Message;
  chat: Chat;
  currentUserId: string;
}

/** Centered "Missed voice call · 14:02" card with a call-back shortcut. */
export function CallLogBubble({ message, chat, currentUserId }: CallLogBubbleProps) {
  const toast = useToast();
  const inCall = useInCall();
  const call = message.call;
  if (!call) return null;

  const info = describeCallLog(call, currentUserId);
  const missed = info.direction === 'missed';
  const icon =
    call.type === 'VIDEO'
      ? FiVideo
      : missed
        ? FiPhoneMissed
        : info.direction === 'outgoing'
          ? FiPhoneOutgoing
          : FiPhoneIncoming;
  const blocked = !!chat.blockState?.blockedByMe || !!chat.blockState?.blockedMe;

  const callBack = (): void => {
    callManager.start(chat.id, call.type).catch((error: unknown) => {
      toast({
        title: error instanceof Error ? error.message : 'Could not start the call',
        status: 'error',
        duration: 4000,
      });
    });
  };

  return (
    <Center my={2} data-message-id={message.id}>
      <HStack
        bg="bg.surface"
        borderWidth="1px"
        borderColor="border.subtle"
        borderRadius="xl"
        px={3}
        py={2}
        spacing={3}
        maxW="340px"
        w="100%"
      >
        <Center
          boxSize={9}
          borderRadius="full"
          bg={missed ? 'red.50' : 'bg.muted'}
          color={missed ? 'red.500' : 'text.muted'}
          flexShrink={0}
          _dark={{ bg: missed ? 'rgba(229,62,62,0.18)' : 'whiteAlpha.100' }}
        >
          <Icon as={icon} />
        </Center>
        <Box flex="1" minW={0}>
          <Text fontSize="sm" fontWeight="medium" color={missed ? 'red.500' : undefined} noOfLines={1}>
            {info.label}
          </Text>
          <Text fontSize="xs" color="text.muted">
            {formatMessageTime(message.createdAt)}
            {info.duration ? ` · ${info.duration}` : ''}
          </Text>
        </Box>
        {!blocked && (
          <Button
            size="xs"
            variant="ghost"
            leftIcon={<Icon as={call.type === 'VIDEO' ? FiVideo : FiPhone} />}
            onClick={callBack}
            isDisabled={inCall}
            flexShrink={0}
          >
            {info.direction === 'outgoing' ? 'Call again' : 'Call back'}
          </Button>
        )}
      </HStack>
    </Center>
  );
}
