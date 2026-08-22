'use client';

import {
  Box,
  HStack,
  SimpleGrid,
  Switch,
  Text,
  useColorMode,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { FiCheck } from 'react-icons/fi';
import { Icon } from '@chakra-ui/react';
import { getApiErrorMessage } from '@/lib/api-client';
import { requestNotificationPermission, getNotificationPermission } from '@/lib/notifications';
import { WALLPAPERS } from '@/lib/wallpapers';
import { useAuthStore } from '@/store/auth-store';
import type { ThemePreference } from '@/types/api';
import { useUpdatePreferences } from '../hooks/use-users';

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

/** Theme, chat wallpaper and notification preferences — all stored per account. */
export function AppearanceSettings() {
  const user = useAuthStore((s) => s.user);
  const updatePreferences = useUpdatePreferences();
  const { colorMode, setColorMode } = useColorMode();
  const toast = useToast();

  if (!user) return null;

  const onError = (error: unknown): void => {
    toast({ title: getApiErrorMessage(error), status: 'error', duration: 4000 });
  };

  const setTheme = (theme: ThemePreference): void => {
    setColorMode(theme);
    updatePreferences.mutate({ theme }, { onError });
  };

  const enableNotifications = async (enabled: boolean): Promise<void> => {
    if (enabled) {
      const permission = await requestNotificationPermission();
      if (permission === 'denied') {
        toast({
          title: 'Notifications are blocked',
          description: 'Allow notifications for this site in your browser settings.',
          status: 'warning',
          duration: 5000,
        });
        return;
      }
      if (permission === 'unsupported') {
        toast({
          title: 'Notifications are not supported in this browser',
          status: 'info',
          duration: 4000,
        });
        return;
      }
    }
    updatePreferences.mutate({ notificationsEnabled: enabled }, { onError });
  };

  return (
    <VStack align="stretch" spacing={6}>
      <Box>
        <Text fontSize="sm" fontWeight="medium" mb={2}>
          Theme
        </Text>
        <HStack spacing={2}>
          {THEMES.map((theme) => {
            const isActive = user.theme === theme.value;
            return (
              <Box
                key={theme.value}
                as="button"
                type="button"
                flex="1"
                py={2}
                borderRadius="md"
                borderWidth="2px"
                borderColor={isActive ? 'brand.400' : 'transparent'}
                bg={isActive ? 'brand.50' : 'blackAlpha.50'}
                _dark={{
                  bg: isActive ? 'whiteAlpha.200' : 'whiteAlpha.100',
                }}
                fontSize="sm"
                onClick={() => setTheme(theme.value)}
                aria-pressed={isActive}
              >
                {theme.label}
              </Box>
            );
          })}
        </HStack>
      </Box>

      <Box>
        <Text fontSize="sm" fontWeight="medium" mb={2}>
          Chat background
        </Text>
        <SimpleGrid columns={{ base: 3, sm: 6 }} spacing={2}>
          {WALLPAPERS.map((wallpaper) => {
            const isActive = (user.chatWallpaper ?? 'default') === wallpaper.id;
            return (
              <Box
                key={wallpaper.id}
                as="button"
                type="button"
                position="relative"
                h="52px"
                borderRadius="md"
                borderWidth="2px"
                borderColor={isActive ? 'brand.400' : 'blackAlpha.200'}
                background={colorMode === 'dark' ? wallpaper.dark : wallpaper.light}
                onClick={() => updatePreferences.mutate({ chatWallpaper: wallpaper.id }, { onError })}
                aria-label={`${wallpaper.name} background`}
                aria-pressed={isActive}
              >
                {isActive && (
                  <Box
                    position="absolute"
                    bottom={1}
                    right={1}
                    bg="brand.500"
                    color="white"
                    borderRadius="full"
                    p={0.5}
                  >
                    <Icon as={FiCheck} boxSize={2.5} aria-hidden />
                  </Box>
                )}
              </Box>
            );
          })}
        </SimpleGrid>
        <Text fontSize="xs" color="gray.500" mt={2}>
          {WALLPAPERS.find((w) => w.id === (user.chatWallpaper ?? 'default'))?.name}
        </Text>
      </Box>

      <VStack align="stretch" spacing={3}>
        <Text fontSize="sm" fontWeight="medium">
          Notifications
        </Text>
        <HStack justify="space-between" align="center" spacing={4}>
          <Box flex="1" minW={0}>
            <Text fontSize="sm">Desktop notifications</Text>
            <Text fontSize="xs" color="gray.500">
              Show a notification for new messages when the app is in the background. Muted chats
              stay silent.
            </Text>
          </Box>
          <Switch
            size="sm"
            isChecked={user.notificationsEnabled && getNotificationPermission() === 'granted'}
            aria-label="Desktop notifications"
            onChange={(event) => void enableNotifications(event.target.checked)}
          />
        </HStack>
        <HStack justify="space-between" align="center" spacing={4}>
          <Box flex="1" minW={0}>
            <Text fontSize="sm">Notification sound</Text>
            <Text fontSize="xs" color="gray.500">
              Play a sound with new-message notifications
            </Text>
          </Box>
          <Switch
            size="sm"
            isChecked={user.soundEnabled}
            aria-label="Notification sound"
            onChange={(event) =>
              updatePreferences.mutate({ soundEnabled: event.target.checked }, { onError })
            }
          />
        </HStack>
      </VStack>
    </VStack>
  );
}
