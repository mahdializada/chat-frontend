'use client';

import { chakra, HStack, Text } from '@chakra-ui/react';
import { APP_NAME } from '@/lib/brand';

/** The NexaChat mark: a speech bubble on a rounded brand-gradient tile. */
export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <chakra.svg
      viewBox="0 0 64 64"
      width={`${size}px`}
      height={`${size}px`}
      flexShrink={0}
      aria-hidden
    >
      <defs>
        <linearGradient id="nexachat-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4f94ff" />
          <stop offset="1" stopColor="#2161d1" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#nexachat-mark)" />
      <path
        d="M32 14c-11 0-20 7.6-20 17 0 5.2 2.7 9.9 7 13l-2 8 9.3-4.5c1.8.4 3.7.5 5.7.5 11 0 20-7.6 20-17S43 14 32 14z"
        fill="#fff"
      />
      <circle cx="24" cy="31" r="2.6" fill="#2f7cf6" />
      <circle cx="32" cy="31" r="2.6" fill="#2f7cf6" />
      <circle cx="40" cy="31" r="2.6" fill="#2f7cf6" />
    </chakra.svg>
  );
}

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  /** Text colour override, e.g. "white" on the brand gradient panel. */
  color?: string;
}

/** Mark + wordmark, used on the auth pages and anywhere the app introduces itself. */
export function BrandLogo({ size = 'md', color }: BrandLogoProps) {
  const mark = { sm: 24, md: 32, lg: 40 }[size];
  const fontSize = { sm: 'md', md: 'xl', lg: '2xl' }[size];
  return (
    <HStack spacing={2.5}>
      <BrandMark size={mark} />
      <Text fontWeight="bold" fontSize={fontSize} letterSpacing="-0.02em" color={color}>
        {APP_NAME}
      </Text>
    </HStack>
  );
}
