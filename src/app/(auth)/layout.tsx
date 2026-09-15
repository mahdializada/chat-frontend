'use client';

import { Box, Center, Flex, Heading, HStack, Icon, Stack, Text } from '@chakra-ui/react';
import { FiImage, FiLock, FiUsers, FiZap } from 'react-icons/fi';
import { GuestGuard } from '@/components/shared/auth-guard';
import { BrandLogo } from '@/components/shared/brand-logo';
import { APP_NAME } from '@/lib/brand';

const HIGHLIGHTS = [
  { icon: FiZap, title: 'Instant delivery', text: 'Messages, typing and read receipts update live.' },
  { icon: FiUsers, title: 'Groups with roles', text: 'Owners, admins and members, with invite links.' },
  { icon: FiImage, title: 'Photos, files and voice', text: 'Share media and record voice notes in a tap.' },
  { icon: FiLock, title: 'Private by design', text: 'Blocking, privacy controls and per-device sessions.' },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <GuestGuard>
      <Flex minH="100dvh" bg="bg.canvas">
        {/* Brand panel — desktop only. */}
        <Flex
          display={{ base: 'none', lg: 'flex' }}
          flex="1"
          direction="column"
          justify="space-between"
          position="relative"
          overflow="hidden"
          p={12}
          color="white"
          bgGradient="linear(135deg, brand.600, brand.800)"
        >
          <Box
            position="absolute"
            top="-120px"
            right="-120px"
            boxSize="420px"
            borderRadius="full"
            bg="whiteAlpha.100"
            aria-hidden
          />
          <Box
            position="absolute"
            bottom="-160px"
            left="-80px"
            boxSize="380px"
            borderRadius="full"
            bg="blackAlpha.200"
            aria-hidden
          />
          <Box position="relative">
            <BrandLogo size="lg" color="white" />
          </Box>
          <Box position="relative" maxW="460px">
            <Heading size="2xl" lineHeight="1.15" mb={4} letterSpacing="-0.02em">
              Conversations that keep up with you.
            </Heading>
            <Text fontSize="lg" opacity={0.85} mb={10}>
              Real-time messaging for friends and teams — on every device.
            </Text>
            <Stack spacing={5}>
              {HIGHLIGHTS.map((item) => (
                <HStack key={item.title} align="flex-start" spacing={4}>
                  <Center boxSize="40px" borderRadius="lg" bg="whiteAlpha.200" flexShrink={0}>
                    <Icon as={item.icon} boxSize={5} aria-hidden />
                  </Center>
                  <Box>
                    <Text fontWeight="semibold">{item.title}</Text>
                    <Text fontSize="sm" opacity={0.8}>
                      {item.text}
                    </Text>
                  </Box>
                </HStack>
              ))}
            </Stack>
          </Box>
          <Text position="relative" fontSize="sm" opacity={0.6}>
            © {new Date().getFullYear()} {APP_NAME}
          </Text>
        </Flex>

        {/* Form panel. */}
        <Center flex="1" px={4} py={10}>
          <Box w="100%" maxW="420px">
            <Box display={{ base: 'flex', lg: 'none' }} justifyContent="center" mb={8}>
              <BrandLogo size="lg" />
            </Box>
            <Box
              bg="bg.surface"
              borderRadius="2xl"
              boxShadow="card"
              borderWidth="1px"
              borderColor="border.subtle"
              p={{ base: 6, md: 8 }}
            >
              {children}
            </Box>
          </Box>
        </Center>
      </Flex>
    </GuestGuard>
  );
}
