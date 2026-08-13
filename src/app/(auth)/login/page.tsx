'use client';

import { Heading, Link, Text } from '@chakra-ui/react';
import NextLink from 'next/link';
import { LoginForm } from '@/features/auth/components/login-form';

export default function LoginPage() {
  return (
    <>
      <Heading size="md" mb={1}>
        Welcome back
      </Heading>
      <Text color="gray.500" mb={6}>
        Sign in to continue chatting
      </Text>
      <LoginForm />
      <Text mt={6} fontSize="sm" color="gray.500" textAlign="center">
        Don&apos;t have an account?{' '}
        <Link as={NextLink} href="/register" color="brand.500" fontWeight="semibold">
          Create one
        </Link>
      </Text>
    </>
  );
}
