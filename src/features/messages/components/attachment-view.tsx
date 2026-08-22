'use client';

import { Box, HStack, Icon, Image, Link, SimpleGrid, Text, VStack } from '@chakra-ui/react';
import { useState } from 'react';
import { FiDownload, FiFile, FiPlay } from 'react-icons/fi';
import { MediaViewer, ViewerItem } from '@/features/media/components/media-viewer';
import { absoluteUrl } from '@/lib/env';
import { fileTypeLabel, formatFileSize } from '@/utils/format';
import type { Attachment, Message } from '@/types/api';
import { AudioPlayer } from './audio-player';

interface AttachmentViewProps {
  message: Message;
  isOwn: boolean;
}

/** Renders a message's attachments: image/video grid, audio player or file rows. */
export function AttachmentView({ message, isOwn }: AttachmentViewProps) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const attachments = message.attachments;
  if (attachments.length === 0) return null;

  const visual = attachments.filter(
    (a) => a.mimeType.startsWith('image/') || a.mimeType.startsWith('video/'),
  );
  const audio = attachments.filter(
    (a) => a.mimeType.startsWith('audio/') || (message.type === 'AUDIO' && a.mimeType === 'video/webm'),
  );
  const files = attachments.filter((a) => !visual.includes(a) && !audio.includes(a));

  const viewerItems: ViewerItem[] = visual.map((a) => ({
    id: a.id,
    url: a.url,
    mimeType: a.mimeType,
    originalName: a.originalName,
    createdAt: a.createdAt,
    sender: message.sender,
    messageId: message.id,
    width: a.width,
    height: a.height,
  }));

  // Stickers and GIFs render bare (no bubble padding, no download row).
  const isSticker = message.type === 'STICKER';

  return (
    <VStack align="stretch" spacing={1.5}>
      {visual.length > 0 && (
        <>
          <SimpleGrid columns={visual.length === 1 ? 1 : 2} spacing={1}>
            {visual.map((attachment, index) => (
              <Box
                key={attachment.id}
                as="button"
                type="button"
                position="relative"
                borderRadius={isSticker ? 'none' : 'lg'}
                overflow="hidden"
                onClick={() => setViewerIndex(index)}
                aria-label={`Open ${attachment.originalName}`}
                _focusVisible={{ outline: '2px solid', outlineColor: 'brand.300' }}
              >
                <Image
                  src={absoluteUrl(attachment.thumbnailUrl ?? attachment.url)}
                  alt={attachment.originalName}
                  maxH={isSticker ? '140px' : visual.length === 1 ? '300px' : '150px'}
                  w={isSticker ? 'auto' : '100%'}
                  objectFit={isSticker ? 'contain' : visual.length === 1 ? 'contain' : 'cover'}
                  loading="lazy"
                  fallback={
                    <Box
                      h="140px"
                      display="grid"
                      placeItems="center"
                      bg="blackAlpha.100"
                      _dark={{ bg: 'whiteAlpha.100' }}
                    >
                      <Icon as={FiFile} color="gray.400" />
                    </Box>
                  }
                />
                {attachment.mimeType.startsWith('video/') && (
                  <Box
                    position="absolute"
                    inset={0}
                    display="grid"
                    placeItems="center"
                    bg="blackAlpha.300"
                  >
                    <Box p={2.5} borderRadius="full" bg="blackAlpha.700">
                      <Icon as={FiPlay} color="white" boxSize={4} aria-hidden />
                    </Box>
                  </Box>
                )}
              </Box>
            ))}
          </SimpleGrid>

          <MediaViewer
            items={viewerItems}
            startIndex={viewerIndex ?? 0}
            isOpen={viewerIndex !== null}
            onClose={() => setViewerIndex(null)}
          />
        </>
      )}

      {audio.map((attachment) => (
        <AudioPlayer key={attachment.id} attachment={attachment} isOwn={isOwn} />
      ))}

      {files.map((attachment) => (
        <FileRow key={attachment.id} attachment={attachment} isOwn={isOwn} />
      ))}
    </VStack>
  );
}

function FileRow({ attachment, isOwn }: { attachment: Attachment; isOwn: boolean }) {
  return (
    <Link
      href={absoluteUrl(attachment.url)}
      isExternal
      download={attachment.originalName}
      rel="noopener noreferrer"
      _hover={{ textDecoration: 'none', opacity: 0.85 }}
      onClick={(event) => event.stopPropagation()}
    >
      <HStack
        p={2.5}
        borderRadius="lg"
        bg={isOwn ? 'whiteAlpha.300' : 'blackAlpha.100'}
        _dark={{ bg: isOwn ? 'whiteAlpha.300' : 'whiteAlpha.200' }}
        spacing={3}
        minW="200px"
      >
        <Box
          display="grid"
          placeItems="center"
          boxSize="34px"
          borderRadius="md"
          bg={isOwn ? 'whiteAlpha.400' : 'brand.50'}
          color={isOwn ? 'white' : 'brand.600'}
          _dark={{ bg: isOwn ? 'whiteAlpha.400' : 'whiteAlpha.300', color: 'inherit' }}
          flexShrink={0}
        >
          <Text fontSize="0.55rem" fontWeight="bold">
            {fileTypeLabel(attachment.mimeType, attachment.originalName)}
          </Text>
        </Box>
        <Box flex="1" minW={0}>
          <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
            {attachment.originalName}
          </Text>
          <Text fontSize="xs" opacity={0.75}>
            {formatFileSize(attachment.size)}
          </Text>
        </Box>
        <Icon as={FiDownload} boxSize={4} opacity={0.7} aria-hidden />
      </HStack>
    </Link>
  );
}
