'use client';

import { Button, HStack, IconButton, Text, useColorModeValue } from '@chakra-ui/react';
import { FiCopy, FiCornerUpRight, FiStar, FiTrash2, FiX } from 'react-icons/fi';

interface SelectionToolbarProps {
  count: number;
  onCancel: () => void;
  onCopy: () => void;
  onForward: () => void;
  onStar: () => void;
  onDelete: () => void;
  canDeleteForEveryone: boolean;
}

/** Replaces the chat header while messages are selected. */
export function SelectionToolbar({
  count,
  onCancel,
  onCopy,
  onForward,
  onStar,
  onDelete,
}: SelectionToolbarProps) {
  const bg = useColorModeValue('brand.50', 'whiteAlpha.100');
  const border = useColorModeValue('gray.200', 'whiteAlpha.200');

  return (
    <HStack
      px={{ base: 2, md: 4 }}
      py={2.5}
      spacing={2}
      bg={bg}
      borderBottomWidth="1px"
      borderColor={border}
      role="toolbar"
      aria-label="Message selection actions"
    >
      <IconButton
        aria-label="Cancel selection"
        icon={<FiX />}
        variant="ghost"
        size="sm"
        onClick={onCancel}
      />
      <Text fontSize="sm" fontWeight="semibold" flex="1">
        {count} message{count === 1 ? '' : 's'} selected
      </Text>

      <Button size="sm" variant="ghost" leftIcon={<FiCopy />} onClick={onCopy}>
        Copy
      </Button>
      <Button size="sm" variant="ghost" leftIcon={<FiCornerUpRight />} onClick={onForward}>
        Forward
      </Button>
      <Button size="sm" variant="ghost" leftIcon={<FiStar />} onClick={onStar}>
        Star
      </Button>
      <Button size="sm" variant="ghost" colorScheme="red" leftIcon={<FiTrash2 />} onClick={onDelete}>
        Delete
      </Button>
    </HStack>
  );
}
