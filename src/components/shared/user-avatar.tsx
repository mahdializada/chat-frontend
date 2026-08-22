'use client';

import { Avatar, AvatarBadge } from '@chakra-ui/react';
import { absoluteUrl } from '@/lib/env';
import { fullName } from '@/utils/format';
import type { BasicUser } from '@/types/api';

interface UserAvatarProps {
  user: Pick<BasicUser, 'firstName' | 'lastName' | 'avatar'> | null;
  size?: string;
  showOnline?: boolean;
  isOnline?: boolean;
  onClick?: () => void;
}

export function UserAvatar({
  user,
  size = 'md',
  showOnline = false,
  isOnline = false,
  onClick,
}: UserAvatarProps) {
  return (
    <Avatar
      size={size}
      name={user ? fullName(user) : undefined}
      src={user?.avatar ? absoluteUrl(user.avatar) : undefined}
      cursor={onClick ? 'pointer' : undefined}
      onClick={onClick}
    >
      {showOnline && (
        <AvatarBadge
          boxSize="1em"
          bg={isOnline ? 'green.400' : 'gray.400'}
          borderWidth="2px"
          aria-label={isOnline ? 'Online' : 'Offline'}
        />
      )}
    </Avatar>
  );
}
