'use client';

import { Button, HStack, Icon, Text, useToast } from '@chakra-ui/react';
import { FiPhone, FiVideo } from 'react-icons/fi';
import { fullName } from '@/utils/format';
import { useCallTimer } from '../hooks/use-call';
import { callManager } from '../lib/call-manager';
import { formatCallDuration } from '../lib/call-utils';
import { useCallStore } from '../store/call-store';

/**
 * Shown under the chat header when there is a call to join in this chat, or
 * when the user is in this chat's call with the call screen minimised.
 */
export function ActiveCallBanner({ chatId }: { chatId: string }) {
  const joinable = useCallStore((s) => s.joinable[chatId]);
  const active = useCallStore((s) => s.active);
  const isMinimized = useCallStore((s) => s.isMinimized);
  const seconds = useCallTimer();
  const toast = useToast();

  if (active?.chatId === chatId) {
    if (!isMinimized) return null;
    return (
      <HStack px={4} py={2} bg="green.500" color="white" spacing={3} fontSize="sm">
        <Icon as={active.type === 'VIDEO' ? FiVideo : FiPhone} />
        <Text flex="1">
          You are in this call{seconds > 0 ? ` · ${formatCallDuration(seconds)}` : ''}
        </Text>
        <Button size="xs" variant="outline" colorScheme="whiteAlpha" color="white" onClick={() => callManager.setMinimized(false)}>
          Open
        </Button>
      </HStack>
    );
  }

  if (!joinable) return null;
  const joinedCount = joinable.participants.filter((p) => p.status === 'JOINED').length;
  const starter = joinable.initiator ? fullName(joinable.initiator) : 'Someone';
  const kind = joinable.type === 'VIDEO' ? 'video' : 'voice';

  const join = (): void => {
    callManager.accept(joinable.id, joinable.type === 'VIDEO').catch((error: unknown) => {
      toast({
        title: error instanceof Error ? error.message : 'Could not join the call',
        status: 'error',
        duration: 4000,
      });
    });
  };

  return (
    <HStack px={4} py={2} bg="green.500" color="white" spacing={3} fontSize="sm" role="status">
      <Icon as={joinable.type === 'VIDEO' ? FiVideo : FiPhone} />
      <Text flex="1" noOfLines={1}>
        {starter} started a {kind} call · {joinedCount} in call
      </Text>
      <Button size="xs" bg="white" color="green.600" _hover={{ bg: 'whiteAlpha.900' }} onClick={join} isDisabled={!!active}>
        Join
      </Button>
    </HStack>
  );
}
