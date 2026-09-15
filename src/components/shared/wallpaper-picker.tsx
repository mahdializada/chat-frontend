'use client';

import {
  Box,
  Button,
  Center,
  HStack,
  Icon,
  Input,
  SimpleGrid,
  Spinner,
  Text,
  Tooltip,
  useColorMode,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';
import { FiCheck, FiImage } from 'react-icons/fi';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  colorWallpaper,
  parseWallpaper,
  WALLPAPER_CATEGORIES,
  wallpaperBackground,
  wallpaperLabel,
  WALLPAPERS,
} from '@/lib/wallpapers';
import { uploadsService } from '@/services/uploads-service';

const MAX_WALLPAPER_MB = 10;

/** A slice of conversation drawn on a wallpaper, so choices can be judged in context. */
export function WallpaperPreview({
  value,
  height = '150px',
}: {
  value: string | null | undefined;
  height?: string;
}) {
  const { colorMode } = useColorMode();
  return (
    <Box
      h={height}
      borderRadius="xl"
      overflow="hidden"
      borderWidth="1px"
      borderColor="border.subtle"
      background={wallpaperBackground(value, colorMode === 'dark')}
      px={4}
      py={4}
      aria-hidden
    >
      <VStack align="stretch" spacing={2} h="100%" justify="flex-end">
        <Box
          alignSelf="flex-start"
          maxW="75%"
          bg="bubble.other"
          borderRadius="2xl"
          borderBottomLeftRadius="sm"
          px={3}
          py={1.5}
          boxShadow="bubble"
          fontSize="xs"
        >
          Hey! How does this look?
        </Box>
        <Box
          alignSelf="flex-end"
          maxW="75%"
          bg="bubble.own"
          color="white"
          borderRadius="2xl"
          borderBottomRightRadius="sm"
          px={3}
          py={1.5}
          boxShadow="bubble"
          fontSize="xs"
        >
          Looks great 👌
        </Box>
      </VStack>
    </Box>
  );
}

function Tile({
  label,
  background,
  isActive,
  onClick,
}: {
  label: string;
  background: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip label={label} openDelay={300}>
      <Box
        as="button"
        type="button"
        position="relative"
        h="56px"
        borderRadius="lg"
        borderWidth="2px"
        borderColor={isActive ? 'brand.500' : 'border.subtle'}
        background={background}
        aria-label={label}
        aria-pressed={isActive}
        overflow="hidden"
        transition="transform 0.1s"
        _hover={{ transform: 'scale(1.04)' }}
        onClick={onClick}
      >
        {isActive && (
          <Center
            position="absolute"
            bottom={1}
            right={1}
            boxSize="18px"
            borderRadius="full"
            bg="brand.500"
            color="white"
          >
            <Icon as={FiCheck} boxSize={3} aria-hidden />
          </Center>
        )}
      </Box>
    </Tooltip>
  );
}

interface WallpaperPickerProps {
  /** Current value; null means "not set" (the default, or the inherited one). */
  value: string | null;
  onChange: (value: string | null) => void;
  /** For a single chat: the account default that applies when `value` is null. */
  inheritedValue?: string | null;
  /** Shown as a "use the default" option when set, e.g. "Use my default". */
  inheritLabel?: string;
  isSaving?: boolean;
}

/** Wallpaper chooser: live preview, preset groups, a custom colour and an uploaded photo. */
export function WallpaperPicker({
  value,
  onChange,
  inheritedValue = null,
  inheritLabel,
  isSaving = false,
}: WallpaperPickerProps) {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const parsed = parseWallpaper(value);
  const [customColor, setCustomColor] = useState(parsed.kind === 'color' ? parsed.color : '#dce6f2');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (parsed.kind === 'color') setCustomColor(parsed.color);
    // Only follow external changes to the stored colour.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const effective = value ?? inheritedValue;
  const isInheriting = !!inheritLabel && value === null;

  const handleUpload = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please choose an image file', status: 'warning' });
      return;
    }
    if (file.size > MAX_WALLPAPER_MB * 1024 * 1024) {
      toast({ title: `Photos must be ${MAX_WALLPAPER_MB} MB or smaller`, status: 'warning' });
      return;
    }
    setIsUploading(true);
    try {
      const uploaded = await uploadsService.upload(file);
      onChange(uploaded.url);
    } catch (error) {
      toast({
        title: "Couldn't upload the photo",
        description: getApiErrorMessage(error),
        status: 'error',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <VStack align="stretch" spacing={5}>
      <Box>
        <WallpaperPreview value={effective} />
        <HStack mt={2} justify="space-between" minH="20px">
          <Text fontSize="xs" color="text.muted">
            {isInheriting ? `${inheritLabel} · ${wallpaperLabel(inheritedValue)}` : wallpaperLabel(value)}
          </Text>
          {isSaving && <Spinner size="xs" color="brand.500" aria-label="Saving" />}
        </HStack>
      </Box>

      {inheritLabel && (
        <Button
          size="sm"
          alignSelf="flex-start"
          variant={isInheriting ? 'solid' : 'outline'}
          colorScheme={isInheriting ? 'brand' : 'gray'}
          leftIcon={isInheriting ? <FiCheck /> : undefined}
          onClick={() => onChange(null)}
        >
          {inheritLabel}
        </Button>
      )}

      {WALLPAPER_CATEGORIES.map((category) => (
        <Box key={category.id}>
          <Text
            fontSize="0.7rem"
            fontWeight="bold"
            color="text.muted"
            textTransform="uppercase"
            letterSpacing="0.05em"
            mb={2}
          >
            {category.label}
          </Text>
          <SimpleGrid columns={{ base: 4, sm: 6 }} spacing={2}>
            {WALLPAPERS.filter((wallpaper) => wallpaper.category === category.id).map(
              (wallpaper) => (
                <Tile
                  key={wallpaper.id}
                  label={wallpaper.name}
                  background={isDark ? wallpaper.dark : wallpaper.light}
                  isActive={
                    value === wallpaper.id ||
                    (!inheritLabel && value === null && wallpaper.id === 'default')
                  }
                  onClick={() => onChange(wallpaper.id)}
                />
              ),
            )}
          </SimpleGrid>
        </Box>
      ))}

      <Box>
        <Text
          fontSize="0.7rem"
          fontWeight="bold"
          color="text.muted"
          textTransform="uppercase"
          letterSpacing="0.05em"
          mb={2}
        >
          Your own
        </Text>
        <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
          <HStack
            borderWidth="1px"
            borderColor={parsed.kind === 'color' ? 'brand.500' : 'border.subtle'}
            borderRadius="lg"
            p={3}
            spacing={3}
          >
            <Box
              as="label"
              position="relative"
              boxSize="40px"
              flexShrink={0}
              borderRadius="md"
              borderWidth="1px"
              borderColor="border.subtle"
              bg={customColor}
              cursor="pointer"
            >
              <Input
                type="color"
                value={customColor}
                onChange={(event) => setCustomColor(event.target.value)}
                position="absolute"
                inset={0}
                w="100%"
                h="100%"
                p={0}
                opacity={0}
                cursor="pointer"
                aria-label="Choose a wallpaper colour"
              />
            </Box>
            <Box flex="1" minW={0}>
              <Text fontSize="sm" fontWeight="medium">
                Solid colour
              </Text>
              <Text fontSize="xs" color="text.muted">
                {customColor.toUpperCase()}
              </Text>
            </Box>
            <Button size="sm" variant="outline" onClick={() => onChange(colorWallpaper(customColor))}>
              Use
            </Button>
          </HStack>

          <HStack
            borderWidth="1px"
            borderColor={parsed.kind === 'image' ? 'brand.500' : 'border.subtle'}
            borderRadius="lg"
            p={3}
            spacing={3}
          >
            <Center
              boxSize="40px"
              flexShrink={0}
              borderRadius="md"
              bg="bg.muted"
              overflow="hidden"
              background={parsed.kind === 'image' ? wallpaperBackground(value, isDark) : undefined}
            >
              {parsed.kind !== 'image' && <Icon as={FiImage} color="text.muted" aria-hidden />}
            </Center>
            <Box flex="1" minW={0}>
              <Text fontSize="sm" fontWeight="medium">
                Photo
              </Text>
              <Text fontSize="xs" color="text.muted">
                JPG, PNG or WebP up to {MAX_WALLPAPER_MB} MB
              </Text>
            </Box>
            <Button
              size="sm"
              variant="outline"
              isLoading={isUploading}
              onClick={() => fileRef.current?.click()}
            >
              Upload
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                void handleUpload(file);
              }}
            />
          </HStack>
        </SimpleGrid>
      </Box>
    </VStack>
  );
}
