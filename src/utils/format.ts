import type { BasicUser, Chat, Message, SelfUser } from '@/types/api';

export function fullName(
  user: Pick<BasicUser, 'firstName' | 'lastName'> | null | undefined,
): string {
  if (!user) return 'Unknown user';
  return `${user.firstName} ${user.lastName}`.trim();
}

export function initials(
  user: Pick<BasicUser, 'firstName' | 'lastName'> | null | undefined,
): string {
  if (!user) return '?';
  return `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();
}

/** The "other" participant of a direct chat, from the current user's perspective. */
export function directChatPartner(chat: Chat, currentUserId: string): BasicUser | null {
  if (chat.type !== 'DIRECT') return null;
  return chat.members.find((m) => m.userId !== currentUserId)?.user ?? null;
}

export function chatDisplayName(chat: Chat, currentUser: Pick<SelfUser, 'id'> | null): string {
  if (chat.type === 'GROUP') return chat.name ?? 'Group';
  const partner = currentUser ? directChatPartner(chat, currentUser.id) : null;
  return partner ? fullName(partner) : 'Direct chat';
}

export function chatAvatarUrl(chat: Chat, currentUserId: string | undefined): string | null {
  if (chat.type === 'GROUP') return chat.avatar;
  if (!currentUserId) return null;
  return directChatPartner(chat, currentUserId)?.avatar ?? null;
}

export function memberRoleLabel(role: string): string {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

// ── dates & times ───────────────────────────────────────────────────────────

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

/** "August 2026" — used to group the files and media galleries. */
export function formatMonthGroup(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) {
    return 'This month';
  }
  return date.toLocaleDateString([], { month: 'long', year: 'numeric' });
}

export function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'Active now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return formatChatListTime(iso);
}

/** "Muted until 18:40" / "Muted" for an indefinite mute. */
export function formatMuteUntil(mutedUntil: string | null): string {
  if (!mutedUntil) return 'Muted';
  const date = new Date(mutedUntil);
  if (date.getFullYear() > 9000) return 'Muted';
  return `Muted until ${formatChatListTime(mutedUntil)}`;
}

// ── sizes & durations ───────────────────────────────────────────────────────

export function formatFileSize(bytes: number | null): string {
  if (bytes === null || Number.isNaN(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || Number.isNaN(seconds) || !Number.isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** Short, human file-type label for the shared-files list. */
export function fileTypeLabel(mimeType: string | null, fileName: string | null): string {
  const extension = fileName?.split('.').pop()?.toUpperCase();
  if (extension && extension.length <= 5 && /^[A-Z0-9]+$/.test(extension)) return extension;
  if (!mimeType) return 'File';
  const [, subtype] = mimeType.split('/');
  return (subtype ?? 'file').split(/[.+-]/).pop()?.toUpperCase() ?? 'FILE';
}

// ── previews ────────────────────────────────────────────────────────────────

/** Short preview of a message for the chat list / reply banners. */
export function messagePreview(message: Message | null, currentUserId?: string): string {
  if (!message) return 'No messages yet';
  if (message.deletedAt) return 'Message deleted';
  const prefix = message.type !== 'SYSTEM' && message.senderId === currentUserId ? 'You: ' : '';
  if (message.content) return `${prefix}${message.content}`;

  switch (message.type) {
    case 'IMAGE':
      return `${prefix}📷 Photo`;
    case 'VIDEO':
      return `${prefix}🎬 Video`;
    case 'AUDIO':
      return `${prefix}🎤 Voice message`;
    case 'GIF':
      return `${prefix}GIF`;
    case 'STICKER':
      return `${prefix}Sticker`;
    default: {
      const attachment = message.attachments[0];
      return attachment ? `${prefix}📎 ${attachment.originalName}` : `${prefix}Message`;
    }
  }
}

/**
 * Splits text on a search term so the UI can highlight the matching parts.
 * Returns alternating [plain, match, plain, …] segments.
 */
export function splitOnMatch(text: string, term: string): { text: string; match: boolean }[] {
  const needle = term.trim();
  if (!needle) return [{ text, match: false }];

  const segments: { text: string; match: boolean }[] = [];
  const lowerText = text.toLowerCase();
  const lowerNeedle = needle.toLowerCase();
  let index = 0;

  for (;;) {
    const found = lowerText.indexOf(lowerNeedle, index);
    if (found === -1) break;
    if (found > index) segments.push({ text: text.slice(index, found), match: false });
    segments.push({ text: text.slice(found, found + needle.length), match: true });
    index = found + needle.length;
  }
  if (index < text.length) segments.push({ text: text.slice(index), match: false });
  return segments.length > 0 ? segments : [{ text, match: false }];
}

/** True when the message mentions the given user (directly or via @everyone). */
export function mentionsUser(message: Message, userId: string | undefined): boolean {
  if (!userId) return false;
  return message.mentions.some((m) => m.type === 'EVERYONE' || m.userId === userId);
}
