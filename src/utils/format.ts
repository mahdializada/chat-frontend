import type { BasicUser, Chat, Message, User } from '@/types/api';

export function fullName(user: Pick<BasicUser, 'firstName' | 'lastName'> | null | undefined): string {
  if (!user) return 'Unknown user';
  return `${user.firstName} ${user.lastName}`.trim();
}

export function initials(user: Pick<BasicUser, 'firstName' | 'lastName'> | null | undefined): string {
  if (!user) return '?';
  return `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();
}

/** The "other" participant of a direct chat, from the current user's perspective. */
export function directChatPartner(chat: Chat, currentUserId: string): BasicUser | null {
  if (chat.type !== 'DIRECT') return null;
  return chat.members.find((m) => m.userId !== currentUserId)?.user ?? null;
}

export function chatDisplayName(chat: Chat, currentUser: Pick<User, 'id'> | null): string {
  if (chat.type === 'GROUP') return chat.name ?? 'Group';
  const partner = currentUser ? directChatPartner(chat, currentUser.id) : null;
  return partner ? fullName(partner) : 'Direct chat';
}

export function chatAvatarUrl(chat: Chat, currentUserId: string | undefined): string | null {
  if (chat.type === 'GROUP') return chat.avatar;
  if (!currentUserId) return null;
  return directChatPartner(chat, currentUserId)?.avatar ?? null;
}

export function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatChatListTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return formatMessageTime(iso);

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  const withinWeek = now.getTime() - date.getTime() < 6 * 24 * 60 * 60 * 1000;
  if (withinWeek) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export function formatDaySeparator(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
}

export function formatLastSeen(lastSeen: string | null): string {
  if (!lastSeen) return 'Offline';
  const date = new Date(lastSeen);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'Last seen just now';
  if (minutes < 60) return `Last seen ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last seen ${hours}h ago`;
  return `Last seen ${formatChatListTime(lastSeen)}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || Number.isNaN(seconds) || !Number.isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** Short preview of a message for the chat list / reply banners. */
export function messagePreview(message: Message | null, currentUserId?: string): string {
  if (!message) return 'No messages yet';
  if (message.deletedAt) return 'Message deleted';
  const prefix =
    message.type !== 'SYSTEM' && message.senderId === currentUserId ? 'You: ' : '';
  if (message.content) return `${prefix}${message.content}`;
  const attachment = message.attachments[0];
  if (attachment) {
    if (message.type === 'IMAGE') return `${prefix}📷 Photo`;
    if (message.type === 'AUDIO') return `${prefix}🎤 Voice message`;
    return `${prefix}📎 ${attachment.originalName}`;
  }
  return `${prefix}Message`;
}
