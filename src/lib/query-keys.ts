import type { MediaCategory } from '@/types/api';

export const queryKeys = {
  me: ['me'] as const,

  users: (search: string) => ['users', search] as const,
  userProfile: (userId: string) => ['user-profile', userId] as const,
  commonGroups: (userId: string) => ['common-groups', userId] as const,
  blockedUsers: ['blocked-users'] as const,

  chats: ['chats'] as const,
  archivedChats: ['chats', 'archived'] as const,
  archivedSummary: ['chats', 'archived', 'summary'] as const,
  chat: (chatId: string) => ['chats', chatId] as const,
  chatInvite: (chatId: string) => ['chat-invite', chatId] as const,
  invitePreview: (token: string) => ['invite-preview', token] as const,

  messages: (chatId: string, anchor?: string | null) =>
    anchor ? (['messages', chatId, anchor] as const) : (['messages', chatId] as const),
  allMessages: (chatId: string) => ['messages', chatId] as const,
  messageSearch: (term: string, chatId?: string) =>
    ['message-search', term, chatId ?? 'all'] as const,
  messageReceipts: (messageId: string) => ['message-receipts', messageId] as const,
  starredMessages: (chatId?: string) => ['starred-messages', chatId ?? 'all'] as const,

  sharedMediaCounts: (chatId: string) => ['shared-media-counts', chatId] as const,
  sharedMedia: (chatId: string, category: MediaCategory, search: string, sort: string) =>
    ['shared-media', chatId, category, search, sort] as const,

  notifications: ['notifications'] as const,
  sessions: ['sessions'] as const,

  gifStatus: ['gif-status'] as const,
  gifs: (term: string) => ['gifs', term] as const,
  stickerPacks: ['sticker-packs'] as const,
  stickerPack: (packId: string) => ['sticker-pack', packId] as const,
  recentStickers: ['recent-stickers'] as const,
};
