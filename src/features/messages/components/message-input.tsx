'use client';

import {
  Box,
  Center,
  CircularProgress,
  HStack,
  Icon,
  IconButton,
  Image,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
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
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import {
  ChangeEvent,
  ClipboardEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  FiCheck,
  FiFile,
  FiImage,
  FiPaperclip,
  FiPlus,
  FiSend,
  FiSmile,
  FiUploadCloud,
  FiX,
} from 'react-icons/fi';
import { GifPicker } from '@/features/media/components/gif-picker';
import { StickerPicker } from '@/features/media/components/sticker-picker';
import { chatsService } from '@/features/chats/services/chats-service';
import { useCoarsePointer } from '@/hooks/use-media';
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
  /** Upload progress 0–100 while `isUploading`. */
  progress?: number;
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
const MAX_ATTACHMENTS = 10;
const MAX_TEXTAREA_HEIGHT = 144; // ~6 lines

function dragHasFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files');
}

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
  const isTouch = useCoarsePointer();

  const [text, setText] = useState(storedDraft ?? chat.settings.draft ?? '');
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [mention, setMention] = useState<{ query: string; start: number } | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionCandidates, setMentionCandidates] = useState<MentionCandidate[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attachmentPicker = useDisclosure();

  const { onType, stopTyping } = useTypingEmitter(chatId);
  const toast = useToast();

  // Switching conversations loads that chat's draft, and flushes the previous
  // one immediately so it is never lost to a cancelled debounce.
  useEffect(() => {
    setText(useChatUiStore.getState().drafts[chatId] ?? chat.settings.draft ?? '');
    setAttachments([]);
    setMention(null);
    if (!isTouch) textareaRef.current?.focus();

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

  // Auto-grow up to ~6 lines whenever the text changes — typing, loading a
  // draft, entering edit mode or inserting an emoji.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [text]);

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

  const handleFiles = async (files: FileList | File[] | null): Promise<void> => {
    const list = files ? Array.from(files) : [];
    if (list.length === 0) return;
    if (isOffline) {
      toast({
        title: 'You are offline',
        description: 'Attachments can be sent once you reconnect.',
        status: 'warning',
      });
      return;
    }
    const room = MAX_ATTACHMENTS - attachments.length;
    if (room <= 0) {
      toast({
        title: `Up to ${MAX_ATTACHMENTS} files per message`,
        description: 'Send this message first, then attach more.',
        status: 'warning',
      });
      return;
    }
    if (list.length > room) {
      toast({
        title: `Only the first ${room} file${room === 1 ? '' : 's'} were added`,
        description: `A message can carry up to ${MAX_ATTACHMENTS} files.`,
        status: 'info',
      });
    }

    for (const file of list.slice(0, room)) {
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
          progress: 0,
        },
      ]);

      try {
        const uploaded = await uploadsService.upload(file, undefined, (progress) =>
          setAttachments((prev) => prev.map((a) => (a.key === key ? { ...a, progress } : a))),
        );
        setAttachments((prev) =>
          prev.map((a) =>
            a.key === key ? { ...a, ...uploaded, isUploading: false, progress: 100 } : a,
          ),
        );
      } catch (error) {
        setAttachments((prev) => prev.filter((a) => a.key !== key));
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        toast({
          title: `Couldn't upload ${file.name}`,
          description: getApiErrorMessage(error),
          status: 'error',
        });
      }
    }
  };
  const handleFilesRef = useRef(handleFiles);
  handleFilesRef.current = handleFiles;

  // Drag a file anywhere over the window to attach it.
  useEffect(() => {
    if (editing || isDisabled) return;
    let depth = 0;
    const onDragEnter = (event: DragEvent): void => {
      if (!dragHasFiles(event)) return;
      depth += 1;
      setIsDragging(true);
    };
    const onDragLeave = (event: DragEvent): void => {
      if (!dragHasFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setIsDragging(false);
    };
    const onDragOver = (event: DragEvent): void => {
      if (dragHasFiles(event)) event.preventDefault();
    };
    const onDrop = (event: DragEvent): void => {
      if (!dragHasFiles(event)) return;
      event.preventDefault();
      depth = 0;
      setIsDragging(false);
      void handleFilesRef.current(event.dataTransfer?.files ?? null);
    };
    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, [editing, isDisabled]);

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>): void => {
    const files = Array.from(event.clipboardData?.files ?? []);
    if (files.length === 0 || editing) return;
    event.preventDefault();
    void handleFiles(files);
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
      toast({
        title: "Couldn't send the voice message",
        description: getApiErrorMessage(error),
        status: 'error',
      });
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

  /** Inserts a snippet at the caret (emoji picker) instead of appending to the end. */
  const insertAtCaret = (snippet: string): void => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    applyText(`${text.slice(0, start)}${snippet}${text.slice(end)}`);
    requestAnimationFrame(() => {
      const caret = start + snippet.length;
      el?.setSelectionRange(caret, caret);
    });
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
        ? attachments.map(
            ({ previewUrl: _p, isUploading: _u, progress: _g, key: _k, ...attachment }) =>
              attachment,
          )
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

    // Enter sends on a keyboard; on a phone it adds a line and the button sends.
    if (event.key === 'Enter' && !event.shiftKey && !isTouch) {
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
        borderColor="border.subtle"
        bg="bg.surface"
        px={4}
        py={4}
        pb="max(1rem, env(safe-area-inset-bottom))"
        textAlign="center"
      >
        <Text fontSize="sm" color="text.muted">
          {disabledReason}
        </Text>
      </Box>
    );
  }

  const fileInputs = (
    <>
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
  );

  return (
    <Box
      borderTopWidth="1px"
      borderColor="border.subtle"
      bg="bg.surface"
      px={{ base: 2, md: 4 }}
      pt={2}
      pb="max(0.5rem, env(safe-area-inset-bottom))"
      position="relative"
    >
      {isDragging && (
        <Center
          position="fixed"
          inset={0}
          zIndex="overlay"
          bg="blackAlpha.600"
          color="white"
          pointerEvents="none"
          flexDirection="column"
          gap={3}
        >
          <Icon as={FiUploadCloud} boxSize={12} aria-hidden />
          <Text fontSize="lg" fontWeight="semibold">
            Drop files to attach them
          </Text>
        </Center>
      )}

      {/* reply / edit banners */}
      {(replyTo || editing) && (
        <HStack
          bg="bg.subtle"
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
            <Text fontSize="xs" color="text.muted" noOfLines={1}>
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
        <HStack spacing={2} mb={2} overflowX="auto" py={1} px={1}>
          {attachments.map((attachment) => (
            <Box key={attachment.key} position="relative" flexShrink={0}>
              {attachment.previewUrl ? (
                <Image
                  src={attachment.previewUrl}
                  alt={attachment.originalName}
                  boxSize="64px"
                  objectFit="cover"
                  borderRadius="md"
                />
              ) : (
                <HStack bg="bg.subtle" borderRadius="md" px={2} py={2} maxW="180px" spacing={2}>
                  <Icon as={FiFile} aria-hidden />
                  <Box minW={0}>
                    <Text fontSize="xs" noOfLines={1}>
                      {attachment.originalName}
                    </Text>
                    <Text fontSize="0.65rem" color="text.muted">
                      {formatFileSize(attachment.size)}
                    </Text>
                  </Box>
                </HStack>
              )}
              {attachment.isUploading && (
                <Center
                  position="absolute"
                  inset={0}
                  bg="blackAlpha.500"
                  borderRadius="md"
                  aria-label={`Uploading ${attachment.originalName}`}
                >
                  <CircularProgress
                    value={attachment.progress ?? 0}
                    isIndeterminate={!attachment.progress}
                    size="28px"
                    thickness="10px"
                    color="white"
                    trackColor="whiteAlpha.400"
                  />
                </Center>
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
              isRound
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
                    <EmojiPicker onPick={insertAtCaret} />
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
            {/* Phones: one "+" button; wider screens: photo and file side by side. */}
            <Box display={{ base: 'block', md: 'none' }}>
              <Menu placement="top-start" isLazy>
                <MenuButton
                  as={IconButton}
                  aria-label="Attach"
                  icon={<FiPlus />}
                  variant="ghost"
                  size="sm"
                  isRound
                />
                <MenuList minW="200px">
                  <MenuItem icon={<FiImage />} onClick={() => imageInputRef.current?.click()}>
                    Photo or video
                  </MenuItem>
                  <MenuItem icon={<FiPaperclip />} onClick={() => fileInputRef.current?.click()}>
                    Document
                  </MenuItem>
                </MenuList>
              </Menu>
            </Box>
            <HStack spacing={1} display={{ base: 'none', md: 'flex' }}>
              <Tooltip label="Send photo or video">
                <IconButton
                  aria-label="Send photo or video"
                  icon={<FiImage />}
                  variant="ghost"
                  size="sm"
                  isRound
                  onClick={() => imageInputRef.current?.click()}
                />
              </Tooltip>
              <Tooltip label="Attach file">
                <IconButton
                  aria-label="Attach file"
                  icon={<FiPaperclip />}
                  variant="ghost"
                  size="sm"
                  isRound
                  onClick={() => fileInputRef.current?.click()}
                />
              </Tooltip>
            </HStack>
            {fileInputs}
          </>
        )}

        <Textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={stopTyping}
          placeholder={isOffline ? 'Type a message — it will send when you reconnect' : 'Message'}
          rows={1}
          resize="none"
          minH="40px"
          maxH={`${MAX_TEXTAREA_HEIGHT}px`}
          borderRadius="xl"
          bg="bg.subtle"
          fontSize="sm"
          flex="1"
          aria-label="Message"
        />

        {!editing && <VoiceRecorder onFinish={(r) => void handleVoice(r)} isDisabled={isOffline} />}

        <Tooltip label={editing ? 'Save' : isUploading ? 'Uploading…' : 'Send'}>
          <IconButton
            aria-label={editing ? 'Save edit' : 'Send message'}
            icon={editing ? <FiCheck /> : <FiSend />}
            size="sm"
            isRound
            isDisabled={editing ? !text.trim() : !canSend}
            onClick={send}
          />
        </Tooltip>
      </HStack>
    </Box>
  );
}
