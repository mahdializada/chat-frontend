'use client';

import { Center, Flex, useColorMode, useDisclosure, useToast } from '@chakra-ui/react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiMessageCircle } from 'react-icons/fi';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { OfflineBanner } from '@/components/shared/offline-banner';
import { ConversationSkeleton } from '@/components/shared/skeletons';
import { ActiveCallBanner } from '@/features/calls/components/active-call-banner';
import { ChatHeader } from '@/features/chats/components/chat-header';
import { ChatSearchPanel } from '@/features/chats/components/chat-search-panel';
import { GroupInfoDrawer } from '@/features/chats/components/group-info-drawer';
import { useChat } from '@/features/chats/hooks/use-chats';
import { ForwardDialog } from '@/features/messages/components/forward-dialog';
import { MessageInput } from '@/features/messages/components/message-input';
import { MessageList } from '@/features/messages/components/message-list';
import { SelectionToolbar } from '@/features/messages/components/selection-toolbar';
import { StarredMessagesDrawer } from '@/features/messages/components/starred-messages-drawer';
import { TypingIndicator } from '@/features/messages/components/typing-indicator';
import {
  removeFailedMessage,
  useDeleteMessage,
  useDeleteMessages,
  useEditMessage,
  useMarkChatRead,
  useMessages,
  useSendMessage,
  useStarMessages,
  useToggleReaction,
  useToggleStar,
} from '@/features/messages/hooks/use-messages';
import type { AttachmentInput } from '@/features/messages/services/messages-service';
import { ContactProfileDrawer } from '@/features/users/components/contact-profile-drawer';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { getApiErrorMessage } from '@/lib/api-client';
import { removeMessageFromCache } from '@/lib/message-cache';
import { wallpaperBackground } from '@/lib/wallpapers';
import { setActiveChatId } from '@/store/active-chat';
import { useAuthStore } from '@/store/auth-store';
import { useChatUiStore } from '@/store/chat-ui-store';
import { directChatPartner } from '@/utils/format';
import type { Message } from '@/types/api';

export default function ChatPage() {
  const params = useParams<{ chatId: string }>();
  const chatId = params.chatId;
  const searchParams = useSearchParams();
  const anchor = searchParams.get('around');
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { colorMode } = useColorMode();
  const user = useAuthStore((s) => s.user);

  const chat = useChat(chatId);
  const messagesQuery = useMessages(chatId, anchor);
  const sendMessage = useSendMessage(chatId);
  const editMessage = useEditMessage(chatId);
  const deleteMessage = useDeleteMessage(chatId);
  const deleteMessages = useDeleteMessages(chatId);
  const toggleReaction = useToggleReaction(chatId);
  const toggleStar = useToggleStar(chatId);
  const starMessages = useStarMessages(chatId);

  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [forwardIds, setForwardIds] = useState<string[]>([]);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  /** "Delete for everyone" waits for confirmation; it cannot be undone. */
  const [pendingDeleteForAll, setPendingDeleteForAll] = useState<Message | null>(null);

  // Unread count as it was when this chat was opened — captured during the
  // first render with data, before the mark-as-read below zeroes it — so the
  // list can place its "N unread messages" divider.
  const unreadAtOpenRef = useRef<{ chatId: string; count: number } | null>(null);

  const info = useDisclosure();
  const search = useDisclosure();
  const starred = useDisclosure();
  const forward = useDisclosure();
  const bulkDeleteConfirm = useDisclosure();

  const selectionChatId = useChatUiStore((s) => s.selectionChatId);
  const selectedMessageIds = useChatUiStore((s) => s.selectedMessageIds);
  const highlightedMessageId = useChatUiStore((s) => s.highlightedMessageId);
  const startSelection = useChatUiStore((s) => s.startSelection);
  const toggleSelection = useChatUiStore((s) => s.toggleSelection);
  const clearSelection = useChatUiStore((s) => s.clearSelection);
  const setHighlightedMessage = useChatUiStore((s) => s.setHighlightedMessage);

  // Register as the active chat (socket handlers auto-mark incoming reads).
  useEffect(() => {
    setActiveChatId(chatId);
    return () => setActiveChatId(null);
  }, [chatId]);

  // Reset transient state when switching chats.
  useEffect(() => {
    setReplyTo(null);
    setEditing(null);
    setSearchTerm('');
    clearSelection();
    search.onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  if (chat.data && unreadAtOpenRef.current?.chatId !== chatId) {
    unreadAtOpenRef.current = { chatId, count: chat.data.unreadCount };
  }
  const unreadAtOpen =
    unreadAtOpenRef.current?.chatId === chatId ? unreadAtOpenRef.current.count : 0;

  useMarkChatRead(chatId, (chat.data?.unreadCount ?? 0) > 0 || (chat.data?.isUnread ?? false));

  // Membership errors (kicked out / bad link) bounce back to the list.
  useEffect(() => {
    if (chat.isError) {
      toast({ title: getApiErrorMessage(chat.error), status: 'error', duration: 4000 });
      router.replace('/chat');
    }
  }, [chat.isError, chat.error, router, toast]);

  const messages = useMemo(
    () => messagesQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [messagesQuery.data],
  );

  const jumpToMessage = useCallback(
    (messageId: string) => {
      const isLoaded = messages.some((message) => message.id === messageId);
      setHighlightedMessage(messageId);
      if (!isLoaded) {
        // Not in the loaded window — reload the history centred on it.
        router.replace(`/chat/${chatId}?around=${messageId}`);
      }
      // The highlight fades after a moment so it reads as a temporary marker.
      setTimeout(() => setHighlightedMessage(null), 2500);
    },
    [messages, chatId, router, setHighlightedMessage],
  );

  // Ctrl/Cmd+K is registered once in the chat layout; only page-level keys live here.
  useKeyboardShortcuts({
    onConversationSearch: () => search.onOpen(),
    onEscape: () => {
      if (selectionChatId) clearSelection();
      else if (search.isOpen) search.onClose();
      else if (editing) setEditing(null);
      else if (replyTo) setReplyTo(null);
    },
  });

  const handleSend = useCallback(
    (input: {
      content?: string;
      attachments?: AttachmentInput[];
      replyToId?: string;
      type?: Message['type'];
    }) => {
      sendMessage.mutate({
        ...input,
        type: input.type as Exclude<Message['type'], 'SYSTEM' | 'CALL'> | undefined,
        clientId: crypto.randomUUID(),
      });
    },
    [sendMessage],
  );

  const handleRetry = useCallback(
    (message: Message) => {
      removeMessageFromCache(queryClient, chatId, message.id);
      sendMessage.mutate({
        content: message.content ?? undefined,
        replyToId: message.replyToId ?? undefined,
        attachments: message.attachments.length
          ? message.attachments.map((a) => ({
              originalName: a.originalName,
              fileName: a.fileName,
              mimeType: a.mimeType,
              size: a.size,
              url: a.url,
              source: a.source,
              thumbnailUrl: a.thumbnailUrl ?? undefined,
              duration: a.duration ?? undefined,
              width: a.width ?? undefined,
              height: a.height ?? undefined,
            }))
          : undefined,
        clientId: crypto.randomUUID(),
      });
    },
    [chatId, queryClient, sendMessage],
  );

  const onError = useCallback(
    (error: unknown) => toast({ title: getApiErrorMessage(error), status: 'error', duration: 4000 }),
    [toast],
  );

  const handleDelete = useCallback(
    (message: Message, forEveryone: boolean) => {
      if (forEveryone) {
        setPendingDeleteForAll(message);
        return;
      }
      deleteMessage.mutate({ messageId: message.id, forEveryone: false }, { onError });
    },
    [deleteMessage, onError],
  );

  const confirmDeleteForAll = useCallback(() => {
    if (!pendingDeleteForAll) return;
    deleteMessage.mutate(
      { messageId: pendingDeleteForAll.id, forEveryone: true },
      { onSuccess: () => setPendingDeleteForAll(null), onError },
    );
  }, [deleteMessage, onError, pendingDeleteForAll]);

  const handleRemoveFailed = useCallback(
    (message: Message) => removeFailedMessage(queryClient, chatId, message.id),
    [queryClient, chatId],
  );

  const copySelected = useCallback(async () => {
    const text = messages
      .filter((message) => selectedMessageIds.includes(message.id))
      .reverse()
      .map((message) => message.content)
      .filter(Boolean)
      .join('\n');
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied to clipboard', status: 'success', duration: 2000 });
      clearSelection();
    } catch {
      toast({ title: 'Could not access the clipboard', status: 'error', duration: 3000 });
    }
  }, [messages, selectedMessageIds, toast, clearSelection]);

  const handleReply = useCallback((message: Message) => {
    setEditing(null);
    setReplyTo(message);
  }, []);

  const handleEdit = useCallback((message: Message) => {
    setReplyTo(null);
    setEditing(message);
  }, []);

  const handleToggleReaction = useCallback(
    (message: Message, emoji: string) => toggleReaction.mutate({ message, emoji }),
    [toggleReaction],
  );

  const handleToggleStar = useCallback(
    (message: Message) => toggleStar.mutate({ message }),
    [toggleStar],
  );

  const handleForward = useCallback(
    (message: Message) => {
      setForwardIds([message.id]);
      forward.onOpen();
    },
    [forward],
  );

  const handleSelect = useCallback(
    (message: Message) => {
      if (useChatUiStore.getState().selectionChatId === chatId) {
        toggleSelection(message.id);
      } else {
        startSelection(chatId, message.id);
      }
    },
    [chatId, toggleSelection, startSelection],
  );

  const handleOpenProfile = useCallback((userId: string) => setProfileUserId(userId), []);

  const jumpToLatest = useCallback(
    () => router.replace(`/chat/${chatId}`),
    [router, chatId],
  );

  const handleSaveEdit = useCallback(
    (messageId: string, content: string) => editMessage.mutate({ messageId, content }, { onError }),
    [editMessage, onError],
  );

  const partner = chat.data && user ? directChatPartner(chat.data, user.id) : null;
  const wallpaper = useMemo(
    () =>
      wallpaperBackground(
        chat.data?.settings.wallpaper ?? user?.chatWallpaper,
        colorMode === 'dark',
      ),
    [chat.data?.settings.wallpaper, user?.chatWallpaper, colorMode],
  );

  const composerDisabledReason = useMemo(() => {
    const data = chat.data;
    if (!data || !user) return null;
    if (data.blockState?.blockedByMe) {
      return 'You blocked this contact. Unblock them from their profile to send messages.';
    }
    if (data.blockState?.blockedMe) {
      return 'You can no longer send messages to this contact.';
    }
    if (data.type === 'GROUP' && !data.membersCanSend) {
      const role = data.members.find((m) => m.userId === user.id)?.role ?? 'MEMBER';
      if (role === 'MEMBER') return 'Only admins can send messages in this group.';
    }
    return null;
  }, [chat.data, user]);

  if (chat.isLoading || !user) {
    return <ConversationSkeleton />;
  }

  if (!chat.data) {
    return (
      <Center h="100%">
        <EmptyState
          icon={FiMessageCircle}
          title="Chat not found"
          description="It may have been deleted, or you no longer have access to it."
          actionLabel="Back to chats"
          onAction={() => router.replace('/chat')}
        />
      </Center>
    );
  }

  const isSelectionMode = selectionChatId === chatId;

  return (
    <Flex direction="column" h="100%" minH={0}>
      {isSelectionMode ? (
        <SelectionToolbar
          count={selectedMessageIds.length}
          canDeleteForEveryone
          onCancel={clearSelection}
          onCopy={() => void copySelected()}
          onForward={() => {
            setForwardIds(selectedMessageIds);
            forward.onOpen();
          }}
          onStar={() =>
            starMessages.mutate(selectedMessageIds, {
              onSuccess: () => {
                toast({ title: 'Messages starred', status: 'success', duration: 2000 });
                clearSelection();
              },
              onError,
            })
          }
          onDelete={bulkDeleteConfirm.onOpen}
        />
      ) : (
        <ChatHeader
          chat={chat.data}
          onOpenInfo={() => {
            if (chat.data?.type === 'GROUP') info.onOpen();
            else if (partner) setProfileUserId(partner.id);
          }}
          onToggleSearch={() => (search.isOpen ? search.onClose() : search.onOpen())}
          onOpenStarred={starred.onOpen}
        />
      )}

      <OfflineBanner />
      <ActiveCallBanner chatId={chatId} />

      <ChatSearchPanel
        chatId={chatId}
        isOpen={search.isOpen}
        onClose={() => {
          search.onClose();
          setSearchTerm('');
        }}
        currentUserId={user.id}
        onSelectResult={(messageId) => {
          jumpToMessage(messageId);
        }}
      />

      <MessageList
        chat={chat.data}
        currentUserId={user.id}
        messages={messages}
        isLoading={messagesQuery.isLoading}
        isError={messagesQuery.isError}
        onRetryLoad={() => void messagesQuery.refetch()}
        unreadCount={unreadAtOpen}
        hasNextPage={messagesQuery.hasNextPage ?? false}
        isFetchingNextPage={messagesQuery.isFetchingNextPage}
        fetchNextPage={() => void messagesQuery.fetchNextPage()}
        highlightedId={highlightedMessageId ?? anchor}
        searchTerm={search.isOpen ? searchTerm : undefined}
        isAnchored={!!anchor}
        background={wallpaper}
        selectionChatId={selectionChatId}
        selectedMessageIds={selectedMessageIds}
        onJumpToLatest={jumpToLatest}
        onReply={handleReply}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleReaction={handleToggleReaction}
        onToggleStar={handleToggleStar}
        onForward={handleForward}
        onSelect={handleSelect}
        onRetry={handleRetry}
        onRemoveFailed={handleRemoveFailed}
        onJumpToMessage={jumpToMessage}
        onOpenProfile={handleOpenProfile}
      />

      <TypingIndicator chatId={chatId} />

      <MessageInput
        chat={chat.data}
        currentUserId={user.id}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        editing={editing}
        onCancelEdit={() => setEditing(null)}
        onSend={handleSend}
        onSaveEdit={handleSaveEdit}
        disabledReason={composerDisabledReason}
      />

      {/* panels */}
      {chat.data.type === 'GROUP' && (
        <GroupInfoDrawer
          chat={chat.data}
          isOpen={info.isOpen}
          onClose={info.onClose}
          onSearchInConversation={search.onOpen}
          onOpenMessage={jumpToMessage}
          onOpenProfile={(userId) => setProfileUserId(userId)}
        />
      )}

      <ContactProfileDrawer
        userId={profileUserId}
        isOpen={!!profileUserId}
        onClose={() => setProfileUserId(null)}
        chat={
          chat.data.type === 'DIRECT' && partner?.id === profileUserId ? chat.data : null
        }
        onSearchInConversation={search.onOpen}
        onOpenMessage={jumpToMessage}
      />

      <StarredMessagesDrawer isOpen={starred.isOpen} onClose={starred.onClose} chatId={chatId} />

      <ForwardDialog
        messageIds={forwardIds}
        isOpen={forward.isOpen}
        onClose={() => {
          forward.onClose();
          setForwardIds([]);
        }}
        onForwarded={clearSelection}
      />

      <ConfirmDialog
        isOpen={!!pendingDeleteForAll}
        onClose={() => setPendingDeleteForAll(null)}
        onConfirm={confirmDeleteForAll}
        isLoading={deleteMessage.isPending}
        title="Delete for everyone?"
        body="This message will be removed for all participants. This cannot be undone."
        confirmLabel="Delete for everyone"
      />

      <ConfirmDialog
        isOpen={bulkDeleteConfirm.isOpen}
        onClose={bulkDeleteConfirm.onClose}
        onConfirm={() =>
          deleteMessages.mutate(
            { messageIds: selectedMessageIds, forEveryone: false },
            {
              onSuccess: (result) => {
                toast({
                  title: `${result.deleted} message${result.deleted === 1 ? '' : 's'} deleted`,
                  status: 'success',
                  duration: 2500,
                });
                clearSelection();
                bulkDeleteConfirm.onClose();
              },
              onError,
            },
          )
        }
        isLoading={deleteMessages.isPending}
        title={`Delete ${selectedMessageIds.length} message${selectedMessageIds.length === 1 ? '' : 's'}?`}
        body="The selected messages will be removed from your view. Other participants keep their copies."
        confirmLabel="Delete for me"
      />
    </Flex>
  );
}
