'use client';

import { Avatar, AvatarBadge } from '@chakra-ui/react';
import { absoluteUrl } from '@/lib/env';
import { resolvePresence, useChatUiStore } from '@/store/chat-ui-store';
import { useAuthStore } from '@/store/auth-store';
import { chatDisplayName, directChatPartner } from '@/utils/format';
import type { Chat } from '@/types/api';

interface ChatAvatarProps {
  chat: Chat;
  size?: string;
}

/** Group avatar, or the partner's avatar with a live presence dot for direct chats. */
export function ChatAvatar({ chat, size = 'md' }: ChatAvatarProps) {
  const user = useAuthStore((s) => s.user);
  const presence = useChatUiStore((s) => s.presence);

  const partner = user ? directChatPartner(chat, user.id) : null;
  const live = partner ? resolvePresence(partner, presence) : null;
  const src = chat.type === 'GROUP' ? chat.avatar : partner?.avatar;

  return (
    <Avatar size={size} name={chatDisplayName(chat, user)} src={src ? absoluteUrl(src) : undefined}>
      {chat.type === 'DIRECT' && live && (
        <AvatarBadge boxSize="1em" bg={live.isOnline ? 'green.400' : 'gray.400'} borderWidth="2px" />
      )}
    </Avatar>
  );
}
