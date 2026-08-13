'use client';

import {
  Alert,
  AlertIcon,
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Stack,
} from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { getApiErrorMessage } from '@/lib/api-client';
import { useRegister } from '../hooks/use-auth';
import { registerSchema, RegisterFormValues } from '../schemas/auth-schemas';

export function RegisterForm() {
  const registerMutation = useRegister();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit((values) => registerMutation.mutate(values));

  return (
    <form onSubmit={onSubmit} noValidate>
      <Stack spacing={4}>
        {registerMutation.isError && (
          <Alert status="error" borderRadius="md" fontSize="sm">
            <AlertIcon />
            {getApiErrorMessage(registerMutation.error)}
          </Alert>
        )}
        <HStack align="flex-start">
          <FormControl isInvalid={!!errors.firstName}>
            <FormLabel>First name</FormLabel>
            <Input placeholder="John" autoComplete="given-name" {...register('firstName')} />
            <FormErrorMessage>{errors.firstName?.message}</FormErrorMessage>
          </FormControl>
          <FormControl isInvalid={!!errors.lastName}>
            <FormLabel>Last name</FormLabel>
            <Input placeholder="Doe" autoComplete="family-name" {...register('lastName')} />
            <FormErrorMessage>{errors.lastName?.message}</FormErrorMessage>
          </FormControl>
        </HStack>
        <FormControl isInvalid={!!errors.username}>
          <FormLabel>Username</FormLabel>
          <Input placeholder="johndoe" autoComplete="username" {...register('username')} />
          <FormErrorMessage>{errors.username?.message}</FormErrorMessage>
        </FormControl>
        <FormControl isInvalid={!!errors.email}>
          <FormLabel>Email</FormLabel>
          <Input
            type="email"
            placeholder="john@example.com"
            autoComplete="email"
            {...register('email')}
          />
          <FormErrorMessage>{errors.email?.message}</FormErrorMessage>
        </FormControl>
        <FormControl isInvalid={!!errors.password}>
          <FormLabel>Password</FormLabel>
          <InputGroup>
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              {...register('password')}
            />
            <InputRightElement>
              <IconButton
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                icon={showPassword ? <FiEyeOff /> : <FiEye />}
                size="sm"
                variant="ghost"
                onClick={() => setShowPassword((v) => !v)}
              />
            </InputRightElement>
          </InputGroup>
          <FormErrorMessage>{errors.password?.message}</FormErrorMessage>
        </FormControl>
        <Button type="submit" isLoading={registerMutation.isPending} size="lg" mt={2}>
          Create account
        </Button>
      </Stack>
    </form>
  );
}
