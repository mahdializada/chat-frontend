'use client';

import {
  Box,
  Button,
  Container,
  Divider,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Heading,
  HStack,
  IconButton,
  Input,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Textarea,
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import NextLink from 'next/link';
import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { FiArrowLeft, FiCamera } from 'react-icons/fi';
import { UserAvatar } from '@/components/shared/user-avatar';
import { useChangePassword } from '@/features/auth/hooks/use-auth';
import {
  changePasswordSchema,
  ChangePasswordFormValues,
  profileSchema,
  ProfileFormValues,
} from '@/features/auth/schemas/auth-schemas';
import { ActiveSessions } from '@/features/users/components/active-sessions';
import { AppearanceSettings } from '@/features/users/components/appearance-settings';
import { BlockedContacts } from '@/features/users/components/blocked-contacts';
import { PrivacySettings } from '@/features/users/components/privacy-settings';
import { useUpdateProfile } from '@/features/users/hooks/use-users';
import { getApiErrorMessage } from '@/lib/api-client';
import { uploadsService } from '@/services/uploads-service';
import { usersService } from '@/features/users/services/users-service';
import { useAuthStore } from '@/store/auth-store';

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const toast = useToast();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const changePassword = useChangePassword();
  const updateProfile = useUpdateProfile();

  const cardBg = useColorModeValue('white', 'gray.750');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200');

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: user
      ? {
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          bio: user.bio ?? '',
        }
      : undefined,
  });

  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      const uploaded = await uploadsService.upload(file);
      return usersService.updateMe({ avatar: uploaded.url });
    },
    onSuccess: (updated) => {
      setUser(updated);
      toast({ title: 'Avatar updated', status: 'success', duration: 3000 });
    },
    onError: (error) =>
      toast({ title: getApiErrorMessage(error), status: 'error', duration: 4000 }),
  });

  const onProfileSubmit = profileForm.handleSubmit((values) => {
    updateProfile.mutate(
      { ...values, bio: values.bio || undefined },
      {
        onSuccess: () => toast({ title: 'Profile updated', status: 'success', duration: 3000 }),
        onError: (error) =>
          toast({ title: getApiErrorMessage(error), status: 'error', duration: 4000 }),
      },
    );
  });

  const onPasswordSubmit = passwordForm.handleSubmit((values) => {
    changePassword.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      {
        onSuccess: () => {
          passwordForm.reset();
          toast({
            title: 'Password changed',
            description: 'Your other devices have been signed out.',
            status: 'success',
            duration: 4000,
          });
        },
        onError: (error) =>
          toast({ title: getApiErrorMessage(error), status: 'error', duration: 4000 }),
      },
    );
  });

  if (!user) return null;

  return (
    <Box h="100dvh" overflowY="auto">
      <Container maxW="2xl" py={8}>
        <HStack mb={6} spacing={3}>
          <IconButton
            as={NextLink}
            href="/chat"
            aria-label="Back to chats"
            icon={<FiArrowLeft />}
            variant="ghost"
          />
          <Heading size="md">Profile &amp; settings</Heading>
        </HStack>

        {/* avatar header */}
        <HStack spacing={5} mb={8}>
          <Box position="relative">
            <UserAvatar user={user} size="xl" />
            <IconButton
              aria-label="Change avatar"
              icon={<FiCamera />}
              size="sm"
              borderRadius="full"
              position="absolute"
              bottom="0"
              right="0"
              isLoading={uploadAvatar.isPending}
              onClick={() => avatarInputRef.current?.click()}
            />
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) uploadAvatar.mutate(file);
                event.target.value = '';
              }}
            />
          </Box>
          <Box>
            <Text fontWeight="semibold" fontSize="lg">
              {user.firstName} {user.lastName}
            </Text>
            <Text fontSize="sm" color="gray.500">
              @{user.username} · {user.email}
            </Text>
          </Box>
        </HStack>

        <Tabs variant="soft-rounded" colorScheme="brand" size="sm" isLazy>
          <TabList mb={5} gap={2} overflowX="auto" pb={1}>
            <Tab flexShrink={0}>Profile</Tab>
            <Tab flexShrink={0}>Account</Tab>
            <Tab flexShrink={0}>Privacy</Tab>
            <Tab flexShrink={0}>Appearance</Tab>
          </TabList>

          <TabPanels>
            {/* ── profile ─────────────────────────────────────────────── */}
            <TabPanel px={0}>
              <SettingsCard bg={cardBg} borderColor={borderColor} title="Your details">
                <form onSubmit={onProfileSubmit} noValidate>
                  <Stack spacing={4}>
                    <HStack align="flex-start">
                      <FormControl isInvalid={!!profileForm.formState.errors.firstName}>
                        <FormLabel fontSize="sm">First name</FormLabel>
                        <Input size="sm" {...profileForm.register('firstName')} />
                        <FormErrorMessage>
                          {profileForm.formState.errors.firstName?.message}
                        </FormErrorMessage>
                      </FormControl>
                      <FormControl isInvalid={!!profileForm.formState.errors.lastName}>
                        <FormLabel fontSize="sm">Last name</FormLabel>
                        <Input size="sm" {...profileForm.register('lastName')} />
                        <FormErrorMessage>
                          {profileForm.formState.errors.lastName?.message}
                        </FormErrorMessage>
                      </FormControl>
                    </HStack>
                    <FormControl isInvalid={!!profileForm.formState.errors.username}>
                      <FormLabel fontSize="sm">Username</FormLabel>
                      <Input size="sm" {...profileForm.register('username')} />
                      <FormErrorMessage>
                        {profileForm.formState.errors.username?.message}
                      </FormErrorMessage>
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="sm">Email</FormLabel>
                      <Input size="sm" value={user.email} isReadOnly isDisabled />
                    </FormControl>
                    <FormControl isInvalid={!!profileForm.formState.errors.bio}>
                      <FormLabel fontSize="sm">About</FormLabel>
                      <Textarea
                        size="sm"
                        rows={3}
                        placeholder="A few words about you…"
                        {...profileForm.register('bio')}
                      />
                      <FormErrorMessage>{profileForm.formState.errors.bio?.message}</FormErrorMessage>
                    </FormControl>
                    <Button
                      type="submit"
                      alignSelf="flex-start"
                      size="sm"
                      isLoading={updateProfile.isPending}
                    >
                      Save changes
                    </Button>
                  </Stack>
                </form>
              </SettingsCard>
            </TabPanel>

            {/* ── account ─────────────────────────────────────────────── */}
            <TabPanel px={0}>
              <VStack align="stretch" spacing={5}>
                <SettingsCard bg={cardBg} borderColor={borderColor} title="Change password">
                  <form onSubmit={onPasswordSubmit} noValidate>
                    <Stack spacing={4}>
                      <FormControl isInvalid={!!passwordForm.formState.errors.currentPassword}>
                        <FormLabel fontSize="sm">Current password</FormLabel>
                        <Input
                          size="sm"
                          type="password"
                          autoComplete="current-password"
                          {...passwordForm.register('currentPassword')}
                        />
                        <FormErrorMessage>
                          {passwordForm.formState.errors.currentPassword?.message}
                        </FormErrorMessage>
                      </FormControl>
                      <FormControl isInvalid={!!passwordForm.formState.errors.newPassword}>
                        <FormLabel fontSize="sm">New password</FormLabel>
                        <Input
                          size="sm"
                          type="password"
                          autoComplete="new-password"
                          {...passwordForm.register('newPassword')}
                        />
                        <FormErrorMessage>
                          {passwordForm.formState.errors.newPassword?.message}
                        </FormErrorMessage>
                      </FormControl>
                      <FormControl isInvalid={!!passwordForm.formState.errors.confirmPassword}>
                        <FormLabel fontSize="sm">Confirm new password</FormLabel>
                        <Input
                          size="sm"
                          type="password"
                          autoComplete="new-password"
                          {...passwordForm.register('confirmPassword')}
                        />
                        <FormErrorMessage>
                          {passwordForm.formState.errors.confirmPassword?.message}
                        </FormErrorMessage>
                      </FormControl>
                      <Button
                        type="submit"
                        alignSelf="flex-start"
                        size="sm"
                        variant="outline"
                        isLoading={changePassword.isPending}
                      >
                        Update password
                      </Button>
                    </Stack>
                  </form>
                </SettingsCard>

                <SettingsCard
                  bg={cardBg}
                  borderColor={borderColor}
                  title="Active sessions"
                  helper="Devices currently signed in to your account."
                >
                  <ActiveSessions />
                </SettingsCard>
              </VStack>
            </TabPanel>

            {/* ── privacy ─────────────────────────────────────────────── */}
            <TabPanel px={0}>
              <VStack align="stretch" spacing={5}>
                <SettingsCard
                  bg={cardBg}
                  borderColor={borderColor}
                  title="Who can see my info"
                  helper="These rules are enforced by the server, not just hidden in the app."
                >
                  <PrivacySettings />
                </SettingsCard>

                <SettingsCard bg={cardBg} borderColor={borderColor} title="Blocked contacts">
                  <BlockedContacts />
                </SettingsCard>
              </VStack>
            </TabPanel>

            {/* ── appearance ──────────────────────────────────────────── */}
            <TabPanel px={0}>
              <SettingsCard bg={cardBg} borderColor={borderColor} title="Appearance">
                <AppearanceSettings />
              </SettingsCard>
            </TabPanel>
          </TabPanels>
        </Tabs>

        <Divider my={8} />
        <Text fontSize="xs" color="gray.500" textAlign="center">
          NexaChat · Keyboard shortcuts: Enter to send · Shift+Enter for a new line · Ctrl/⌘+K to
          search chats · Ctrl/⌘+F to search a conversation · Esc to close
        </Text>
      </Container>
    </Box>
  );
}

function SettingsCard({
  title,
  helper,
  children,
  bg,
  borderColor,
}: {
  title: string;
  helper?: string;
  children: React.ReactNode;
  bg: string;
  borderColor: string;
}) {
  return (
    <Box borderWidth="1px" borderColor={borderColor} borderRadius="xl" bg={bg} p={5}>
      <Heading size="sm" mb={helper ? 1 : 4}>
        {title}
      </Heading>
      {helper && (
        <Text fontSize="xs" color="gray.500" mb={4}>
          {helper}
        </Text>
      )}
      {children}
    </Box>
  );
}
