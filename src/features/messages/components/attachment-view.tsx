'use client';

import {
  Box,
  HStack,
  Icon,
  Image,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  Text,
  useDisclosure,
  VStack,
} from '@chakra-ui/react';
import { FiDownload, FiFile } from 'react-icons/fi';
import { absoluteUrl } from '@/lib/env';
import { formatFileSize } from '@/utils/format';
import type { Attachment } from '@/types/api';
import { AudioPlayer } from './audio-player';

interface AttachmentViewProps {
  attachments: Attachment[];
  isOwn: boolean;
}

export function AttachmentView({ attachments, isOwn }: AttachmentViewProps) {
  if (attachments.length === 0) return null;
  return (
    <VStack align="stretch" spacing={2}>
      {attachments.map((attachment) => (
        <SingleAttachment key={attachment.id} attachment={attachment} isOwn={isOwn} />
      ))}
    </VStack>
  );
}

function SingleAttachment({ attachment, isOwn }: { attachment: Attachment; isOwn: boolean }) {
  const preview = useDisclosure();
  const url = absoluteUrl(attachment.url);

  if (attachment.mimeType.startsWith('image/')) {
    return (
      <>
        <Image
          src={url}
          alt={attachment.originalName}
          borderRadius="lg"
          maxH="280px"
          maxW="100%"
          objectFit="cover"
          cursor="pointer"
          onClick={preview.onOpen}
          fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='140'%3E%3Crect fill='%23ccc' width='200' height='140'/%3E%3C/svg%3E"
        />
        <Modal isOpen={preview.isOpen} onClose={preview.onClose} size="4xl" isCentered>
          <ModalOverlay bg="blackAlpha.800" />
          <ModalContent bg="transparent" boxShadow="none" mx={4}>
            <ModalCloseButton color="white" />
            <ModalBody p={0} display="flex" justifyContent="center">
              <Image
                src={url}
                alt={attachment.originalName}
                maxH="85vh"
                objectFit="contain"
                borderRadius="md"
              />
            </ModalBody>
          </ModalContent>
        </Modal>
      </>
    );
  }

  if (attachment.mimeType.startsWith('audio/') || attachment.mimeType === 'video/webm') {
    return <AudioPlayer attachment={attachment} isOwn={isOwn} />;
  }

  return (
    <Link href={url} isExternal download={attachment.originalName} _hover={{ textDecoration: 'none' }}>
      <HStack
        p={2.5}
        borderRadius="lg"
        bg={isOwn ? 'whiteAlpha.300' : 'blackAlpha.100'}
        spacing={3}
        _hover={{ opacity: 0.85 }}
      >
        <Icon as={FiFile} boxSize={5} />
        <Box flex="1" minW={0}>
          <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
            {attachment.originalName}
          </Text>
          <Text fontSize="xs" opacity={0.7}>
            {formatFileSize(attachment.size)}
          </Text>
        </Box>
        <Icon as={FiDownload} boxSize={4} opacity={0.7} />
      </HStack>
    </Link>
  );
}
