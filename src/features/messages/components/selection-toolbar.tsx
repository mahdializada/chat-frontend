'use client';

import { Button, HStack, IconButton, Text } from '@chakra-ui/react';
import { Fragment } from 'react';
import type { IconType } from 'react-icons';
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
  const actions: { label: string; icon: IconType; onClick: () => void; colorScheme?: string }[] = [
    { label: 'Copy', icon: FiCopy, onClick: onCopy },
    { label: 'Forward', icon: FiCornerUpRight, onClick: onForward },
    { label: 'Star', icon: FiStar, onClick: onStar },
    { label: 'Delete', icon: FiTrash2, onClick: onDelete, colorScheme: 'red' },
  ];

  return (
    <HStack
      px={{ base: 2, md: 4 }}
      py={2.5}
      spacing={{ base: 0.5, md: 2 }}
      bg="bg.active"
      borderBottomWidth="1px"
      borderColor="border.subtle"
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
      <Text fontSize="sm" fontWeight="semibold" flex="1" noOfLines={1}>
        {count} selected
      </Text>

      {/* Icon-only on phones, labelled on wider screens. */}
      {actions.map((action) => (
        <Fragment key={action.label}>
          <IconButton
            display={{ base: 'inline-flex', md: 'none' }}
            aria-label={action.label}
            icon={<action.icon />}
            size="sm"
            variant="ghost"
            colorScheme={action.colorScheme}
            onClick={action.onClick}
          />
          <Button
            display={{ base: 'none', md: 'inline-flex' }}
            size="sm"
            variant="ghost"
            colorScheme={action.colorScheme}
            leftIcon={<action.icon />}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        </Fragment>
      ))}
    </HStack>
  );
}
