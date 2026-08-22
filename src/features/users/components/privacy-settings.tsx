'use client';

import { Box, HStack, Select, Switch, Text, useToast, VStack } from '@chakra-ui/react';
import { getApiErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import type { PrivacyVisibility } from '@/types/api';
import { useUpdatePrivacy } from '../hooks/use-users';

const OPTIONS: { value: PrivacyVisibility; label: string }[] = [
  { value: 'EVERYONE', label: 'Everyone' },
  { value: 'CONTACTS', label: 'My contacts' },
  { value: 'NOBODY', label: 'Nobody' },
];

/**
 * Who can see what. These settings are enforced by the API — the server omits
 * hidden fields from every response rather than relying on the client.
 */
export function PrivacySettings() {
  const user = useAuthStore((s) => s.user);
  const updatePrivacy = useUpdatePrivacy();
  const toast = useToast();

  if (!user) return null;

  const onError = (error: unknown): void => {
    toast({ title: getApiErrorMessage(error), status: 'error', duration: 4000 });
  };

  const rows: {
    key: 'profilePhotoVisibility' | 'lastSeenVisibility' | 'onlineVisibility' | 'aboutVisibility';
    label: string;
    helper: string;
  }[] = [
    { key: 'profilePhotoVisibility', label: 'Profile photo', helper: 'Who can see your avatar' },
    { key: 'lastSeenVisibility', label: 'Last seen', helper: 'When you were last active' },
    { key: 'onlineVisibility', label: 'Online status', helper: 'Whether you appear online now' },
    { key: 'aboutVisibility', label: 'About', helper: 'Your bio text' },
  ];

  return (
    <VStack align="stretch" spacing={4}>
      {rows.map((row) => (
        <HStack key={row.key} justify="space-between" align="center" spacing={4}>
          <Box flex="1" minW={0}>
            <Text fontSize="sm">{row.label}</Text>
            <Text fontSize="xs" color="gray.500">
              {row.helper}
            </Text>
          </Box>
          <Select
            size="sm"
            w="150px"
            value={user[row.key]}
            aria-label={`${row.label} visibility`}
            onChange={(event) =>
              updatePrivacy.mutate(
                { [row.key]: event.target.value as PrivacyVisibility },
                { onError },
              )
            }
          >
            {OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </HStack>
      ))}

      <HStack justify="space-between" align="center" spacing={4}>
        <Box flex="1" minW={0}>
          <Text fontSize="sm">Read receipts</Text>
          <Text fontSize="xs" color="gray.500">
            Turning this off also hides other people&apos;s read receipts from you. Read receipts
            are always on in group chats.
          </Text>
        </Box>
        <Switch
          size="sm"
          isChecked={user.readReceiptsEnabled}
          aria-label="Read receipts"
          onChange={(event) =>
            updatePrivacy.mutate({ readReceiptsEnabled: event.target.checked }, { onError })
          }
        />
      </HStack>

      <Text fontSize="xs" color="gray.500">
        &ldquo;My contacts&rdquo; means people you already have a one-to-one conversation with.
      </Text>
    </VStack>
  );
}
