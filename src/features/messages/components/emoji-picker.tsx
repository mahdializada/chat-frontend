'use client';

import { Box, SimpleGrid } from '@chakra-ui/react';

export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

const EMOJI_LIST = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
  '🙂', '😉', '😍', '🥰', '😘', '😜', '🤪', '🤔', '🤨', '😐',
  '😴', '🥱', '😪', '😷', '🤒', '🥳', '😎', '🤓', '🧐', '😕',
  '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😢', '😭',
  '😤', '😠', '😡', '🤬', '👍', '👎', '👏', '🙌', '🤝', '🙏',
  '💪', '✌️', '🤞', '👌', '🤙', '👋', '❤️', '🧡', '💛', '💚',
  '💙', '💜', '🖤', '💯', '💫', '🔥', '🎉', '🎊', '✨', '⭐',
];

interface EmojiPickerProps {
  onPick: (emoji: string) => void;
}

export function EmojiPicker({ onPick }: EmojiPickerProps) {
  return (
    <SimpleGrid columns={8} spacing={1} maxH="220px" overflowY="auto" p={1}>
      {EMOJI_LIST.map((emoji) => (
        <Box
          key={emoji}
          as="button"
          type="button"
          fontSize="xl"
          borderRadius="md"
          p={1}
          _hover={{ bg: 'whiteAlpha.300' }}
          onClick={() => onPick(emoji)}
        >
          {emoji}
        </Box>
      ))}
    </SimpleGrid>
  );
}
