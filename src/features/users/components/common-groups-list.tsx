'use client';

import { Box, HStack, Text, useColorModeValue, VStack } from '@chakra-ui/react';
import { Avatar } from '@chakra-ui/react';
import { FiUsers } from 'react-icons/fi';
import { EmptyState } from '@/components/shared/empty-state';
import { ListRowsSkeleton } from '@/components/shared/skeletons';
import { absoluteUrl } from '@/lib/env';
import { useCommonGroups } from '../hooks/use-users';

interface CommonGroupsListProps {
  userId: string;
  enabled?: boolean;
  onOpenGroup: (chatId: string) => void;
}

/**
 * Groups both the viewer and the contact belong to.
 * The intersection is computed by the API — the client never receives the
 * viewer's full group list to filter locally.
 */
export function CommonGroupsList({ userId, enabled = true, onOpenGroup }: CommonGroupsListProps) {
  const groups = useCommonGroups(userId, enabled);
  const hoverBg = useColorModeValue('gray.50', 'whiteAlpha.100');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200');

  if (groups.isLoading) return <ListRowsSkeleton count={2} />;

  if (!groups.data || groups.data.length === 0) {
    return (
      <EmptyState
        compact
        icon={FiUsers}
        title="You have no groups in common"
        description="Groups you both belong to will show up here."
      />
    );
  }

  return (
    <VStack align="stretch" spacing={2}>
      {groups.data.map((group) => (
        <HStack
          key={group.id}
          as="button"
          type="button"
          spacing={3}
          p={2.5}
          borderWidth="1px"
          borderColor={borderColor}
          borderRadius="lg"
          textAlign="left"
          _hover={{ bg: hoverBg }}
          _focusVisible={{ outline: '2px solid', outlineColor: 'brand.400' }}
          onClick={() => onOpenGroup(group.id)}
        >
          <Avatar
            size="sm"
            name={group.name ?? 'Group'}
            src={group.avatar ? absoluteUrl(group.avatar) : undefined}
          />
          <Box flex="1" minW={0}>
            <Text fontSize="sm" fontWeight="semibold" noOfLines={1}>
              {group.name ?? 'Group'}
            </Text>
            <Text fontSize="xs" color="gray.500" noOfLines={1}>
              {group.memberCount} member{group.memberCount === 1 ? '' : 's'}
              {group.description ? ` · ${group.description}` : ''}
            </Text>
          </Box>
        </HStack>
      ))}

      <Text fontSize="xs" color="gray.500" textAlign="center" pt={1}>
        You are both members of {groups.data.length} group
        {groups.data.length === 1 ? '' : 's'}
      </Text>
    </VStack>
  );
}
