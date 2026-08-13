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
  Text,
  Textarea,
  Tooltip,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { FiFile, FiImage, FiPaperclip, FiSend, FiSmile, FiX } from 'react-icons/fi';
import { getApiErrorMessage } from '@/lib/api-client';
import { uploadsService } from '@/services/uploads-service';
import { fullName, formatFileSize } from '@/utils/format';
import type { Message } from '@/types/api';
import type { AttachmentInput } from '../services/messages-service';
import { useTypingEmitter } from '../hooks/use-messages';
import { EmojiPicker } from './emoji-picker';
import { VoiceRecorder, VoiceRecording } from './voice-recorder';

interface PendingAttachment extends AttachmentInput {
  /** Local object URL for previewing images before send. */
  previewUrl?: string;
  isUploading?: boolean;
}

interface MessageInputProps {
  chatId: string;
  currentUserId: string;
  replyTo: Message | null;
  onCancelReply: () => void;
  editing: Message | null;
  onCancelEdit: () => void;
  onSend: (input: {
    content?: string;
    attachments?: AttachmentInput[];
    replyToId?: string;
  }) => void;
  onSaveEdit: (messageId: string, content: string) => void;
}

export function MessageInput({
  chatId,
  currentUserId,
  replyTo,
  onCancelReply,
  editing,
  onCancelEdit,
  onSend,
  onSaveEdit,
}: MessageInputProps) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { onType, stopTyping } = useTypingEmitter(chatId);
  const toast = useToast();
  const barBg = useColorModeValue('white', 'gray.800');
  const previewBg = useColorModeValue('gray.50', 'gray.700');

  // Entering edit mode loads the message text into the input.
  useEffect(() => {
    if (editing) {
      setText(editing.content ?? '');
      textareaRef.current?.focus();
    }
  }, [editing]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [chatId, replyTo]);

  const isUploading = attachments.some((a) => a.isUploading);
  const canSend = (text.trim().length > 0 || attachments.length > 0) && !isUploading;

  const handleFiles = async (files: FileList | null): Promise<void> => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files).slice(0, 10 - attachments.length)) {
      const isImage = file.type.startsWith('image/');
      const previewUrl = isImage ? URL.createObjectURL(file) : undefined;
      const placeholder: PendingAttachment = {
        originalName: file.name,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        url: '',
        previewUrl,
        isUploading: true,
      };
      setAttachments((prev) => [...prev, placeholder]);
      try {
        const uploaded = await uploadsService.upload(file);
        setAttachments((prev) =>
          prev.map((a) =>
            a === placeholder || (a.previewUrl === previewUrl && a.isUploading)
              ? { ...uploaded, previewUrl, isUploading: false }
              : a,
          ),
        );
      } catch (error) {
        setAttachments((prev) => prev.filter((a) => a.previewUrl !== previewUrl || !a.isUploading));
        toast({ title: getApiErrorMessage(error), status: 'error', duration: 4000 });
      }
    }
  };

  const removeAttachment = (index: number): void => {
    setAttachments((prev) => {
      const target = prev[index];
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleVoice = async (recording: VoiceRecording): Promise<void> => {
    try {
      const extension = recording.mimeType.includes('mp4') ? 'm4a' : 'webm';
      const uploaded = await uploadsService.upload(recording.blob, `voice-message.${extension}`);
      onSend({
        attachments: [{ ...uploaded, duration: Math.round(recording.duration * 10) / 10 }],
      });
    } catch (error) {
      toast({ title: getApiErrorMessage(error), status: 'error', duration: 4000 });
    }
  };

  const send = (): void => {
    if (editing) {
      const content = text.trim();
      if (content && content !== editing.content) {
        onSaveEdit(editing.id, content);
      }
      onCancelEdit();
      setText('');
      return;
    }

    if (!canSend) return;
    onSend({
      content: text.trim() || undefined,
      attachments: attachments.length
        ? attachments.map(({ previewUrl: _p, isUploading: _u, ...attachment }) => attachment)
        : undefined,
      replyToId: replyTo?.id,
    });
    setText('');
    attachments.forEach((a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl));
    setAttachments([]);
    onCancelReply();
    stopTyping();
    textareaRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
    if (event.key === 'Escape') {
      if (editing) onCancelEdit();
      if (replyTo) onCancelReply();
    }
  };

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    setText(event.target.value);
    if (!editing) onType();
    // auto-grow up to ~6 lines
    const el = event.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  };

  return (
    <Box borderTopWidth="1px" bg={barBg} px={{ base: 2, md: 4 }} py={2}>
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
          {attachments.map((attachment, index) => (
            <Box
              key={`${attachment.fileName}-${index}`}
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
                  <Icon as={FiFile} />
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
                aria-label="Remove attachment"
                icon={<FiX />}
                size="xs"
                borderRadius="full"
                position="absolute"
                top="-6px"
                right="-6px"
                colorScheme="red"
                onClick={() => removeAttachment(index)}
              />
            </Box>
          ))}
        </HStack>
      )}

      {/* input row */}
      <HStack align="flex-end" spacing={1}>
        <Popover placement="top-start" isLazy>
          <PopoverTrigger>
            <IconButton aria-label="Emoji" icon={<FiSmile />} variant="ghost" size="sm" />
          </PopoverTrigger>
          <PopoverContent w="300px">
            <PopoverBody p={2}>
              <EmojiPicker
                onPick={(emoji) => {
                  setText((prev) => `${prev}${emoji}`);
                  textareaRef.current?.focus();
                }}
              />
            </PopoverBody>
          </PopoverContent>
        </Popover>

        {!editing && (
          <>
            <Tooltip label="Send image">
              <IconButton
                aria-label="Send image"
                icon={<FiImage />}
                variant="ghost"
                size="sm"
                onClick={() => imageInputRef.current?.click()}
              />
            </Tooltip>
            <Tooltip label="Send file">
              <IconButton
                aria-label="Send file"
                icon={<FiPaperclip />}
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              />
            </Tooltip>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                void handleFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                void handleFiles(e.target.files);
                e.target.value = '';
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
          placeholder="Type a message…"
          rows={1}
          resize="none"
          minH="40px"
          maxH="144px"
          borderRadius="xl"
          fontSize="sm"
          flex="1"
        />

        {!editing && <VoiceRecorder onFinish={(r) => void handleVoice(r)} />}

        <IconButton
          aria-label={editing ? 'Save edit' : 'Send message'}
          icon={<FiSend />}
          size="sm"
          borderRadius="full"
          isDisabled={editing ? !text.trim() : !canSend}
          onClick={send}
        />
      </HStack>
    </Box>
  );
}
