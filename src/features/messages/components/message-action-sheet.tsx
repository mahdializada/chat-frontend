'use client';

import {
  Box,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerOverlay,
  HStack,
  Icon,
  Text,
  VStack,
} from '@chakra-ui/react';
import type { IconType } from 'react-icons';
import { QUICK_REACTIONS } from './emoji-picker';

export interface SheetAction {
  key: string;
  label: string;
  icon: IconType;
  onClick: () => void;
  /** Visual grouping: a divider is drawn between groups in the desktop menu. */
  group: 'primary' | 'edit' | 'danger';
  isDestructive?: boolean;
}

interface MessageActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  actions: SheetAction[];
  onReact?: (emoji: string) => void;
  /** Short preview of the message so the user knows what the sheet is about. */
  preview?: string;
}

/**
 * Bottom sheet with a message's actions — the touch-device equivalent of the
 * hover toolbar and "more" menu, opened by a long press.
 */
export function MessageActionSheet({
  isOpen,
  onClose,
  actions,
  onReact,
  preview,
}: MessageActionSheetProps) {
  return (
    <Drawer isOpen={isOpen} onClose={onClose} placement="bottom" autoFocus={false}>
      <DrawerOverlay />
      <DrawerContent
        borderTopRadius="2xl"
        maxH="80dvh"
        pb="env(safe-area-inset-bottom)"
        bg="bg.surface"
      >
        <Box
          w="36px"
          h="4px"
          borderRadius="full"
          bg="gray.300"
          _dark={{ bg: 'whiteAlpha.400' }}
          mx="auto"
          mt={2}
          aria-hidden
        />
        <DrawerBody px={3} pt={3} pb={3} overflowY="auto">
          {preview && (
            <Text fontSize="xs" color="text.muted" noOfLines={2} px={2} mb={3}>
              {preview}
            </Text>
          )}
          {onReact && (
            <HStack justify="space-between" px={1} mb={3}>
              {QUICK_REACTIONS.map((emoji) => (
                <Box
                  key={emoji}
                  as="button"
                  type="button"
                  fontSize="2xl"
                  lineHeight="1"
                  p={2}
                  borderRadius="full"
                  bg="bg.muted"
                  _active={{ transform: 'scale(1.15)' }}
                  aria-label={`React with ${emoji}`}
                  onClick={() => {
                    onReact(emoji);
                    onClose();
                  }}
                >
                  {emoji}
                </Box>
              ))}
            </HStack>
          )}
          <VStack align="stretch" spacing={0} borderRadius="xl" overflow="hidden" bg="bg.subtle">
            {actions.map((action) => (
              <HStack
                key={action.key}
                as="button"
                type="button"
                w="100%"
                px={4}
                py={3}
                spacing={3}
                textAlign="left"
                color={action.isDestructive ? 'red.500' : undefined}
                _active={{ bg: 'bg.hover' }}
                onClick={() => {
                  onClose();
                  action.onClick();
                }}
              >
                <Icon as={action.icon} boxSize={5} color="text.muted" aria-hidden />
                <Text fontSize="sm" fontWeight="medium">
                  {action.label}
                </Text>
              </HStack>
            ))}
          </VStack>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
