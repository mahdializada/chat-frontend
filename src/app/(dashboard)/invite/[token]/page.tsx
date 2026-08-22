'use client';

import {
  Avatar,
  Box,
  Button,
  Center,
  Container,
  Heading,
  Spinner,
  Text,
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { useParams, useRouter } from 'next/navigation';
import { FiSlash, FiUsers } from 'react-icons/fi';
import { EmptyState } from '@/components/shared/empty-state';
import { useInvitePreview, useJoinByInvite } from '@/features/chats/hooks/use-chats';
import { getApiErrorMessage } from '@/lib/api-client';
import { absoluteUrl } from '@/lib/env';

/** Landing page for a shared group invite link. */
export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const router = useRouter();
  const toast = useToast();

  const preview = useInvitePreview(token);
  const join = useJoinByInvite();

  const cardBg = useColorModeValue('white', 'gray.750');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200');

  if (preview.isLoading) {
    return (
      <Center h="100dvh">
        <Spinner size="xl" color="brand.500" thickness="3px" />
      </Center>
    );
  }

  if (preview.isError || !preview.data) {
    return (
      <Center h="100dvh" px={4}>
        <EmptyState
          icon={FiSlash}
          title="This invite link is not valid"
          description="It may have been revoked, regenerated or expired. Ask an admin for a new link."
          actionLabel="Go to chats"
          onAction={() => router.push('/chat')}
        />
      </Center>
    );
  }

  const group = preview.data;

  return (
    <Center h="100dvh" px={4}>
      <Container maxW="sm" p={0}>
        <Box
          borderWidth="1px"
          borderColor={borderColor}
          borderRadius="xl"
          bg={cardBg}
          p={8}
          textAlign="center"
          boxShadow="lg"
        >
          <VStack spacing={4}>
            <Avatar
              size="xl"
              name={group.name ?? 'Group'}
              src={group.avatar ? absoluteUrl(group.avatar) : undefined}
              icon={<FiUsers />}
            />
            <Box>
              <Heading size="md">{group.name ?? 'Group chat'}</Heading>
              <Text fontSize="sm" color="gray.500" mt={1}>
                {group.memberCount} member{group.memberCount === 1 ? '' : 's'}
              </Text>
            </Box>

            {group.description && (
              <Text fontSize="sm" color="gray.500">
                {group.description}
              </Text>
            )}

            {group.isMember ? (
              <>
                <Text fontSize="sm">You are already a member of this group.</Text>
                <Button w="100%" onClick={() => router.push(`/chat/${group.chatId}`)}>
                  Open group
                </Button>
              </>
            ) : (
              <>
                <Text fontSize="sm" color="gray.500">
                  You have been invited to join this group.
                </Text>
                <Button
                  w="100%"
                  isLoading={join.isPending}
                  onClick={() =>
                    join.mutate(token, {
                      onSuccess: (chat) => {
                        toast({
                          title: `You joined "${chat.name ?? 'the group'}"`,
                          status: 'success',
                          duration: 3000,
                        });
                        router.push(`/chat/${chat.id}`);
                      },
                      onError: (error) =>
                        toast({
                          title: getApiErrorMessage(error),
                          status: 'error',
                          duration: 4000,
                        }),
                    })
                  }
                >
                  Join group
                </Button>
              </>
            )}

            <Button variant="ghost" colorScheme="gray" size="sm" onClick={() => router.push('/chat')}>
              Not now
            </Button>
          </VStack>
        </Box>
      </Container>
    </Center>
  );
}
