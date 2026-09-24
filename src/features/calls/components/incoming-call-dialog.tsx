'use client';

import { Box, Button, HStack, IconButton, Text, Tooltip, useToast, VStack } from '@chakra-ui/react';
import { useEffect } from 'react';
import { FiPhone, FiPhoneOff, FiVideo } from 'react-icons/fi';
import { UserAvatar } from '@/components/shared/user-avatar';
import { getNotificationPermission } from '@/lib/notifications';
import { fullName } from '@/utils/format';
import type { Call } from '@/types/api';
import { callManager } from '../lib/call-manager';
import { useCallStore } from '../store/call-store';

/** Sits above the call screen so a second call can still be answered. */
const INCOMING_Z = 1500;

/** Stacked cards for every call currently ringing on this device. */
export function IncomingCallDialog() {
  const incoming = useCallStore((s) => s.incoming);

  // A system notification when the tab is in the background (best effort).
  useEffect(() => {
    if (typeof document === 'undefined' || !document.hidden) return;
    if (getNotificationPermission() !== 'granted') return;
    const latest = incoming[incoming.length - 1];
    if (!latest) return;
    try {
      const notification = new Notification(
        `Incoming ${latest.type === 'VIDEO' ? 'video' : 'voice'} call`,
        {
          body: latest.initiator ? fullName(latest.initiator) : 'Someone is calling you',
          tag: `call-${latest.id}`,
        },
      );
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch {
      // Notifications are optional.
    }
  }, [incoming]);

  if (incoming.length === 0) return null;

  return (
    <VStack
      position="fixed"
      top={{ base: 2, md: 4 }}
      right={{ base: 2, md: 4 }}
      left={{ base: 2, md: 'auto' }}
      zIndex={INCOMING_Z}
      spacing={3}
      align="stretch"
      w={{ base: 'auto', md: '340px' }}
    >
      {incoming.map((call) => (
        <IncomingCard key={call.id} call={call} />
      ))}
    </VStack>
  );
}

function IncomingCard({ call }: { call: Call }) {
  const toast = useToast();
  const isVideo = call.type === 'VIDEO';
  const from = call.initiator ? fullName(call.initiator) : 'Unknown caller';
  const where = call.chat.type === 'GROUP' ? call.chat.name ?? 'Group' : null;

  const accept = (withVideo: boolean): void => {
    callManager.accept(call.id, withVideo).catch((error: unknown) => {
      toast({
        title: error instanceof Error ? error.message : 'Could not join the call',
        status: 'error',
        duration: 4000,
      });
    });
  };

  return (
    <Box
      role="alertdialog"
      aria-label={`Incoming ${isVideo ? 'video' : 'voice'} call from ${from}`}
      bg="gray.900"
      color="white"
      borderRadius="2xl"
      boxShadow="2xl"
      p={4}
    >
      <HStack spacing={3} align="center">
        <UserAvatar user={call.initiator} size="md" />
        <Box flex="1" minW={0}>
          <Text fontWeight="semibold" noOfLines={1}>
            {from}
          </Text>
          <Text fontSize="xs" color="whiteAlpha.700" noOfLines={2}>
            Incoming {isVideo ? 'video' : 'voice'} call{where ? ` · ${where}` : ''}
          </Text>
        </Box>
        <Tooltip label="Decline">
          <IconButton
            aria-label="Decline call"
            icon={<FiPhoneOff />}
            colorScheme="red"
            borderRadius="full"
            onClick={() => void callManager.decline(call.id)}
          />
        </Tooltip>
        <Tooltip label={isVideo ? 'Accept with video' : 'Accept'}>
          <IconButton
            aria-label={isVideo ? 'Accept with video' : 'Accept call'}
            icon={isVideo ? <FiVideo /> : <FiPhone />}
            colorScheme="green"
            borderRadius="full"
            onClick={() => accept(isVideo)}
          />
        </Tooltip>
      </HStack>
      {isVideo && (
        <Button
          mt={2}
          size="xs"
          variant="link"
          color="whiteAlpha.800"
          onClick={() => accept(false)}
        >
          Answer without video
        </Button>
      )}
    </Box>
  );
}
