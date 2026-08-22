import type { Chat, Message } from '@/types/api';
import { absoluteUrl } from './env';
import { fullName } from '@/utils/format';

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export function getNotificationPermission(): NotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
}

/**
 * Decides whether an incoming message should raise a desktop notification.
 *
 * Muted conversations stay silent unless the user was mentioned and they kept
 * the "notify me for mentions" exception on.
 */
export function shouldNotify(args: {
  chat: Chat | undefined;
  message: Message;
  currentUserId: string;
  notificationsEnabled: boolean;
}): boolean {
  const { chat, message, currentUserId, notificationsEnabled } = args;
  if (!notificationsEnabled) return false;
  if (message.senderId === currentUserId) return false;
  if (getNotificationPermission() !== 'granted') return false;

  const mentionsMe = message.mentions.some(
    (mention) => mention.type === 'EVERYONE' || mention.userId === currentUserId,
  );

  if (chat?.settings.isMuted) {
    return mentionsMe && chat.settings.muteExceptMentions;
  }
  return true;
}

export function showMessageNotification(args: {
  chat: Chat | undefined;
  message: Message;
  onClick: () => void;
}): void {
  const { chat, message, onClick } = args;
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  const senderName = message.sender ? fullName(message.sender) : 'New message';
  const title = chat?.type === 'GROUP' ? `${senderName} · ${chat.name ?? 'Group'}` : senderName;
  const body = message.content ?? describeAttachment(message);

  try {
    const notification = new Notification(title, {
      body,
      icon: message.sender?.avatar ? absoluteUrl(message.sender.avatar) : undefined,
      // Replaces an earlier notification from the same chat instead of stacking.
      tag: `chat-${message.chatId}`,
      silent: false,
    });
    notification.onclick = () => {
      window.focus();
      onClick();
      notification.close();
    };
  } catch {
    // Some browsers throw when notifications are constructed outside a
    // user gesture — failing silently is the right behaviour here.
  }
}

function describeAttachment(message: Message): string {
  const attachment = message.attachments[0];
  if (!attachment) return 'New message';
  if (message.type === 'IMAGE') return '📷 Photo';
  if (message.type === 'VIDEO') return '🎬 Video';
  if (message.type === 'AUDIO') return '🎤 Voice message';
  if (message.type === 'GIF') return 'GIF';
  if (message.type === 'STICKER') return 'Sticker';
  return `📎 ${attachment.originalName}`;
}
