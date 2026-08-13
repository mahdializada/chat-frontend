'use client';

import {
  Alert,
  AlertIcon,
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
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
import { useLogin } from '../hooks/use-auth';
import { loginSchema, LoginFormValues } from '../schemas/auth-schemas';

export function LoginForm() {
  const login = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit((values) => login.mutate(values));

  return (
    <form onSubmit={onSubmit} noValidate>
      <Stack spacing={4}>
        {login.isError && (
          <Alert status="error" borderRadius="md" fontSize="sm">
            <AlertIcon />
            {getApiErrorMessage(login.error)}
          </Alert>
        )}
        <FormControl isInvalid={!!errors.emailOrUsername}>
          <FormLabel>Email or username</FormLabel>
          <Input
            type="text"
            autoComplete="username"
            placeholder="john@example.com"
            {...register('emailOrUsername')}
          />
          <FormErrorMessage>{errors.emailOrUsername?.message}</FormErrorMessage>
        </FormControl>
        <FormControl isInvalid={!!errors.password}>
          <FormLabel>Password</FormLabel>
          <InputGroup>
            <Input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
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
        <Button type="submit" isLoading={login.isPending} size="lg" mt={2}>
          Sign in
        </Button>
      </Stack>
    </form>
  );
}
