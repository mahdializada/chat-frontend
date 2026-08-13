/**
 * Tracks which chat is currently open, outside React state so socket handlers
 * can read it synchronously without re-registering listeners on navigation.
 */
let activeChatId: string | null = null;

export function setActiveChatId(chatId: string | null): void {
  activeChatId = chatId;
}

export function getActiveChatId(): string | null {
  return activeChatId;
}
