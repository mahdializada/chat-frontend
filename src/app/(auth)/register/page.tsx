'use client';

import { Heading, Link, Text } from '@chakra-ui/react';
import NextLink from 'next/link';
import { RegisterForm } from '@/features/auth/components/register-form';

export default function RegisterPage() {
  return (
    <>
      <Heading size="md" mb={1}>
        Create your account
      </Heading>
      <Text color="gray.500" mb={6}>
        Join and start chatting in seconds
      </Text>
      <RegisterForm />
      <Text mt={6} fontSize="sm" color="gray.500" textAlign="center">
        Already have an account?{' '}
        <Link as={NextLink} href="/login" color="brand.500" fontWeight="semibold">
          Sign in
        </Link>
      </Text>
    </>
  );
}
