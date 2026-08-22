'use client';

import {
  Box,
  Center,
  HStack,
  IconButton,
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  Text,
  Tooltip,
  VStack,
} from '@chakra-ui/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiMessageSquare,
  FiRotateCcw,
  FiX,
  FiZoomIn,
  FiZoomOut,
} from 'react-icons/fi';
import { UserAvatar } from '@/components/shared/user-avatar';
import { absoluteUrl } from '@/lib/env';
import { formatFullDate, fullName } from '@/utils/format';
import type { BasicUser } from '@/types/api';

export interface ViewerItem {
  id: string;
  url: string;
  mimeType: string;
  originalName: string;
  createdAt: string;
  sender: BasicUser | null;
  messageId: string;
  width?: number | null;
  height?: number | null;
}

interface MediaViewerProps {
  items: ViewerItem[];
  startIndex: number;
  isOpen: boolean;
  onClose: () => void;
  /** Jump to the message the item was shared in. */
  onOpenMessage?: (messageId: string) => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.5;

/**
 * Full-screen viewer with keyboard navigation (← → Esc), zoom and download.
 * Videos play inline; zoom controls apply to images only.
 */
export function MediaViewer({
  items,
  startIndex,
  isOpen,
  onClose,
  onOpenMessage,
}: MediaViewerProps) {
  const [index, setIndex] = useState(startIndex);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIndex(startIndex);
      setZoom(MIN_ZOOM);
      setOffset({ x: 0, y: 0 });
    }
  }, [isOpen, startIndex]);

  const current = items[index];
  const isVideo = current?.mimeType.startsWith('video/');

  const goTo = useCallback(
    (next: number) => {
      if (next < 0 || next >= items.length) return;
      setIndex(next);
      setZoom(MIN_ZOOM);
      setOffset({ x: 0, y: 0 });
    },
    [items.length],
  );

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goTo(index - 1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goTo(index + 1);
      } else if (event.key === '+' || event.key === '=') {
        setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP));
      } else if (event.key === '-') {
        setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP));
      } else if (event.key === '0') {
        setZoom(MIN_ZOOM);
        setOffset({ x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, index, goTo]);

  if (!current) return null;
  const url = absoluteUrl(current.url);

  const startDrag = (event: React.MouseEvent): void => {
    if (zoom === MIN_ZOOM) return;
    dragRef.current = { x: event.clientX - offset.x, y: event.clientY - offset.y };
  };
  const onDrag = (event: React.MouseEvent): void => {
    if (!dragRef.current) return;
    setOffset({ x: event.clientX - dragRef.current.x, y: event.clientY - dragRef.current.y });
  };
  const endDrag = (): void => {
    dragRef.current = null;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full" motionPreset="none">
      <ModalOverlay bg="blackAlpha.900" />
      <ModalContent bg="transparent" boxShadow="none" m={0}>
        <ModalBody p={0} position="relative" h="100dvh" overflow="hidden">
          {/* top bar: sender, date, actions */}
          <HStack
            position="absolute"
            top={0}
            left={0}
            right={0}
            zIndex={2}
            px={{ base: 3, md: 5 }}
            py={3}
            spacing={3}
            bgGradient="linear(to-b, blackAlpha.800, transparent)"
            color="white"
          >
            <UserAvatar user={current.sender} size="sm" />
            <VStack align="flex-start" spacing={0} flex="1" minW={0}>
              <Text fontSize="sm" fontWeight="semibold" noOfLines={1}>
                {current.sender ? fullName(current.sender) : 'Unknown sender'}
              </Text>
              <Text fontSize="xs" opacity={0.8} noOfLines={1}>
                {formatFullDate(current.createdAt)}
                {items.length > 1 && ` · ${index + 1} of ${items.length}`}
              </Text>
            </VStack>

            {!isVideo && (
              <>
                <Tooltip label="Zoom out (−)">
                  <IconButton
                    aria-label="Zoom out"
                    icon={<FiZoomOut />}
                    variant="ghost"
                    colorScheme="whiteAlpha"
                    color="white"
                    size="sm"
                    isDisabled={zoom <= MIN_ZOOM}
                    onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP))}
                  />
                </Tooltip>
                <Tooltip label="Zoom in (+)">
                  <IconButton
                    aria-label="Zoom in"
                    icon={<FiZoomIn />}
                    variant="ghost"
                    colorScheme="whiteAlpha"
                    color="white"
                    size="sm"
                    isDisabled={zoom >= MAX_ZOOM}
                    onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))}
                  />
                </Tooltip>
                {zoom > MIN_ZOOM && (
                  <Tooltip label="Reset zoom (0)">
                    <IconButton
                      aria-label="Reset zoom"
                      icon={<FiRotateCcw />}
                      variant="ghost"
                      colorScheme="whiteAlpha"
                      color="white"
                      size="sm"
                      onClick={() => {
                        setZoom(MIN_ZOOM);
                        setOffset({ x: 0, y: 0 });
                      }}
                    />
                  </Tooltip>
                )}
              </>
            )}

            {onOpenMessage && (
              <Tooltip label="Show in conversation">
                <IconButton
                  aria-label="Show in conversation"
                  icon={<FiMessageSquare />}
                  variant="ghost"
                  colorScheme="whiteAlpha"
                  color="white"
                  size="sm"
                  onClick={() => {
                    onOpenMessage(current.messageId);
                    onClose();
                  }}
                />
              </Tooltip>
            )}
            <Tooltip label="Download">
              <IconButton
                as="a"
                href={url}
                download={current.originalName}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Download"
                icon={<FiDownload />}
                variant="ghost"
                colorScheme="whiteAlpha"
                color="white"
                size="sm"
              />
            </Tooltip>
            <Tooltip label="Close (Esc)">
              <IconButton
                aria-label="Close"
                icon={<FiX />}
                variant="ghost"
                colorScheme="whiteAlpha"
                color="white"
                size="sm"
                onClick={onClose}
              />
            </Tooltip>
          </HStack>

          {/* media */}
          <Center
            h="100%"
            onMouseDown={startDrag}
            onMouseMove={onDrag}
            onMouseUp={endDrag}
            onMouseLeave={endDrag}
            cursor={zoom > MIN_ZOOM ? (dragRef.current ? 'grabbing' : 'grab') : 'default'}
          >
            {isVideo ? (
              <Box
                as="video"
                src={url}
                controls
                autoPlay
                maxH="86vh"
                maxW="92vw"
                borderRadius="md"
              />
            ) : (
              <Box
                as="img"
                src={url}
                alt={current.originalName}
                maxH="100vh"
                maxW="100vw"
                objectFit="contain"
                userSelect="none"
                draggable={false}
                transform={`translate(${offset.x}px, ${offset.y}px) scale(${zoom})`}
                transition={dragRef.current ? undefined : 'transform 0.15s ease-out'}
              />
            )}
          </Center>

          {/* prev / next */}
          {index > 0 && (
            <IconButton
              aria-label="Previous"
              icon={<FiChevronLeft size={26} />}
              position="absolute"
              left={{ base: 1, md: 4 }}
              top="50%"
              transform="translateY(-50%)"
              borderRadius="full"
              variant="solid"
              colorScheme="blackAlpha"
              color="white"
              onClick={() => goTo(index - 1)}
            />
          )}
          {index < items.length - 1 && (
            <IconButton
              aria-label="Next"
              icon={<FiChevronRight size={26} />}
              position="absolute"
              right={{ base: 1, md: 4 }}
              top="50%"
              transform="translateY(-50%)"
              borderRadius="full"
              variant="solid"
              colorScheme="blackAlpha"
              color="white"
              onClick={() => goTo(index + 1)}
            />
          )}

          <Text
            position="absolute"
            bottom={3}
            left={0}
            right={0}
            textAlign="center"
            fontSize="xs"
            color="whiteAlpha.700"
            display={{ base: 'none', md: 'block' }}
          >
            ← → to browse · Esc to close{!isVideo && ' · + / − to zoom'}
          </Text>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
