'use client';

import { HStack, IconButton, Slider, SliderFilledTrack, SliderThumb, SliderTrack, Text } from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';
import { FiPause, FiPlay } from 'react-icons/fi';
import { absoluteUrl } from '@/lib/env';
import { formatDuration } from '@/utils/format';
import type { Attachment } from '@/types/api';

interface AudioPlayerProps {
  attachment: Attachment;
  isOwn: boolean;
}

export function AudioPlayer({ attachment, isOwn }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(attachment.duration ?? 0);

  useEffect(() => {
    const audio = new Audio(absoluteUrl(attachment.url));
    audioRef.current = audio;

    const onTime = (): void => setCurrentTime(audio.currentTime);
    const onLoaded = (): void => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };
    const onEnded = (): void => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('ended', onEnded);
      audioRef.current = null;
    };
  }, [attachment.url]);

  const toggle = (): void => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      void audio.play();
      setIsPlaying(true);
    }
  };

  const seek = (value: number): void => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    audio.currentTime = (value / 100) * duration;
    setCurrentTime(audio.currentTime);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <HStack spacing={2} minW="200px" maxW="260px" py={1}>
      <IconButton
        aria-label={isPlaying ? 'Pause' : 'Play'}
        icon={isPlaying ? <FiPause /> : <FiPlay />}
        size="sm"
        borderRadius="full"
        onClick={toggle}
        colorScheme={isOwn ? 'whiteAlpha' : 'brand'}
      />
      <Slider
        aria-label="Audio progress"
        value={progress}
        onChange={seek}
        size="sm"
        flex="1"
        focusThumbOnChange={false}
      >
        <SliderTrack bg={isOwn ? 'whiteAlpha.400' : 'blackAlpha.200'}>
          <SliderFilledTrack bg={isOwn ? 'white' : 'brand.500'} />
        </SliderTrack>
        <SliderThumb boxSize={2.5} />
      </Slider>
      <Text fontSize="xs" flexShrink={0} opacity={0.8}>
        {formatDuration(isPlaying || currentTime > 0 ? currentTime : duration)}
      </Text>
    </HStack>
  );
}
