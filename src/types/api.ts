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

export type PrivacyVisibility = 'EVERYONE' | 'CONTACTS' | 'NOBODY';
export type ThemePreference = 'light' | 'dark' | 'system';

/** The authenticated user, including settings only they can see. */
export interface SelfUser extends User {
  profilePhotoVisibility: PrivacyVisibility;
  lastSeenVisibility: PrivacyVisibility;
  onlineVisibility: PrivacyVisibility;
  aboutVisibility: PrivacyVisibility;
  readReceiptsEnabled: boolean;
  theme: ThemePreference;
  chatWallpaper: string | null;
  recentEmojis: string[];
  recentStickers: string[];
  notificationsEnabled: boolean;
  soundEnabled: boolean;
}

export type ChatType = 'DIRECT' | 'GROUP';
export type MemberRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type MessageType =
  | 'TEXT'
  | 'IMAGE'
  | 'VIDEO'
  | 'FILE'
  | 'AUDIO'
  | 'STICKER'
  | 'GIF'
  | 'SYSTEM';
export type AttachmentSource = 'LOCAL' | 'REMOTE';
export type MentionType = 'USER' | 'EVERYONE';
export type LinkPreviewStatus = 'PENDING' | 'OK' | 'FAILED' | 'BLOCKED';
export type NotificationType =
  | 'NEW_MESSAGE'
  | 'ADDED_TO_GROUP'
  | 'REMOVED_FROM_GROUP'
  | 'GROUP_UPDATED'
  | 'ROLE_CHANGED'
  | 'MENTION';

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
  chatId: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  source: AttachmentSource;
  thumbnailUrl: string | null;
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

export interface ReceiptDetail {
  user: BasicUser;
  deliveredAt: string | null;
  readAt: string | null;
}

export interface Mention {
  id: string;
  userId: string | null;
  type: MentionType;
}

export interface MessageLink {
  id: string;
  url: string;
  domain: string;
  preview: {
    title: string | null;
    description: string | null;
    imageUrl: string | null;
    siteName: string | null;
    status: LinkPreviewStatus;
  } | null;
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

export interface ForwardOrigin {
  id: string;
  chatId: string;
  deletedAt: string | null;
  sender: BasicUser | null;
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
  isForwarded: boolean;
  forwardedFromId: string | null;
  forwardedFrom: ForwardOrigin | null;
  sender: BasicUser | null;
  attachments: Attachment[];
  reactions: Reaction[];
  replyTo: ReplyPreviewMessage | null;
  receipts: Receipt[];
  mentions: Mention[];
  links: MessageLink[];
  /** Per-user star state, resolved for the requesting user. */
  isStarred?: boolean;
  /** Client-side only fields used for optimistic updates. */
  clientId?: string;
  optimistic?: boolean;
  failed?: boolean;
  /** Queued locally while offline, not yet accepted by the server. */
  queued?: boolean;
}

export interface ChatSettings {
  isPinned: boolean;
  pinnedAt: string | null;
  isArchived: boolean;
  isMuted: boolean;
  mutedUntil: string | null;
  muteExceptMentions: boolean;
  markedUnreadAt: string | null;
  draft: string | null;
  clearedAt: string | null;
  wallpaper: string | null;
}

export interface BlockState {
  blockedByMe: boolean;
  blockedMe: boolean;
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
  membersCanSend: boolean;
  membersCanEditInfo: boolean;
  membersCanMentionAll: boolean;
  members: ChatMember[];
  lastMessage: Message | null;
  unreadCount: number;
  isUnread: boolean;
  settings: ChatSettings;
  blockState?: BlockState;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  data: { chatId?: string; messageId?: string; actorId?: string; role?: string } | null;
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
    avatar: string | null;
    members: { userId: string; user: BasicUser }[];
  };
  sender: BasicUser | null;
}

export interface PaginatedSearchResults {
  items: MessageSearchResult[];
  total: number;
  offset: number;
  limit: number;
}

export interface StarredMessageResult {
  starredAt: string;
  message: Message;
  chat: {
    id: string;
    type: ChatType;
    name: string | null;
    avatar: string | null;
    members: { userId: string; user: BasicUser }[];
  };
}

export interface SyncResult {
  serverTime: string;
  messages: Message[];
  removedMessageIds: string[];
  truncated: boolean;
}

// ── shared media gallery ────────────────────────────────────────────────────

export type MediaCategory = 'MEDIA' | 'FILES' | 'LINKS' | 'AUDIO';

export interface SharedMediaCounts {
  MEDIA: number;
  FILES: number;
  LINKS: number;
  AUDIO: number;
}

export interface SharedMediaItem {
  id: string;
  category: MediaCategory;
  messageId: string;
  chatId: string;
  createdAt: string;
  sender: BasicUser | null;
  originalName: string | null;
  mimeType: string | null;
  size: number | null;
  url: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  width: number | null;
  height: number | null;
  linkUrl: string | null;
  linkDomain: string | null;
  linkTitle: string | null;
  linkDescription: string | null;
  linkImageUrl: string | null;
  linkSiteName: string | null;
  messageContent: string | null;
}

export interface PaginatedSharedMedia {
  items: SharedMediaItem[];
  nextCursor: string | null;
}

// ── contacts & groups ───────────────────────────────────────────────────────

export interface ContactProfile {
  user: User;
  isContact: boolean;
  blockState: BlockState;
  directChatId: string | null;
  commonGroupsCount: number;
  visibility: {
    photo: boolean;
    about: boolean;
    online: boolean;
    lastSeen: boolean;
  };
}

export interface CommonGroup {
  id: string;
  name: string | null;
  avatar: string | null;
  description: string | null;
  memberCount: number;
  lastMessageAt: string | null;
}

export type ReportReason =
  | 'SPAM'
  | 'HARASSMENT'
  | 'IMPERSONATION'
  | 'INAPPROPRIATE_CONTENT'
  | 'OTHER';

export interface ReportResult {
  id: string;
  status: 'OPEN' | 'REVIEWED' | 'DISMISSED';
  createdAt: string;
  alreadyReported: boolean;
}

export interface GroupInvite {
  token: string;
  url: string;
  createdAt: string;
  expiresAt: string | null;
  useCount: number;
}

export interface InvitePreview {
  chatId: string;
  name: string | null;
  description: string | null;
  avatar: string | null;
  memberCount: number;
  isMember: boolean;
}

// ── sessions ────────────────────────────────────────────────────────────────

export interface SessionView {
  id: string;
  deviceName: string | null;
  browser: string | null;
  os: string | null;
  ipAddress: string | null;
  lastActiveAt: string;
  createdAt: string;
  isCurrent: boolean;
}

// ── media providers ─────────────────────────────────────────────────────────

export interface GifItem {
  id: string;
  url: string;
  previewUrl: string;
  thumbnailUrl: string | null;
  width: number;
  height: number;
  title: string;
  mimeType: string;
  size: number;
}

export interface GifPage {
  items: GifItem[];
  next: string | null;
}

export interface GifProviderStatus {
  enabled: boolean;
  provider: string;
}

export interface StickerPack {
  id: string;
  slug: string;
  name: string;
  author: string | null;
  coverUrl: string;
  provider: string;
  stickerCount: number;
}

export interface Sticker {
  id: string;
  packId: string;
  url: string;
  emoji: string | null;
  keywords: string[];
  width: number | null;
  height: number | null;
}

export interface LinkPreviewResult {
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  siteName: string | null;
  status: LinkPreviewStatus;
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
