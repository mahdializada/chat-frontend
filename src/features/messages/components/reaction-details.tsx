'use client';

import {
  Box,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useMemo } from 'react';
import { UserAvatar } from '@/components/shared/user-avatar';
import { fullName } from '@/utils/format';
import type { Reaction } from '@/types/api';

interface ReactionDetailsProps {
  reactions: Reaction[];
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  onRemoveOwn: (emoji: string) => void;
}

/** "Who reacted" sheet, grouped by emoji like WhatsApp's reaction sheet. */
export function ReactionDetails({
  reactions,
  isOpen,
  onClose,
  currentUserId,
  onRemoveOwn,
}: ReactionDetailsProps) {
  const groups = useMemo(() => {
    const map = new Map<string, Reaction[]>();
    for (const reaction of reactions) {
      map.set(reaction.emoji, [...(map.get(reaction.emoji) ?? []), reaction]);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [reactions]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" isCentered>
      <ModalOverlay />
      <ModalContent mx={4}>
        <ModalHeader fontSize="md">Reactions</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={5}>
          <Tabs variant="soft-rounded" colorScheme="brand" size="sm" isLazy>
            <TabList overflowX="auto" pb={2} gap={1}>
              <Tab flexShrink={0}>All {reactions.length}</Tab>
              {groups.map(([emoji, group]) => (
                <Tab key={emoji} flexShrink={0}>
                  <Text as="span" mr={1}>
                    {emoji}
                  </Text>
                  {group.length}
                </Tab>
              ))}
            </TabList>
            <TabPanels>
              <TabPanel px={0}>
                <ReactorList
                  reactions={reactions}
                  currentUserId={currentUserId}
                  onRemoveOwn={onRemoveOwn}
                  showEmoji
                />
              </TabPanel>
              {groups.map(([emoji, group]) => (
                <TabPanel key={emoji} px={0}>
                  <ReactorList
                    reactions={group}
                    currentUserId={currentUserId}
                    onRemoveOwn={onRemoveOwn}
                  />
                </TabPanel>
              ))}
            </TabPanels>
          </Tabs>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

function ReactorList({
  reactions,
  currentUserId,
  onRemoveOwn,
  showEmoji = false,
}: {
  reactions: Reaction[];
  currentUserId: string;
  onRemoveOwn: (emoji: string) => void;
  showEmoji?: boolean;
}) {
  return (
    <VStack align="stretch" spacing={1} maxH="300px" overflowY="auto">
      {reactions.map((reaction) => {
        const isMine = reaction.userId === currentUserId;
        return (
          <HStack
            key={reaction.id}
            spacing={3}
            p={2}
            borderRadius="md"
            cursor={isMine ? 'pointer' : 'default'}
            _hover={isMine ? { bg: 'blackAlpha.50', _dark: { bg: 'whiteAlpha.100' } } : undefined}
            onClick={isMine ? () => onRemoveOwn(reaction.emoji) : undefined}
          >
            <UserAvatar user={reaction.user} size="sm" />
            <Box flex="1" minW={0}>
              <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                {isMine ? 'You' : fullName(reaction.user)}
              </Text>
              {isMine && (
                <Text fontSize="xs" color="gray.500">
                  Tap to remove
                </Text>
              )}
            </Box>
            {showEmoji && <Text fontSize="lg">{reaction.emoji}</Text>}
          </HStack>
        );
      })}
    </VStack>
  );
}
