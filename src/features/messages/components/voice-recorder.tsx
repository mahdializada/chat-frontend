'use client';

import { HStack, IconButton, Text, Tooltip, useToast } from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';
import { FiCheck, FiMic, FiX } from 'react-icons/fi';
import { formatDuration } from '@/utils/format';

export interface VoiceRecording {
  blob: Blob;
  mimeType: string;
  duration: number;
}

interface VoiceRecorderProps {
  onFinish: (recording: VoiceRecording) => void;
  isDisabled?: boolean;
}

/** Records audio with MediaRecorder; confirm sends the clip, X discards it. */
export function VoiceRecorder({ onFinish, isDisabled }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);
  const toast = useToast();

  const cleanup = (): void => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    recorderRef.current = null;
    setIsRecording(false);
    setElapsed(0);
  };

  useEffect(() => cleanup, []);

  const start = async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      cancelledRef.current = false;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const duration = (Date.now() - startTimeRef.current) / 1000;
        const type = recorder.mimeType || 'audio/webm';
        if (!cancelledRef.current && chunksRef.current.length > 0 && duration >= 0.5) {
          onFinish({ blob: new Blob(chunksRef.current, { type }), mimeType: type, duration });
        }
        cleanup();
      };

      recorderRef.current = recorder;
      startTimeRef.current = Date.now();
      recorder.start(250);
      setIsRecording(true);
      timerRef.current = setInterval(
        () => setElapsed((Date.now() - startTimeRef.current) / 1000),
        200,
      );
    } catch {
      toast({
        title: 'Microphone unavailable',
        description: 'Allow microphone access to record voice messages.',
        status: 'error',
        duration: 4000,
      });
    }
  };

  const stop = (cancelled: boolean): void => {
    cancelledRef.current = cancelled;
    recorderRef.current?.stop();
  };

  if (!isRecording) {
    return (
      <Tooltip label="Voice message">
        <IconButton
          aria-label="Record voice message"
          icon={<FiMic />}
          variant="ghost"
          size="sm"
          isDisabled={isDisabled}
          onClick={() => void start()}
        />
      </Tooltip>
    );
  }

  return (
    <HStack
      spacing={2}
      bg="red.500"
      color="white"
      borderRadius="full"
      px={3}
      py={1}
      flexShrink={0}
    >
      <IconButton
        aria-label="Cancel recording"
        icon={<FiX />}
        size="xs"
        variant="ghost"
        colorScheme="whiteAlpha"
        color="white"
        onClick={() => stop(true)}
      />
      <Text fontSize="sm" fontFamily="mono" minW="42px" textAlign="center">
        {formatDuration(elapsed)}
      </Text>
      <IconButton
        aria-label="Send voice message"
        icon={<FiCheck />}
        size="xs"
        variant="ghost"
        colorScheme="whiteAlpha"
        color="white"
        onClick={() => stop(false)}
      />
    </HStack>
  );
}
