'use client';

import { Box, HStack, Image, Link, Text, useColorModeValue } from '@chakra-ui/react';
import type { MessageLink } from '@/types/api';

interface LinkPreviewCardProps {
  link: MessageLink;
  isOwn: boolean;
}

/**
 * Rich preview card for the first URL in a message. Metadata is fetched by the
 * server (SSRF-protected); a link with no usable metadata renders nothing here
 * and stays a plain inline link.
 */
export function LinkPreviewCard({ link, isOwn }: LinkPreviewCardProps) {
  const borderColor = useColorModeValue('blackAlpha.200', 'whiteAlpha.300');
  const preview = link.preview;

  if (!preview || preview.status !== 'OK' || (!preview.title && !preview.description)) {
    return null;
  }

  return (
    <Link
      href={link.url}
      isExternal
      rel="noopener noreferrer nofollow"
      _hover={{ textDecoration: 'none', opacity: 0.9 }}
      onClick={(event) => event.stopPropagation()}
      display="block"
      mt={1.5}
    >
      <Box
        borderWidth="1px"
        borderColor={isOwn ? 'whiteAlpha.400' : borderColor}
        borderLeftWidth="3px"
        borderLeftColor={isOwn ? 'whiteAlpha.700' : 'brand.400'}
        borderRadius="md"
        overflow="hidden"
        bg={isOwn ? 'whiteAlpha.200' : 'blackAlpha.50'}
        _dark={{ bg: isOwn ? 'whiteAlpha.200' : 'whiteAlpha.100' }}
        maxW="320px"
      >
        {preview.imageUrl && (
          <Image
            src={preview.imageUrl}
            alt=""
            w="100%"
            maxH="150px"
            objectFit="cover"
            loading="lazy"
            fallback={<Box />}
          />
        )}
        <Box px={2.5} py={2}>
          {preview.siteName && (
            <Text fontSize="0.65rem" opacity={0.75} noOfLines={1} textTransform="uppercase">
              {preview.siteName}
            </Text>
          )}
          {preview.title && (
            <Text fontSize="xs" fontWeight="semibold" noOfLines={2}>
              {preview.title}
            </Text>
          )}
          {preview.description && (
            <Text fontSize="xs" opacity={0.8} noOfLines={2} mt={0.5}>
              {preview.description}
            </Text>
          )}
          <HStack mt={1}>
            <Text fontSize="0.65rem" opacity={0.7} noOfLines={1}>
              {link.domain}
            </Text>
          </HStack>
        </Box>
      </Box>
    </Link>
  );
}
