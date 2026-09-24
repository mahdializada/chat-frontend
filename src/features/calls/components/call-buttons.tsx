'use client';

import { IconButton, Tooltip, useToast } from '@chakra-ui/react';
import { FiPhone, FiVideo } from 'react-icons/fi';
import type { Chat } from '@/types/api';
import { useInCall } from '../hooks/use-call';
import { callManager } from '../lib/call-manager';

/** Voice / video call buttons for the chat header. */
export function CallButtons({ chat }: { chat: Chat }) {
  const toast = useToast();
  const inCall = useInCall();
  const isGroup = chat.type === 'GROUP';
  const blocked = !!chat.blockState?.blockedByMe || !!chat.blockState?.blockedMe;
  const disabled = blocked || inCall || chat.members.length < 2;

  const start = (type: 'AUDIO' | 'VIDEO'): void => {
    callManager.start(chat.id, type).catch((error: unknown) => {
      toast({
        title: error instanceof Error ? error.message : 'Could not start the call',
        status: 'error',
        duration: 4000,
      });
    });
  };

  return (
    <>
      <Tooltip label={isGroup ? 'Start group voice call' : 'Voice call'}>
        <IconButton
          aria-label={isGroup ? 'Start group voice call' : 'Voice call'}
          icon={<FiPhone />}
          variant="ghost"
          size="sm"
          isDisabled={disabled}
          onClick={() => start('AUDIO')}
        />
      </Tooltip>
      <Tooltip label={isGroup ? 'Start group video call' : 'Video call'}>
        <IconButton
          aria-label={isGroup ? 'Start group video call' : 'Video call'}
          icon={<FiVideo />}
          variant="ghost"
          size="sm"
          isDisabled={disabled}
          onClick={() => start('VIDEO')}
        />
      </Tooltip>
    </>
  );
}
