'use client';

import { Center, Spinner } from '@chakra-ui/react';

export function FullPageSpinner() {
  return (
    <Center h="100dvh">
      <Spinner size="xl" color="brand.500" thickness="3px" />
    </Center>
  );
}
