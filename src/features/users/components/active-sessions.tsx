'use client';

import {
  Badge,
  Box,
  Button,
  HStack,
  Icon,
  Text,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { FiMonitor, FiSmartphone, FiTablet } from 'react-icons/fi';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ListRowsSkeleton } from '@/components/shared/skeletons';
import {
  useRevokeAllSessions,
  useRevokeOtherSessions,
  useRevokeSession,
  useSessions,
} from '@/features/auth/hooks/use-auth';
import { getApiErrorMessage } from '@/lib/api-client';
import { formatRelativeTime } from '@/utils/format';
import type { SessionView } from '@/types/api';

function deviceIcon(session: SessionView): typeof FiMonitor {
  const os = session.os ?? '';
  if (os === 'iPhone' || os === 'Android') return FiSmartphone;
  if (os === 'iPad') return FiTablet;
  return FiMonitor;
}

/** Signed-in devices, with per-device and bulk sign-out. */
export function ActiveSessions() {
  const sessions = useSessions();
  const revokeSession = useRevokeSession();
  const revokeOthers = useRevokeOtherSessions();
  const revokeAll = useRevokeAllSessions();
  const toast = useToast();

  const othersConfirm = useDisclosure();
  const allConfirm = useDisclosure();

  const onError = (error: unknown): void => {
    toast({ title: getApiErrorMessage(error), status: 'error', duration: 4000 });
  };

  if (sessions.isLoading) return <ListRowsSkeleton count={2} />;

  const others = (sessions.data ?? []).filter((session) => !session.isCurrent);

  return (
    <>
      <VStack align="stretch" spacing={3}>
        {sessions.data?.map((session) => (
          <HStack key={session.id} spacing={3} align="flex-start">
            <Box
              display="grid"
              placeItems="center"
              boxSize="36px"
              borderRadius="md"
              bg="blackAlpha.50"
              _dark={{ bg: 'whiteAlpha.100' }}
              flexShrink={0}
            >
              <Icon as={deviceIcon(session)} color="gray.500" aria-hidden />
            </Box>
            <Box flex="1" minW={0}>
              <HStack spacing={2}>
                <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                  {session.deviceName ?? 'Unknown device'}
                </Text>
                {session.isCurrent && (
                  <Badge colorScheme="green" fontSize="0.6rem">
                    This device
                  </Badge>
                )}
              </HStack>
              <Text fontSize="xs" color="gray.500" noOfLines={1}>
                {session.browser}
                {session.ipAddress ? ` · ${session.ipAddress}` : ''}
              </Text>
              <Text fontSize="xs" color={session.isCurrent ? 'green.400' : 'gray.500'}>
                {session.isCurrent ? 'Active now' : formatRelativeTime(session.lastActiveAt)}
              </Text>
            </Box>
            {!session.isCurrent && (
              <Button
                size="xs"
                variant="outline"
                colorScheme="red"
                isLoading={revokeSession.isPending && revokeSession.variables === session.id}
                onClick={() =>
                  revokeSession.mutate(session.id, {
                    onSuccess: () =>
                      toast({ title: 'Device signed out', status: 'success', duration: 2500 }),
                    onError,
                  })
                }
              >
                Log out
              </Button>
            )}
          </HStack>
        ))}

        <HStack spacing={2} pt={1}>
          <Button
            size="sm"
            variant="outline"
            isDisabled={others.length === 0}
            onClick={othersConfirm.onOpen}
          >
            Log out other devices
          </Button>
          <Button size="sm" variant="ghost" colorScheme="red" onClick={allConfirm.onOpen}>
            Log out everywhere
          </Button>
        </HStack>
      </VStack>

      <ConfirmDialog
        isOpen={othersConfirm.isOpen}
        onClose={othersConfirm.onClose}
        onConfirm={() =>
          revokeOthers.mutate(undefined, {
            onSuccess: (result) => {
              toast({
                title: `${result.revoked} device${result.revoked === 1 ? '' : 's'} signed out`,
                status: 'success',
                duration: 3000,
              });
              othersConfirm.onClose();
            },
            onError,
          })
        }
        isLoading={revokeOthers.isPending}
        title="Log out other devices?"
        body="Every other signed-in device will be logged out immediately. This device stays signed in."
        confirmLabel="Log out others"
      />

      <ConfirmDialog
        isOpen={allConfirm.isOpen}
        onClose={allConfirm.onClose}
        onConfirm={() => revokeAll.mutate()}
        isLoading={revokeAll.isPending}
        title="Log out everywhere?"
        body="You will be signed out on every device, including this one, and will need to log in again."
        confirmLabel="Log out everywhere"
      />
    </>
  );
}
