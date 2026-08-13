'use client';

import { Center, Flex, Spinner, Text, useToast } from '@chakra-ui/react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChatHeader } from '@/features/chats/components/chat-header';
import { useChat } from '@/features/chats/hooks/use-chats';
import { MessageInput } from '@/features/messages/components/message-input';
import { MessageList } from '@/features/messages/components/message-list';
import { TypingIndicator } from '@/features/messages/components/typing-indicator';
import {
  useDeleteMessage,
  useEditMessage,
  useMarkChatRead,
  useMessages,
  useSendMessage,
  useToggleReaction,
} from '@/features/messages/hooks/use-messages';
import type { AttachmentInput } from '@/features/messages/services/messages-service';
import { getApiErrorMessage } from '@/lib/api-client';
import { removeMessageFromCache } from '@/lib/message-cache';
import { setActiveChatId } from '@/store/active-chat';
import { useAuthStore } from '@/store/auth-store';
import type { Message } from '@/types/api';

export default function ChatPage() {
  const params = useParams<{ chatId: string }>();
  const chatId = params.chatId;
  const searchParams = useSearchParams();
  const anchor = searchParams.get('around');
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const chat = useChat(chatId);
  const messagesQuery = useMessages(chatId, anchor);
  const sendMessage = useSendMessage(chatId);
  const editMessage = useEditMessage(chatId);
  const deleteMessage = useDeleteMessage(chatId);
  const toggleReaction = useToggleReaction(chatId);

  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);

  // Register as the active chat (socket handlers auto-mark incoming reads).
  useEffect(() => {
    setActiveChatId(chatId);
    return () => setActiveChatId(null);
  }, [chatId]);

  // Reset transient state when switching chats.
  useEffect(() => {
    setReplyTo(null);
    setEditing(null);
  }, [chatId]);

  useMarkChatRead(chatId, (chat.data?.unreadCount ?? 0) > 0);

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

  const handleSend = useCallback(
    (input: { content?: string; attachments?: AttachmentInput[]; replyToId?: string }) => {
      sendMessage.mutate({ ...input, clientId: crypto.randomUUID() });
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
              duration: a.duration ?? undefined,
            }))
          : undefined,
        clientId: crypto.randomUUID(),
      });
    },
    [chatId, queryClient, sendMessage],
  );

  const handleDelete = useCallback(
    (message: Message, forEveryone: boolean) => {
      deleteMessage.mutate(
        { messageId: message.id, forEveryone },
        {
          onError: (error) =>
            toast({ title: getApiErrorMessage(error), status: 'error', duration: 4000 }),
        },
      );
    },
    [deleteMessage, toast],
  );

  const handleToggleReaction = useCallback(
    (message: Message, emoji: string) => {
      toggleReaction.mutate({ message, emoji });
    },
    [toggleReaction],
  );

  const handleSaveEdit = useCallback(
    (messageId: string, content: string) => {
      editMessage.mutate(
        { messageId, content },
        {
          onError: (error) =>
            toast({ title: getApiErrorMessage(error), status: 'error', duration: 4000 }),
        },
      );
    },
    [editMessage, toast],
  );

  if (chat.isLoading || !user) {
    return (
      <Center h="100%">
        <Spinner color="brand.500" />
      </Center>
    );
  }

  if (!chat.data) {
    return (
      <Center h="100%">
        <Text color="gray.500" fontSize="sm">
          Chat not found
        </Text>
      </Center>
    );
  }

  return (
    <Flex direction="column" h="100%" minH={0}>
      <ChatHeader chat={chat.data} />
      <MessageList
        chat={chat.data}
        currentUserId={user.id}
        messages={messages}
        isLoading={messagesQuery.isLoading}
        hasNextPage={messagesQuery.hasNextPage ?? false}
        isFetchingNextPage={messagesQuery.isFetchingNextPage}
        fetchNextPage={() => void messagesQuery.fetchNextPage()}
        highlightedId={anchor}
        isAnchored={!!anchor}
        onJumpToLatest={() => router.replace(`/chat/${chatId}`)}
        onReply={(message) => {
          setEditing(null);
          setReplyTo(message);
        }}
        onEdit={(message) => {
          setReplyTo(null);
          setEditing(message);
        }}
        onDelete={handleDelete}
        onToggleReaction={handleToggleReaction}
        onRetry={handleRetry}
      />
      <TypingIndicator chatId={chatId} />
      <MessageInput
        chatId={chatId}
        currentUserId={user.id}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        editing={editing}
        onCancelEdit={() => setEditing(null)}
        onSend={handleSend}
        onSaveEdit={handleSaveEdit}
      />
    </Flex>
  );
}
