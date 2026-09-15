'use client';

import {
  Box,
  Button,
  Center,
  HStack,
  Icon,
  Input,
  SimpleGrid,
  Switch,
  Text,
  Tooltip,
  useColorMode,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';
import type { IconType } from 'react-icons';
import { FiCheck, FiMonitor, FiMoon, FiRotateCcw, FiSun } from 'react-icons/fi';
import { WallpaperPicker } from '@/components/shared/wallpaper-picker';
import { ACCENT_PRESETS, DEFAULT_ACCENT } from '@/lib/accent';
import { getApiErrorMessage } from '@/lib/api-client';
import { generatePalette, isHexColor } from '@/lib/color';
import { getNotificationPermission, requestNotificationPermission } from '@/lib/notifications';
import { useAuthStore } from '@/store/auth-store';
import type { SelfUser, ThemePreference } from '@/types/api';
import { useUpdatePreferences } from '../hooks/use-users';
import type { UpdatePreferencesInput } from '../services/users-service';

const THEMES: { value: ThemePreference; label: string; icon: IconType }[] = [
  { value: 'light', label: 'Light', icon: FiSun },
  { value: 'dark', label: 'Dark', icon: FiMoon },
  { value: 'system', label: 'System', icon: FiMonitor },
];

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Box>
      <Text fontSize="sm" fontWeight="semibold">
        {title}
      </Text>
      {description && (
        <Text fontSize="xs" color="text.muted" mt={0.5}>
          {description}
        </Text>
      )}
      <Box mt={3}>{children}</Box>
    </Box>
  );
}

/** Theme, accent colour, chat wallpaper and notification preferences — all stored per account. */
export function AppearanceSettings() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const updatePreferences = useUpdatePreferences();
  const { setColorMode } = useColorMode();
  const toast = useToast();

  const currentAccent = (user?.accentColor ?? DEFAULT_ACCENT).toLowerCase();
  const [customAccent, setCustomAccent] = useState(currentAccent);
  const [hexDraft, setHexDraft] = useState(currentAccent.toUpperCase());

  useEffect(() => {
    setCustomAccent(currentAccent);
    setHexDraft(currentAccent.toUpperCase());
  }, [currentAccent]);

  // Preview with the same contrast-adjusted shade the theme will use.
  const customPreview = useMemo(
    () => (customAccent === DEFAULT_ACCENT ? DEFAULT_ACCENT : generatePalette(customAccent)['500']),
    [customAccent],
  );

  if (!user) return null;

  const onError = (error: unknown): void => {
    toast({ title: "Couldn't save your preference", description: getApiErrorMessage(error), status: 'error' });
  };

  /** Applies a preference immediately and rolls it back if the server rejects it. */
  const save = (patch: UpdatePreferencesInput): void => {
    const previous = useAuthStore.getState().user;
    if (previous) setUser({ ...previous, ...patch } as SelfUser);
    updatePreferences.mutate(patch, {
      onError: (error) => {
        if (previous) setUser(previous);
        onError(error);
      },
    });
  };

  const setTheme = (theme: ThemePreference): void => {
    setColorMode(theme);
    save({ theme });
  };

  const setAccent = (hex: string | null): void => {
    const normalized = hex?.toLowerCase() ?? null;
    save({ accentColor: normalized === DEFAULT_ACCENT ? null : normalized });
  };

  const commitHexDraft = (): void => {
    const value = hexDraft.trim().startsWith('#') ? hexDraft.trim() : `#${hexDraft.trim()}`;
    if (isHexColor(value)) {
      setCustomAccent(value.toLowerCase());
      setHexDraft(value.toUpperCase());
    } else {
      setHexDraft(customAccent.toUpperCase());
      toast({ title: 'Use a 6-digit hex colour, like #2F7CF6', status: 'warning' });
    }
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
        toast({ title: 'Notifications are not supported in this browser', status: 'info' });
        return;
      }
    }
    save({ notificationsEnabled: enabled });
  };

  const isPresetAccent = ACCENT_PRESETS.some((preset) => preset.value === currentAccent);

  return (
    <VStack align="stretch" spacing={8}>
      <Section title="Theme" description="Light, dark, or follow your device.">
        <SimpleGrid columns={3} spacing={2}>
          {THEMES.map((theme) => {
            const isActive = user.theme === theme.value;
            return (
              <Box
                key={theme.value}
                as="button"
                type="button"
                py={3}
                borderRadius="lg"
                borderWidth="2px"
                borderColor={isActive ? 'brand.500' : 'border.subtle'}
                bg={isActive ? 'bg.active' : 'transparent'}
                _hover={{ bg: isActive ? 'bg.active' : 'bg.hover' }}
                onClick={() => setTheme(theme.value)}
                aria-pressed={isActive}
              >
                <VStack spacing={1}>
                  <Icon as={theme.icon} boxSize={5} color={isActive ? 'brand.500' : 'text.muted'} aria-hidden />
                  <Text fontSize="sm" fontWeight={isActive ? 'semibold' : 'normal'}>
                    {theme.label}
                  </Text>
                </VStack>
              </Box>
            );
          })}
        </SimpleGrid>
      </Section>

      <Section
        title="Accent colour"
        description="Used for buttons, your message bubbles, links and highlights."
      >
        <SimpleGrid columns={{ base: 7, sm: 13 }} spacing={2} maxW="560px">
          {ACCENT_PRESETS.map((preset) => {
            const isActive = currentAccent === preset.value;
            return (
              <Tooltip key={preset.value} label={preset.name} openDelay={300}>
                <Center
                  as="button"
                  type="button"
                  boxSize="36px"
                  borderRadius="full"
                  bg={preset.value}
                  color="white"
                  boxShadow={isActive ? '0 0 0 2px var(--chakra-colors-bg-surface), 0 0 0 4px currentColor' : undefined}
                  sx={isActive ? { color: preset.value } : undefined}
                  transition="transform 0.1s"
                  _hover={{ transform: 'scale(1.08)' }}
                  aria-label={`${preset.name} accent`}
                  aria-pressed={isActive}
                  onClick={() => setAccent(preset.value)}
                >
                  {isActive && <Icon as={FiCheck} boxSize={4} color="white" aria-hidden />}
                </Center>
              </Tooltip>
            );
          })}
        </SimpleGrid>

        <HStack
          mt={4}
          spacing={3}
          p={3}
          borderWidth="1px"
          borderRadius="lg"
          borderColor={!isPresetAccent ? 'brand.500' : 'border.subtle'}
          flexWrap={{ base: 'wrap', sm: 'nowrap' }}
        >
          <Box
            as="label"
            position="relative"
            boxSize="40px"
            flexShrink={0}
            borderRadius="md"
            borderWidth="1px"
            borderColor="border.subtle"
            bg={customAccent}
            cursor="pointer"
          >
            <Input
              type="color"
              value={customAccent}
              onChange={(event) => {
                setCustomAccent(event.target.value);
                setHexDraft(event.target.value.toUpperCase());
              }}
              position="absolute"
              inset={0}
              w="100%"
              h="100%"
              p={0}
              opacity={0}
              cursor="pointer"
              aria-label="Choose a custom accent colour"
            />
          </Box>
          <Box flex="1" minW="120px">
            <Text fontSize="sm" fontWeight="medium">
              Custom colour
            </Text>
            <Input
              size="xs"
              mt={1}
              maxW="110px"
              fontFamily="mono"
              value={hexDraft}
              onChange={(event) => setHexDraft(event.target.value)}
              onBlur={commitHexDraft}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commitHexDraft();
              }}
              aria-label="Accent colour hex code"
            />
          </Box>
          <HStack spacing={2} aria-hidden>
            <Box bg={customPreview} color="white" fontSize="xs" fontWeight="semibold" px={3} py={1.5} borderRadius="lg">
              Button
            </Box>
            <Box bg={customPreview} color="white" fontSize="xs" px={3} py={1.5} borderRadius="2xl" borderBottomRightRadius="sm">
              Hello 👋
            </Box>
          </HStack>
          <Button size="sm" onClick={() => setAccent(customAccent)} isDisabled={customAccent === currentAccent}>
            Apply
          </Button>
        </HStack>

        {user.accentColor && (
          <Button
            mt={2}
            size="xs"
            variant="ghost"
            colorScheme="gray"
            leftIcon={<FiRotateCcw />}
            onClick={() => setAccent(null)}
          >
            Reset to NexaChat blue
          </Button>
        )}
      </Section>

      <Section
        title="Chat wallpaper"
        description="Your default background for every chat. You can also set one per chat from its menu."
      >
        <WallpaperPicker
          value={user.chatWallpaper}
          onChange={(value) => save({ chatWallpaper: value })}
          isSaving={updatePreferences.isPending}
        />
      </Section>

      <Section title="Notifications">
        <VStack align="stretch" spacing={3}>
          <HStack justify="space-between" align="center" spacing={4}>
            <Box flex="1" minW={0}>
              <Text fontSize="sm">Desktop notifications</Text>
              <Text fontSize="xs" color="text.muted">
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
              <Text fontSize="xs" color="text.muted">
                Play a sound with new-message notifications
              </Text>
            </Box>
            <Switch
              size="sm"
              isChecked={user.soundEnabled}
              aria-label="Notification sound"
              onChange={(event) => save({ soundEnabled: event.target.checked })}
            />
          </HStack>
        </VStack>
      </Section>
    </VStack>
  );
}
