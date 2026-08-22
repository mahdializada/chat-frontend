'use client';

import { Box, Button, HStack, Text, useToast, VStack } from '@chakra-ui/react';
import { FiUserX } from 'react-icons/fi';
import { EmptyState } from '@/components/shared/empty-state';
import { ListRowsSkeleton } from '@/components/shared/skeletons';
import { UserAvatar } from '@/components/shared/user-avatar';
import { getApiErrorMessage } from '@/lib/api-client';
import { fullName } from '@/utils/format';
import { useBlockedUsers, useBlockUser } from '../hooks/use-users';

/** The blocked list, with one-tap unblock. */
export function BlockedContacts() {
  const blocked = useBlockedUsers();
  const blockUser = useBlockUser();
  const toast = useToast();

  if (blocked.isLoading) return <ListRowsSkeleton count={2} />;

  if ((blocked.data?.length ?? 0) === 0) {
    return (
      <EmptyState
        compact
        icon={FiUserX}
        title="No blocked contacts"
        description="People you block will be listed here."
      />
    );
  }

  return (
    <VStack align="stretch" spacing={2}>
      {blocked.data?.map((user) => (
        <HStack key={user.id} spacing={3}>
          <UserAvatar user={user} size="sm" />
          <Box flex="1" minW={0}>
            <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
              {fullName(user)}
            </Text>
            <Text fontSize="xs" color="gray.500">
              @{user.username}
            </Text>
          </Box>
          <Button
            size="xs"
            variant="outline"
            isLoading={blockUser.isPending && blockUser.variables?.userId === user.id}
            onClick={() =>
              blockUser.mutate(
                { userId: user.id, block: false },
                {
                  onSuccess: () =>
                    toast({ title: 'Contact unblocked', status: 'success', duration: 2500 }),
                  onError: (error) =>
                    toast({ title: getApiErrorMessage(error), status: 'error', duration: 4000 }),
                },
              )
            }
          >
            Unblock
          </Button>
        </HStack>
      ))}
    </VStack>
  );
}
