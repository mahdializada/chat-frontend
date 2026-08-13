/** API types mirroring the chat-backend responses. */

export interface BasicUser {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  avatar: string | null;
  isOnline: boolean;
  lastSeen: string | null;
}

export interface User extends BasicUser {
  email: string;
  bio: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ChatType = 'DIRECT' | 'GROUP';
export type MemberRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'AUDIO' | 'SYSTEM';
export type NotificationType =
  | 'NEW_MESSAGE'
  | 'ADDED_TO_GROUP'
  | 'REMOVED_FROM_GROUP'
  | 'GROUP_UPDATED'
  | 'ROLE_CHANGED';

export interface ChatMember {
  id: string;
  chatId: string;
  userId: string;
  role: MemberRole;
  joinedAt: string;
  lastReadMessageId: string | null;
  lastReadAt: string | null;
  lastDeliveredAt: string | null;
  user: BasicUser;
}

export interface Attachment {
  id: string;
  messageId: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  duration: number | null;
  width: number | null;
  height: number | null;
  createdAt: string;
}

export interface Reaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
  user: BasicUser;
}

export interface Receipt {
  userId: string;
  deliveredAt: string | null;
  readAt: string | null;
}

export interface ReplyPreviewMessage {
  id: string;
  chatId: string;
  senderId: string | null;
  content: string | null;
  type: MessageType;
  deletedAt: string | null;
  createdAt: string;
  sender: BasicUser | null;
  attachments: Attachment[];
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string | null;
  content: string | null;
  type: MessageType;
  replyToId: string | null;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  sender: BasicUser | null;
  attachments: Attachment[];
  reactions: Reaction[];
  replyTo: ReplyPreviewMessage | null;
  receipts: Receipt[];
  /** Client-side only fields used for optimistic updates. */
  clientId?: string;
  optimistic?: boolean;
  failed?: boolean;
}

export interface Chat {
  id: string;
  type: ChatType;
  name: string | null;
  description: string | null;
  avatar: string | null;
  directKey: string | null;
  createdById: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  members: ChatMember[];
  lastMessage: Message | null;
  unreadCount: number;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  data: { chatId?: string; actorId?: string; role?: string } | null;
  isRead: boolean;
  createdAt: string;
}

export interface PaginatedMessages {
  items: Message[];
  nextCursor: string | null;
  prevCursor?: string | null;
}

export interface PaginatedNotifications {
  items: AppNotification[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
}

export interface MessageSearchResult {
  id: string;
  content: string | null;
  type: MessageType;
  createdAt: string;
  chat: {
    id: string;
    type: ChatType;
    name: string | null;
    members: { userId: string; user: { firstName: string; lastName: string } }[];
  };
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    avatar: string | null;
  } | null;
}

export interface UploadResult {
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

/** Standard success envelope returned by every backend endpoint. */
export interface ApiEnvelope<T> {
  success: true;
  statusCode: number;
  data: T;
}

export interface ApiErrorBody {
  success: false;
  statusCode: number;
  message: string;
  errors: string[];
}
