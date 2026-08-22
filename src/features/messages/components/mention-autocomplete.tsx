'use client';

import { Box, HStack, List, ListItem, Text, useColorModeValue } from '@chakra-ui/react';
import { useEffect, useMemo, useRef } from 'react';
import { UserAvatar } from '@/components/shared/user-avatar';
import { fullName } from '@/utils/format';
import type { Chat } from '@/types/api';

export interface MentionCandidate {
  id: string;
  username: string;
  label: string;
  avatar: string | null;
  isEveryone?: boolean;
}

interface MentionAutocompleteProps {
  chat: Chat;
  currentUserId: string;
  /** Text typed after the "@" (may be empty). */
  query: string;
  activeIndex: number;
  onSelect: (candidate: MentionCandidate) => void;
  onCandidatesChange: (candidates: MentionCandidate[]) => void;
}

const MAX_RESULTS = 6;

/** Dropdown of group members matching the current "@…" token. */
export function MentionAutocomplete({
  chat,
  currentUserId,
  query,
  activeIndex,
  onSelect,
  onCandidatesChange,
}: MentionAutocompleteProps) {
  const bg = useColorModeValue('white', 'gray.700');
  const border = useColorModeValue('gray.200', 'whiteAlpha.300');
  const activeBg = useColorModeValue('brand.50', 'whiteAlpha.200');
  const listRef = useRef<HTMLUListElement | null>(null);

  const myRole = chat.members.find((m) => m.userId === currentUserId)?.role ?? 'MEMBER';
  const canMentionEveryone =
    chat.type === 'GROUP' &&
    (myRole === 'OWNER' || myRole === 'ADMIN' || chat.membersCanMentionAll);

  const candidates = useMemo(() => {
    const needle = query.toLowerCase();
    const members: MentionCandidate[] = chat.members
      .filter((member) => member.userId !== currentUserId)
      .map((member) => ({
        id: member.userId,
        username: member.user.username,
        label: fullName(member.user),
        avatar: member.user.avatar,
      }))
      .filter(
        (candidate) =>
          !needle ||
          candidate.username.toLowerCase().includes(needle) ||
          candidate.label.toLowerCase().includes(needle),
      );

    const everyone: MentionCandidate[] =
      canMentionEveryone && 'everyone'.startsWith(needle)
        ? [
            {
              id: 'everyone',
              username: 'everyone',
              label: `Notify all ${chat.members.length} members`,
              avatar: null,
              isEveryone: true,
            },
          ]
        : [];

    return [...everyone, ...members].slice(0, MAX_RESULTS);
  }, [chat.members, currentUserId, query, canMentionEveryone]);

  useEffect(() => {
    onCandidatesChange(candidates);
  }, [candidates, onCandidatesChange]);

  useEffect(() => {
    const active = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    active?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (candidates.length === 0) return null;

  return (
    <Box
      position="absolute"
      bottom="100%"
      left={0}
      right={0}
      mb={2}
      bg={bg}
      borderWidth="1px"
      borderColor={border}
      borderRadius="lg"
      boxShadow="lg"
      overflow="hidden"
      zIndex={10}
    >
      <List ref={listRef} maxH="220px" overflowY="auto" role="listbox" aria-label="Mention suggestions">
        {candidates.map((candidate, index) => (
          <ListItem
            key={candidate.id}
            role="option"
            aria-selected={index === activeIndex}
            px={3}
            py={2}
            cursor="pointer"
            bg={index === activeIndex ? activeBg : 'transparent'}
            _hover={{ bg: activeBg }}
            onMouseDown={(event) => {
              // mousedown, not click: the textarea must not lose focus first.
              event.preventDefault();
              onSelect(candidate);
            }}
          >
            <HStack spacing={3}>
              {candidate.isEveryone ? (
                <Box
                  boxSize="28px"
                  borderRadius="full"
                  bg="brand.500"
                  color="white"
                  display="grid"
                  placeItems="center"
                  fontSize="xs"
                  fontWeight="bold"
                >
                  @
                </Box>
              ) : (
                <UserAvatar
                  user={{ firstName: candidate.label, lastName: '', avatar: candidate.avatar }}
                  size="xs"
                />
              )}
              <Box minW={0}>
                <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                  {candidate.isEveryone ? '@everyone' : candidate.label}
                </Text>
                <Text fontSize="xs" color="gray.500" noOfLines={1}>
                  {candidate.isEveryone ? candidate.label : `@${candidate.username}`}
                </Text>
              </Box>
            </HStack>
          </ListItem>
        ))}
      </List>
    </Box>
  );
}

/**
 * Finds the "@word" the caret currently sits in, so the composer knows when to
 * show suggestions and what range to replace on selection.
 */
export function findMentionToken(
  text: string,
  caret: number,
): { query: string; start: number } | null {
  const before = text.slice(0, caret);
  const match = /(?:^|\s)@([a-zA-Z0-9_.]*)$/.exec(before);
  if (!match) return null;
  return { query: match[1], start: caret - match[1].length - 1 };
}
