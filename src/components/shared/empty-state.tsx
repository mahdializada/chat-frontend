'use client';

import { Button, Center, HStack, Icon, Text, VStack } from '@chakra-ui/react';
import type { IconType } from 'react-icons';

interface EmptyStateProps {
  icon: IconType;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  compact?: boolean;
}

/** Consistent "nothing here yet" panel used across lists and galleries. */
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  compact = false,
}: EmptyStateProps) {
  return (
    <Center py={compact ? 6 : 12} px={6}>
      <VStack spacing={compact ? 2 : 3} textAlign="center" maxW="340px">
        <Center
          boxSize={compact ? '40px' : '56px'}
          borderRadius="full"
          bg="brand.50"
          _dark={{ bg: 'whiteAlpha.100' }}
        >
          <Icon as={icon} boxSize={compact ? 5 : 6} color="brand.500" aria-hidden />
        </Center>
        <Text fontWeight="semibold" fontSize={compact ? 'sm' : 'md'}>
          {title}
        </Text>
        {description && (
          <Text fontSize="sm" color="text.muted">
            {description}
          </Text>
        )}
        {actionLabel && onAction && (
          <HStack pt={1} spacing={2} flexWrap="wrap" justify="center">
            <Button size="sm" onClick={onAction}>
              {actionLabel}
            </Button>
            {secondaryActionLabel && onSecondaryAction && (
              <Button size="sm" variant="outline" colorScheme="gray" onClick={onSecondaryAction}>
                {secondaryActionLabel}
              </Button>
            )}
          </HStack>
        )}
      </VStack>
    </Center>
  );
}
