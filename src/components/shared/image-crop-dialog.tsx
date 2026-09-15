'use client';

import {
  Box,
  Button,
  HStack,
  Icon,
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Text,
  Tooltip,
  useToast,
} from '@chakra-ui/react';
import { useCallback, useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { FiRefreshCw, FiRotateCw, FiZoomIn, FiZoomOut } from 'react-icons/fi';
import { cropImageToFile } from '@/lib/crop-image';

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

interface ImageCropDialogProps {
  /** The picked file; the dialog is open while this is set. */
  file: File | null;
  onClose: () => void;
  /** Receives the cropped square image. Resolve once uploaded to close the dialog. */
  onCropped: (file: File) => Promise<void> | void;
  title?: string;
  /** Round preview for people, rounded square for groups. */
  shape?: 'round' | 'rect';
}

/**
 * Lets the user frame a picture before it becomes an avatar: drag to move,
 * pinch / scroll / slider to zoom, and rotate in 90° steps. The result is a
 * square JPEG, so avatars look right in every circle the app draws.
 */
export function ImageCropDialog({
  file,
  onClose,
  onCropped,
  title = 'Adjust photo',
  shape = 'round',
}: ImageCropDialogProps) {
  const toast = useToast();
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [rotation, setRotation] = useState(0);
  const [pixels, setPixels] = useState<Area | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // A fresh object URL (and a reset framing) for every picked file.
  useEffect(() => {
    if (!file) {
      setSrc(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(MIN_ZOOM);
    setRotation(0);
    setPixels(null);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setPixels(areaPixels);
  }, []);

  const reset = (): void => {
    setCrop({ x: 0, y: 0 });
    setZoom(MIN_ZOOM);
    setRotation(0);
  };

  const save = async (): Promise<void> => {
    if (!src || !pixels || !file) return;
    setIsSaving(true);
    let cropped: File;
    try {
      const baseName = file.name.replace(/\.[^.]+$/, '') || 'avatar';
      cropped = await cropImageToFile(src, pixels, rotation, { fileName: `${baseName}.jpg` });
    } catch (error) {
      // Only cropping errors are reported here; upload errors belong to the caller.
      toast({
        title: 'Could not prepare the photo',
        description: error instanceof Error ? error.message : undefined,
        status: 'error',
      });
      setIsSaving(false);
      return;
    }
    try {
      await onCropped(cropped);
      onClose();
    } catch {
      // The caller already showed the upload error; keep the dialog open to retry.
    } finally {
      setIsSaving(false);
    }
  };

  const changeZoom = (delta: number): void =>
    setZoom((value) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(value + delta).toFixed(2))));

  return (
    <Modal
      isOpen={!!file}
      onClose={isSaving ? () => undefined : onClose}
      size={{ base: 'full', sm: 'md' }}
      isCentered
      closeOnOverlayClick={!isSaving}
    >
      <ModalOverlay />
      <ModalContent overflow="hidden">
        <ModalHeader>{title}</ModalHeader>
        <ModalCloseButton isDisabled={isSaving} />
        <ModalBody px={0} pb={0} display="flex" flexDirection="column">
          <Box
            position="relative"
            w="100%"
            flex={{ base: '1', sm: 'none' }}
            minH={{ base: '280px', sm: 'auto' }}
            h={{ base: 'auto', sm: '360px' }}
            bg="gray.900"
            // Keep page scroll from fighting the drag / pinch gestures.
            sx={{ touchAction: 'none' }}
          >
            {src && (
              <Cropper
                image={src}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                minZoom={MIN_ZOOM}
                maxZoom={MAX_ZOOM}
                aspect={1}
                cropShape={shape}
                showGrid={false}
                // The photo covers the whole editing area (no letterbox bands), so
                // the frame is as big as the area and every drag shows photo.
                objectFit="cover"
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={onCropComplete}
              />
            )}
          </Box>

          <Box px={6} pt={4}>
            <Text fontSize="xs" color="text.muted" textAlign="center" mb={3}>
              Drag to reposition. Pinch, scroll or use the slider to zoom.
            </Text>
            <HStack spacing={3}>
              <IconButton
                aria-label="Zoom out"
                icon={<FiZoomOut />}
                size="sm"
                variant="ghost"
                onClick={() => changeZoom(-0.2)}
                isDisabled={zoom <= MIN_ZOOM}
              />
              <Slider
                aria-label="Zoom"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.01}
                value={zoom}
                onChange={setZoom}
                focusThumbOnChange={false}
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb boxSize={5} />
              </Slider>
              <IconButton
                aria-label="Zoom in"
                icon={<FiZoomIn />}
                size="sm"
                variant="ghost"
                onClick={() => changeZoom(0.2)}
                isDisabled={zoom >= MAX_ZOOM}
              />
            </HStack>
          </Box>
        </ModalBody>

        <ModalFooter gap={2} pb="max(1rem, env(safe-area-inset-bottom))">
          <Tooltip label="Rotate 90°">
            <Button
              aria-label="Rotate 90 degrees"
              leftIcon={<Icon as={FiRotateCw} />}
              variant="outline"
              colorScheme="gray"
              size="sm"
              onClick={() => setRotation((value) => (value + 90) % 360)}
              isDisabled={isSaving}
            >
              Rotate
            </Button>
          </Tooltip>
          <Button
            aria-label="Reset framing"
            leftIcon={<Icon as={FiRefreshCw} />}
            variant="ghost"
            colorScheme="gray"
            size="sm"
            onClick={reset}
            isDisabled={isSaving || (zoom === MIN_ZOOM && rotation === 0 && crop.x === 0 && crop.y === 0)}
          >
            Reset
          </Button>
          <Box flex="1" />
          <Button variant="ghost" colorScheme="gray" onClick={onClose} isDisabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={() => void save()} isLoading={isSaving} loadingText="Saving" isDisabled={!pixels}>
            Save photo
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
