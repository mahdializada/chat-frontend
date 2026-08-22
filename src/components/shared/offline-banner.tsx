'use client';

import { HStack, Icon, Text } from '@chakra-ui/react';
import { FiCloudOff, FiLoader } from 'react-icons/fi';
import { resolveConnectionState, useConnectionStore } from '@/store/connection-store';
import { useOutboxStore } from '@/store/outbox-store';

/**
 * Slim status strip shown above the conversation when the client is offline or
 * still reconnecting. Composing stays enabled — messages queue locally.
 */
export function OfflineBanner() {
  const state = useConnectionStore(resolveConnectionState);
  const queued = useOutboxStore((s) => s.queue.length);

  if (state === 'online') return null;

  const offline = state === 'offline';
  return (
    <HStack
      role="status"
      aria-live="polite"
      justify="center"
      spacing={2}
      px={3}
      py={1.5}
      bg={offline ? 'orange.400' : 'blue.400'}
      color="white"
      fontSize="xs"
      fontWeight="medium"
    >
      <Icon as={offline ? FiCloudOff : FiLoader} aria-hidden />
      <Text>
        {offline ? 'You are offline' : 'Reconnecting…'}
        {queued > 0 && ` — ${queued} message${queued === 1 ? '' : 's'} will send when you're back`}
      </Text>
    </HStack>
  );
}
