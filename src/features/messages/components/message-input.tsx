'use client';

import {
  Box,
  HStack,
  Icon,
  IconButton,
  Image,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Textarea,
  Tooltip,
  useColorModeValue,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { ChangeEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import {
  FiCornerUpRight,
  FiFile,
  FiImage,
  FiPaperclip,
  FiSend,
  FiSmile,
  FiX,
} from 'react-icons/fi';
import { GifPicker } from '@/features/media/components/gif-picker';
import { StickerPicker } from '@/features/media/components/sticker-picker';
import { chatsService } from '@/features/chats/services/chats-service';
import { getApiErrorMessage } from '@/lib/api-client';
import { uploadsService } from '@/services/uploads-service';
import { useChatUiStore } from '@/store/chat-ui-store';
import { useConnectionStore } from '@/store/connection-store';
import { formatFileSize, fullName } from '@/utils/format';
import type { Chat, GifItem, Message, Sticker } from '@/types/api';
import type { AttachmentInput } from '../services/messages-service';
import { useTypingEmitter } from '../hooks/use-messages';
import { EmojiPicker } from './emoji-picker';
import {
  findMentionToken,
  MentionAutocomplete,
  MentionCandidate,
} from './mention-autocomplete';
import { VoiceRecorder, VoiceRecording } from './voice-recorder';

interface PendingAttachment extends AttachmentInput {
  /** Local object URL for previewing images before send. */
  previewUrl?: string;
  isUploading?: boolean;
  key: string;
}

interface MessageInputProps {
  chat: Chat;
  currentUserId: string;
  replyTo: Message | null;
  onCancelReply: () => void;
  editing: Message | null;
  onCancelEdit: () => void;
  onSend: (input: {
    content?: string;
    attachments?: AttachmentInput[];
    replyToId?: string;
    type?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'AUDIO' | 'STICKER' | 'GIF';
  }) => void;
  onSaveEdit: (messageId: string, content: string) => void;
  /** Set when the user is not permitted to post (blocked / admins-only group). */
  disabledReason?: string | null;
}

const DRAFT_SAVE_DEBOUNCE_MS = 800;

export function MessageInput({
  chat,
  currentUserId,
  replyTo,
  onCancelReply,
  editing,
  onCancelEdit,
  onSend,
  onSaveEdit,
  disabledReason,
}: MessageInputProps) {
  const chatId = chat.id;
  const storedDraft = useChatUiStore((s) => s.drafts[chatId]);
  const setStoredDraft = useChatUiStore((s) => s.setDraft);
  const clearStoredDraft = useChatUiStore((s) => s.clearDraft);
  const isOffline = useConnectionStore((s) => !s.isNetworkOnline);

  const [text, setText] = useState(storedDraft ?? chat.settings.draft ?? '');
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [mention, setMention] = useState<{ query: string; start: number } | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionCandidates, setMentionCandidates] = useState<MentionCandidate[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attachmentPicker = useDisclosure();

  const { onType, stopTyping } = useTypingEmitter(chatId);
  const toast = useToast();
  const barBg = useColorModeValue('white', 'gray.800');
  const previewBg = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200');

  // Switching conversations loads that chat's draft, and flushes the previous
  // one immediately so it is never lost to a cancelled debounce.
  useEffect(() => {
    setText(useChatUiStore.getState().drafts[chatId] ?? chat.settings.draft ?? '');
    setAttachments([]);
    setMention(null);
    textareaRef.current?.focus();

    const previousChatId = chatId;
    return () => {
      if (!draftTimerRef.current) return;
      cancelPendingDraftSave();
      const pending = useChatUiStore.getState().drafts[previousChatId] ?? '';
      void chatsService.saveDraft(previousChatId, pending).catch(() => undefined);
    };
    // Only re-run when the conversation itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  // Entering edit mode loads the message text into the input.
  useEffect(() => {
    if (editing) {
      setText(editing.content ?? '');
      textareaRef.current?.focus();
    }
  }, [editing]);

  useEffect(() => {
    if (replyTo) textareaRef.current?.focus();
  }, [replyTo]);

  const cancelPendingDraftSave = useCallback(() => {
    if (draftTimerRef.current) {
      clearTimeout(draftTimerRef.current);
      draftTimerRef.current = null;
    }
  }, []);

  /** Persists the draft server-side (debounced) so it follows the user. */
  const scheduleDraftSave = useCallback(
    (value: string) => {
      cancelPendingDraftSave();
      draftTimerRef.current = setTimeout(() => {
        draftTimerRef.current = null;
        void chatsService.saveDraft(chatId, value).catch(() => undefined);
      }, DRAFT_SAVE_DEBOUNCE_MS);
    },
    [chatId, cancelPendingDraftSave],
  );

  useEffect(() => cancelPendingDraftSave, [cancelPendingDraftSave]);

  const isUploading = attachments.some((a) => a.isUploading);
  const canSend = (text.trim().length > 0 || attachments.length > 0) && !isUploading;
  const isDisabled = !!disabledReason;

  // ── attachments ────────────────────────────────────────────────────────────

  const handleFiles = async (files: FileList | null): Promise<void> => {
    if (!files || files.length === 0) return;
    if (isOffline) {
      toast({
        title: 'You are offline',
        description: 'Attachments can be sent once you reconnect.',
        status: 'warning',
        duration: 4000,
      });
      return;
    }

    for (const file of Array.from(files).slice(0, 10 - attachments.length)) {
      const key = crypto.randomUUID();
      const isImage = file.type.startsWith('image/');
      const previewUrl = isImage ? URL.createObjectURL(file) : undefined;

      setAttachments((prev) => [
        ...prev,
        {
          key,
          originalName: file.name,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          url: '',
          previewUrl,
          isUploading: true,
        },
      ]);

      try {
        const uploaded = await uploadsService.upload(file);
        setAttachments((prev) =>
          prev.map((a) => (a.key === key ? { ...a, ...uploaded, isUploading: false } : a)),
        );
      } catch (error) {
        setAttachments((prev) => prev.filter((a) => a.key !== key));
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        toast({ title: getApiErrorMessage(error), status: 'error', duration: 4000 });
      }
    }
  };

  const removeAttachment = (key: string): void => {
    setAttachments((prev) => {
      const target = prev.find((a) => a.key === key);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((a) => a.key !== key);
    });
  };

  const handleVoice = async (recording: VoiceRecording): Promise<void> => {
    try {
      const extension = recording.mimeType.includes('mp4') ? 'm4a' : 'webm';
      const uploaded = await uploadsService.upload(recording.blob, `voice-message.${extension}`);
      onSend({
        type: 'AUDIO',
        attachments: [{ ...uploaded, duration: Math.round(recording.duration * 10) / 10 }],
      });
    } catch (error) {
      toast({ title: getApiErrorMessage(error), status: 'error', duration: 4000 });
    }
  };

  const sendGif = (gif: GifItem): void => {
    attachmentPicker.onClose();
    onSend({
      type: 'GIF',
      attachments: [
        {
          originalName: `${gif.title || 'gif'}.gif`,
          fileName: `${gif.id}.gif`,
          mimeType: gif.mimeType,
          size: Math.max(1, gif.size),
          url: gif.url,
          source: 'REMOTE',
          thumbnailUrl: gif.thumbnailUrl ?? gif.previewUrl,
          width: gif.width,
          height: gif.height,
        },
      ],
    });
  };

  const sendSticker = (sticker: Sticker): void => {
    attachmentPicker.onClose();
    onSend({
      type: 'STICKER',
      attachments: [
        {
          originalName: sticker.emoji ? `sticker-${sticker.emoji}.svg` : 'sticker.svg',
          fileName: `${sticker.id}.svg`,
          mimeType: 'image/svg+xml',
          size: 1,
          url: sticker.url,
          source: 'LOCAL',
          width: sticker.width ?? undefined,
          height: sticker.height ?? undefined,
        },
      ],
    });
  };

  // ── composing ──────────────────────────────────────────────────────────────

  const applyText = (value: string): void => {
    setText(value);
    setStoredDraft(chatId, value);
    if (!editing) {
      scheduleDraftSave(value);
      onType();
    }
  };

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    const value = event.target.value;
    applyText(value);

    // @mention autocomplete only makes sense inside a group.
    if (chat.type === 'GROUP') {
      const token = findMentionToken(value, event.target.selectionStart ?? value.length);
      setMention(token);
      setMentionIndex(0);
    }

    // auto-grow up to ~6 lines
    const el = event.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  };

  const insertMention = (candidate: MentionCandidate): void => {
    if (!mention) return;
    const before = text.slice(0, mention.start);
    const after = text.slice(mention.start + mention.query.length + 1);
    const next = `${before}@${candidate.username} ${after.replace(/^\s/, '')}`;
    applyText(next);
    setMention(null);
    requestAnimationFrame(() => {
      const caret = before.length + candidate.username.length + 2;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(caret, caret);
    });
  };

  const send = (): void => {
    if (editing) {
      const content = text.trim();
      if (content && content !== editing.content) {
        onSaveEdit(editing.id, content);
      }
      onCancelEdit();
      setText('');
      cancelPendingDraftSave();
      clearStoredDraft(chatId);
      return;
    }

    if (!canSend || isDisabled) return;
    onSend({
      content: text.trim() || undefined,
      attachments: attachments.length
        ? attachments.map(({ previewUrl: _p, isUploading: _u, key: _k, ...attachment }) => attachment)
        : undefined,
      replyToId: replyTo?.id,
    });

    setText('');
    // Cancel the debounced save first: otherwise it fires after this and
    // resurrects the text that was just sent as a draft.
    cancelPendingDraftSave();
    clearStoredDraft(chatId);
    void chatsService.saveDraft(chatId, '').catch(() => undefined);
    attachments.forEach((a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl));
    setAttachments([]);
    setMention(null);
    onCancelReply();
    stopTyping();
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    textareaRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (mention && mentionCandidates.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setMentionIndex((index) => (index + 1) % mentionCandidates.length);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setMentionIndex(
          (index) => (index - 1 + mentionCandidates.length) % mentionCandidates.length,
        );
        return;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        insertMention(mentionCandidates[mentionIndex]);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setMention(null);
        return;
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
      return;
    }
    if (event.key === 'Escape') {
      if (editing) onCancelEdit();
      if (replyTo) onCancelReply();
    }
  };

  if (isDisabled) {
    return (
      <Box
        borderTopWidth="1px"
        borderColor={borderColor}
        bg={barBg}
        px={4}
        py={4}
        textAlign="center"
      >
        <Text fontSize="sm" color="gray.500">
          {disabledReason}
        </Text>
      </Box>
    );
  }

  return (
    <Box
      borderTopWidth="1px"
      borderColor={borderColor}
      bg={barBg}
      px={{ base: 2, md: 4 }}
      py={2}
      position="relative"
    >
      {/* reply / edit banners */}
      {(replyTo || editing) && (
        <HStack
          bg={previewBg}
          borderRadius="md"
          px={3}
          py={2}
          mb={2}
          borderLeftWidth="3px"
          borderLeftColor="brand.400"
          justify="space-between"
        >
          <Box minW={0}>
            <Text fontSize="xs" fontWeight="semibold" color="brand.400">
              {editing
                ? 'Editing message'
                : `Replying to ${
                    replyTo?.senderId === currentUserId ? 'yourself' : fullName(replyTo?.sender)
                  }`}
            </Text>
            <Text fontSize="xs" color="gray.500" noOfLines={1}>
              {(editing ?? replyTo)?.content ?? 'Attachment'}
            </Text>
          </Box>
          <IconButton
            aria-label="Cancel"
            icon={<FiX />}
            size="xs"
            variant="ghost"
            onClick={editing ? onCancelEdit : onCancelReply}
          />
        </HStack>
      )}

      {/* attachment previews */}
      {attachments.length > 0 && (
        <HStack spacing={2} mb={2} overflowX="auto" py={1}>
          {attachments.map((attachment) => (
            <Box
              key={attachment.key}
              position="relative"
              flexShrink={0}
              opacity={attachment.isUploading ? 0.5 : 1}
            >
              {attachment.previewUrl ? (
                <Image
                  src={attachment.previewUrl}
                  alt={attachment.originalName}
                  boxSize="64px"
                  objectFit="cover"
                  borderRadius="md"
                />
              ) : (
                <HStack bg={previewBg} borderRadius="md" px={2} py={2} maxW="180px" spacing={2}>
                  <Icon as={FiFile} aria-hidden />
                  <Box minW={0}>
                    <Text fontSize="xs" noOfLines={1}>
                      {attachment.originalName}
                    </Text>
                    <Text fontSize="0.6rem" color="gray.500">
                      {formatFileSize(attachment.size)}
                    </Text>
                  </Box>
                </HStack>
              )}
              <IconButton
                aria-label={`Remove ${attachment.originalName}`}
                icon={<FiX />}
                size="xs"
                borderRadius="full"
                position="absolute"
                top="-6px"
                right="-6px"
                colorScheme="red"
                onClick={() => removeAttachment(attachment.key)}
              />
            </Box>
          ))}
        </HStack>
      )}

      {/* mention autocomplete */}
      {mention && chat.type === 'GROUP' && (
        <Box position="relative">
          <MentionAutocomplete
            chat={chat}
            currentUserId={currentUserId}
            query={mention.query}
            activeIndex={mentionIndex}
            onSelect={insertMention}
            onCandidatesChange={setMentionCandidates}
          />
        </Box>
      )}

      {/* input row */}
      <HStack align="flex-end" spacing={1}>
        <Popover
          placement="top-start"
          isLazy
          isOpen={attachmentPicker.isOpen}
          onOpen={attachmentPicker.onOpen}
          // Focus returns to the composer only once the picker is dismissed —
          // refocusing on every pick would blur (and close) the popover, so
          // several emoji could never be chosen in a row.
          onClose={() => {
            attachmentPicker.onClose();
            textareaRef.current?.focus();
          }}
        >
          <PopoverTrigger>
            <IconButton
              aria-label="Emoji, GIFs and stickers"
              icon={<FiSmile />}
              variant="ghost"
              size="sm"
            />
          </PopoverTrigger>
          <PopoverContent w={{ base: '300px', md: '340px' }}>
            <PopoverBody p={2}>
              <Tabs variant="soft-rounded" colorScheme="brand" size="sm" isLazy>
                <TabList mb={2} gap={1}>
                  <Tab fontSize="xs">Emoji</Tab>
                  <Tab fontSize="xs">GIFs</Tab>
                  <Tab fontSize="xs">Stickers</Tab>
                </TabList>
                <TabPanels>
                  <TabPanel p={0}>
                    <EmojiPicker onPick={(emoji) => applyText(`${text}${emoji}`)} />
                  </TabPanel>
                  <TabPanel p={0}>
                    <GifPicker onPick={sendGif} />
                  </TabPanel>
                  <TabPanel p={0}>
                    <StickerPicker onPick={sendSticker} />
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </PopoverBody>
          </PopoverContent>
        </Popover>

        {!editing && (
          <>
            <Tooltip label="Send image or video">
              <IconButton
                aria-label="Send image or video"
                icon={<FiImage />}
                variant="ghost"
                size="sm"
                onClick={() => imageInputRef.current?.click()}
              />
            </Tooltip>
            <Tooltip label="Attach file">
              <IconButton
                aria-label="Attach file"
                icon={<FiPaperclip />}
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              />
            </Tooltip>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              hidden
              onChange={(event) => {
                void handleFiles(event.target.files);
                event.target.value = '';
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={(event) => {
                void handleFiles(event.target.files);
                event.target.value = '';
              }}
            />
          </>
        )}

        <Textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={stopTyping}
          placeholder={isOffline ? 'Type a message — it will send when you reconnect' : 'Type a message…'}
          rows={1}
          resize="none"
          minH="40px"
          maxH="144px"
          borderRadius="xl"
          fontSize="sm"
          flex="1"
          aria-label="Message"
        />

        {!editing && <VoiceRecorder onFinish={(r) => void handleVoice(r)} isDisabled={isOffline} />}

        <Tooltip label={editing ? 'Save' : 'Send'}>
          <IconButton
            aria-label={editing ? 'Save edit' : 'Send message'}
            icon={editing ? <FiCornerUpRight /> : <FiSend />}
            size="sm"
            borderRadius="full"
            isDisabled={editing ? !text.trim() : !canSend}
            onClick={send}
          />
        </Tooltip>
      </HStack>
    </Box>
  );
}
