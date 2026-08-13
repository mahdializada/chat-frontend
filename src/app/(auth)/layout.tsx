'use client';

import { Box, Center, Container, Heading, HStack, Icon, useColorModeValue } from '@chakra-ui/react';
import { FiMessageCircle } from 'react-icons/fi';
import { GuestGuard } from '@/components/shared/auth-guard';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const cardBg = useColorModeValue('white', 'gray.800');
  const pageBg = useColorModeValue('gray.50', 'gray.900');

  return (
    <GuestGuard>
      <Center minH="100dvh" bg={pageBg} px={4}>
        <Container maxW="md" py={10}>
          <HStack justify="center" mb={8} spacing={3}>
            <Icon as={FiMessageCircle} boxSize={8} color="brand.500" />
            <Heading size="lg">Chat</Heading>
          </HStack>
          <Box bg={cardBg} borderRadius="2xl" boxShadow="lg" p={{ base: 6, md: 8 }}>
            {children}
          </Box>
        </Container>
      </Center>
    </GuestGuard>
  );
}
