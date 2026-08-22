'use client';

import { Box, HStack, Skeleton, SkeletonCircle, SimpleGrid, VStack } from '@chakra-ui/react';

export function ChatListSkeleton({ count = 7 }: { count?: number }) {
  return (
    <VStack align="stretch" spacing={1} px={2} py={1} aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <HStack key={index} px={3} py={2.5} spacing={3}>
          <SkeletonCircle size="12" />
          <Box flex="1">
            <Skeleton height="10px" width={`${50 + ((index * 13) % 30)}%`} mb={2} />
            <Skeleton height="8px" width={`${65 + ((index * 7) % 25)}%`} />
          </Box>
        </HStack>
      ))}
    </VStack>
  );
}

export function MessageListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <VStack align="stretch" spacing={3} px={4} py={4} aria-hidden>
      {Array.from({ length: count }).map((_, index) => {
        const own = index % 3 === 0;
        return (
          <HStack key={index} justify={own ? 'flex-end' : 'flex-start'}>
            <Skeleton
              height={index % 4 === 0 ? '54px' : '34px'}
              width={`${35 + ((index * 11) % 35)}%`}
              borderRadius="xl"
            />
          </HStack>
        );
      })}
    </VStack>
  );
}

export function MediaGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <SimpleGrid columns={3} spacing={1.5} aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} borderRadius="md" pb="100%" />
      ))}
    </SimpleGrid>
  );
}

export function ListRowsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <VStack align="stretch" spacing={2} aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <HStack key={index} spacing={3} py={1.5}>
          <SkeletonCircle size="9" />
          <Box flex="1">
            <Skeleton height="9px" width="45%" mb={2} />
            <Skeleton height="7px" width="70%" />
          </Box>
        </HStack>
      ))}
    </VStack>
  );
}
