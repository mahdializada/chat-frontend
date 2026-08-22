'use client';

import { Box, Button, Center, Icon, Text, VStack } from '@chakra-ui/react';
import type { IconType } from 'react-icons';

interface EmptyStateProps {
  icon: IconType;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

/** Consistent "nothing here yet" panel used across lists and galleries. */
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
}: EmptyStateProps) {
  return (
    <Center py={compact ? 6 : 12} px={6}>
      <VStack spacing={compact ? 2 : 3} textAlign="center" maxW="320px">
        <Box
          p={compact ? 2.5 : 3.5}
          borderRadius="full"
          bg="blackAlpha.50"
          _dark={{ bg: 'whiteAlpha.100' }}
        >
          <Icon as={icon} boxSize={compact ? 5 : 7} color="gray.400" aria-hidden />
        </Box>
        <Text fontWeight="semibold" fontSize={compact ? 'sm' : 'md'}>
          {title}
        </Text>
        {description && (
          <Text fontSize="sm" color="gray.500">
            {description}
          </Text>
        )}
        {actionLabel && onAction && (
          <Button size="sm" mt={1} onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </VStack>
    </Center>
  );
}
