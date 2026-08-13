export const queryKeys = {
  me: ['me'] as const,
  users: (search: string) => ['users', search] as const,
  chats: ['chats'] as const,
  chat: (chatId: string) => ['chats', chatId] as const,
  messages: (chatId: string, anchor?: string | null) =>
    anchor ? (['messages', chatId, anchor] as const) : (['messages', chatId] as const),
  allMessages: (chatId: string) => ['messages', chatId] as const,
  messageSearch: (term: string) => ['message-search', term] as const,
  notifications: ['notifications'] as const,
};
