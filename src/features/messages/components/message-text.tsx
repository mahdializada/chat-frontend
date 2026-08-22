'use client';

import { Box, Link, Text } from '@chakra-ui/react';
import { Fragment, useMemo } from 'react';
import type { Chat } from '@/types/api';

interface MessageTextProps {
  content: string;
  chat: Chat;
  currentUserId: string;
  /** Term to highlight (in-conversation search). */
  highlight?: string;
  onOpenProfile?: (userId: string) => void;
  isOwn: boolean;
}

type Token =
  | { kind: 'text'; value: string }
  | { kind: 'link'; value: string }
  | { kind: 'mention'; value: string; username: string };

const TOKEN_REGEX = /(https?:\/\/[^\s<>"'`]+)|(^|[^\w@])@([a-zA-Z0-9_.]{2,30})/g;

/**
 * Renders message text with clickable links and highlighted @mentions.
 *
 * The content is tokenised and rendered as React nodes — it is never injected
 * as HTML, so a message can't smuggle markup into the page.
 */
export function MessageText({
  content,
  chat,
  currentUserId,
  highlight,
  onOpenProfile,
  isOwn,
}: MessageTextProps) {
  const memberByUsername = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const member of chat.members) {
      map.set(member.user.username.toLowerCase(), {
        id: member.userId,
        name: `${member.user.firstName} ${member.user.lastName}`,
      });
    }
    return map;
  }, [chat.members]);

  const tokens = useMemo(() => tokenize(content), [content]);

  return (
    <Text fontSize="sm" whiteSpace="pre-wrap" wordBreak="break-word">
      {tokens.map((token, index) => {
        if (token.kind === 'link') {
          return (
            <Link
              key={index}
              href={token.value}
              isExternal
              // Opening in a new context without leaking the referrer or a
              // window handle back to this app.
              rel="noopener noreferrer nofollow"
              textDecoration="underline"
              color={isOwn ? 'white' : 'brand.500'}
              _dark={{ color: isOwn ? 'white' : 'brand.200' }}
              onClick={(event) => event.stopPropagation()}
            >
              {token.value}
            </Link>
          );
        }

        if (token.kind === 'mention') {
          const member = memberByUsername.get(token.username.toLowerCase());
          const isEveryone = token.username.toLowerCase() === 'everyone' ||
            token.username.toLowerCase() === 'all';
          const mentionsMe = member?.id === currentUserId || isEveryone;

          if (!member && !isEveryone) {
            return <Fragment key={index}>{token.value}</Fragment>;
          }

          const styles = {
            display: 'inline' as const,
            fontWeight: 'semibold' as const,
            borderRadius: 'sm' as const,
            px: 0.5,
            bg: mentionsMe ? (isOwn ? 'whiteAlpha.400' : 'brand.100') : 'transparent',
            color: mentionsMe && !isOwn ? 'brand.700' : undefined,
            _dark: {
              bg: mentionsMe ? (isOwn ? 'whiteAlpha.400' : 'brand.900') : 'transparent',
              color: mentionsMe && !isOwn ? 'brand.100' : undefined,
            },
          };

          if (!member) {
            return (
              <Box key={index} as="span" {...styles} title="Notifies everyone in this group">
                {token.value}
              </Box>
            );
          }

          return (
            <Box
              key={index}
              as="button"
              type="button"
              {...styles}
              _hover={{ textDecoration: 'underline' }}
              onClick={(event: React.MouseEvent) => {
                event.stopPropagation();
                onOpenProfile?.(member.id);
              }}
              title={member.name}
            >
              {token.value}
            </Box>
          );
        }

        return (
          <Fragment key={index}>
            {highlight ? highlightText(token.value, highlight, isOwn) : token.value}
          </Fragment>
        );
      })}
    </Text>
  );
}

function tokenize(content: string): Token[] {
  const tokens: Token[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(TOKEN_REGEX)) {
    const index = match.index ?? 0;
    const [full, url, prefix, username] = match;

    if (url) {
      if (index > lastIndex) tokens.push({ kind: 'text', value: content.slice(lastIndex, index) });
      tokens.push({ kind: 'link', value: url });
      lastIndex = index + full.length;
    } else if (username) {
      const mentionStart = index + (prefix?.length ?? 0);
      if (mentionStart > lastIndex) {
        tokens.push({ kind: 'text', value: content.slice(lastIndex, mentionStart) });
      }
      tokens.push({ kind: 'mention', value: `@${username}`, username });
      lastIndex = mentionStart + username.length + 1;
    }
  }

  if (lastIndex < content.length) {
    tokens.push({ kind: 'text', value: content.slice(lastIndex) });
  }
  return tokens;
}

function highlightText(text: string, term: string, isOwn: boolean): React.ReactNode {
  const needle = term.trim().toLowerCase();
  if (!needle) return text;

  const parts: React.ReactNode[] = [];
  const lower = text.toLowerCase();
  let index = 0;
  let key = 0;

  for (;;) {
    const found = lower.indexOf(needle, index);
    if (found === -1) break;
    if (found > index) parts.push(text.slice(index, found));
    parts.push(
      <Box
        key={key++}
        as="mark"
        bg={isOwn ? 'yellow.200' : 'yellow.200'}
        color="gray.900"
        borderRadius="sm"
        px={0.5}
      >
        {text.slice(found, found + needle.length)}
      </Box>,
    );
    index = found + needle.length;
  }
  if (index < text.length) parts.push(text.slice(index));
  return parts.length > 0 ? parts : text;
}
