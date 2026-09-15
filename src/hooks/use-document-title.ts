'use client';

import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { useChats } from '@/features/chats/hooks/use-chats';
import { APP_NAME } from '@/lib/brand';
import { useAuthStore } from '@/store/auth-store';
import { chatDisplayName } from '@/utils/format';

/**
 * Keeps the browser tab informative: "(3) Sam Rivera · NexaChat".
 * Muted chats do not count towards the unread total.
 */
export function useDocumentTitle(): void {
  const params = useParams<{ chatId?: string }>();
  const user = useAuthStore((s) => s.user);
  const chats = useChats();

  useEffect(() => {
    const list = chats.data ?? [];
    const unread = list.reduce(
      (total, chat) => total + (chat.settings.isMuted ? 0 : chat.unreadCount),
      0,
    );
    const active = params?.chatId ? list.find((chat) => chat.id === params.chatId) : undefined;
    const prefix = unread > 0 ? `(${unread > 99 ? '99+' : unread}) ` : '';
    const page = active ? `${chatDisplayName(active, user)} · ` : '';
    document.title = `${prefix}${page}${APP_NAME}`;
  }, [chats.data, params?.chatId, user]);
}
