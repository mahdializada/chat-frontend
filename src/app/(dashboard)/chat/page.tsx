'use client';

import { Center, Icon, Text, VStack } from '@chakra-ui/react';
import { FiMessageCircle } from 'react-icons/fi';

export default function ChatEmptyPage() {
  return (
    <Center h="100%" display={{ base: 'none', md: 'flex' }}>
      <VStack spacing={3} color="gray.500">
        <Icon as={FiMessageCircle} boxSize={12} />
        <Text fontWeight="semibold">Select a conversation</Text>
        <Text fontSize="sm">Choose a chat from the list or start a new one</Text>
      </VStack>
    </Center>
  );
}
