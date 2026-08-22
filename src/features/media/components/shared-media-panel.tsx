'use client';

import {
  Badge,
  Box,
  Button,
  HStack,
  Icon,
  IconButton,
  Image,
  Input,
  InputGroup,
  InputLeftElement,
  Link,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  SimpleGrid,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Tooltip,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react';
import { Fragment, useMemo, useState } from 'react';
import {
  FiDownload,
  FiExternalLink,
  FiFile,
  FiFilm,
  FiHeadphones,
  FiImage,
  FiLink,
  FiMessageSquare,
  FiPlay,
  FiSearch,
  FiSliders,
} from 'react-icons/fi';
import { EmptyState } from '@/components/shared/empty-state';
import { MediaGridSkeleton, ListRowsSkeleton } from '@/components/shared/skeletons';
import { UserAvatar } from '@/components/shared/user-avatar';
import { useSharedMedia, useSharedMediaCounts } from '@/features/chats/hooks/use-chats';
import { useDebouncedValue } from '@/features/users/hooks/use-user-search';
import { absoluteUrl } from '@/lib/env';
import {
  fileTypeLabel,
  formatDuration,
  formatFileSize,
  formatFullDate,
  formatMonthGroup,
  fullName,
} from '@/utils/format';
import type { MediaCategory, SharedMediaItem } from '@/types/api';
import { MediaViewer, ViewerItem } from './media-viewer';

const TABS: { key: MediaCategory; label: string; icon: typeof FiImage }[] = [
  { key: 'MEDIA', label: 'Media', icon: FiImage },
  { key: 'FILES', label: 'Files', icon: FiFile },
  { key: 'LINKS', label: 'Links', icon: FiLink },
  { key: 'AUDIO', label: 'Audio', icon: FiHeadphones },
];

interface SharedMediaPanelProps {
  chatId: string;
  /** Opens the conversation scrolled to the message an item was shared in. */
  onOpenMessage?: (messageId: string) => void;
  initialCategory?: MediaCategory;
}

/** The "Media, links and docs" gallery, shared by contact info and group info. */
export function SharedMediaPanel({
  chatId,
  onOpenMessage,
  initialCategory = 'MEDIA',
}: SharedMediaPanelProps) {
  const [tabIndex, setTabIndex] = useState(
    Math.max(0, TABS.findIndex((tab) => tab.key === initialCategory)),
  );
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const debouncedSearch = useDebouncedValue(search.trim());

  const counts = useSharedMediaCounts(chatId);
  const category = TABS[tabIndex].key;
  const media = useSharedMedia(chatId, category, { search: debouncedSearch, sort });

  const items = useMemo(() => media.data?.flatMap((page) => page.items) ?? [], [media.data]);

  return (
    <VStack align="stretch" spacing={3}>
      <Tabs
        index={tabIndex}
        onChange={(index) => {
          setTabIndex(index);
          setSearch('');
        }}
        variant="soft-rounded"
        colorScheme="brand"
        size="sm"
        isLazy
      >
        <TabList overflowX="auto" pb={1} gap={1}>
          {TABS.map((tab) => (
            <Tab key={tab.key} flexShrink={0} gap={1.5} px={3}>
              <Icon as={tab.icon} boxSize={3.5} aria-hidden />
              <Text fontSize="xs">{tab.label}</Text>
              {counts.data && (
                <Badge
                  ml={1}
                  fontSize="0.6rem"
                  borderRadius="full"
                  colorScheme="gray"
                  variant="subtle"
                >
                  {counts.data[tab.key]}
                </Badge>
              )}
            </Tab>
          ))}
        </TabList>

        <HStack mt={3} spacing={2}>
          <InputGroup size="sm">
            <InputLeftElement pointerEvents="none">
              <Icon as={FiSearch} color="gray.400" aria-hidden />
            </InputLeftElement>
            <Input
              placeholder={`Search ${TABS[tabIndex].label.toLowerCase()}…`}
              borderRadius="md"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label={`Search ${TABS[tabIndex].label}`}
            />
          </InputGroup>
          <Menu placement="bottom-end">
            <Tooltip label="Sort">
              <MenuButton
                as={IconButton}
                aria-label="Sort"
                icon={<FiSliders />}
                size="sm"
                variant="ghost"
              />
            </Tooltip>
            <MenuList minW="150px">
              <MenuItem fontSize="sm" onClick={() => setSort('newest')}>
                Newest first {sort === 'newest' && '✓'}
              </MenuItem>
              <MenuItem fontSize="sm" onClick={() => setSort('oldest')}>
                Oldest first {sort === 'oldest' && '✓'}
              </MenuItem>
            </MenuList>
          </Menu>
        </HStack>

        <TabPanels>
          {TABS.map((tab) => (
            <TabPanel key={tab.key} px={0} pt={3}>
              {media.isLoading ? (
                tab.key === 'MEDIA' ? (
                  <MediaGridSkeleton />
                ) : (
                  <ListRowsSkeleton />
                )
              ) : items.length === 0 ? (
                <EmptyState
                  compact
                  icon={tab.icon}
                  title={
                    debouncedSearch
                      ? `No ${tab.label.toLowerCase()} found`
                      : `No shared ${tab.label.toLowerCase()} yet`
                  }
                  description={
                    debouncedSearch
                      ? 'Try a different search term.'
                      : `${tab.label} shared in this conversation will appear here.`
                  }
                />
              ) : tab.key === 'MEDIA' ? (
                <MediaGrid items={items} onOpenMessage={onOpenMessage} />
              ) : tab.key === 'LINKS' ? (
                <LinkList items={items} onOpenMessage={onOpenMessage} />
              ) : tab.key === 'AUDIO' ? (
                <AudioList items={items} onOpenMessage={onOpenMessage} />
              ) : (
                <FileList items={items} onOpenMessage={onOpenMessage} />
              )}

              {media.hasNextPage && (
                <Button
                  size="sm"
                  variant="ghost"
                  w="100%"
                  mt={3}
                  isLoading={media.isFetchingNextPage}
                  onClick={() => void media.fetchNextPage()}
                >
                  Load more
                </Button>
              )}
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>
    </VStack>
  );
}

// ── media grid ──────────────────────────────────────────────────────────────

function MediaGrid({
  items,
  onOpenMessage,
}: {
  items: SharedMediaItem[];
  onOpenMessage?: (messageId: string) => void;
}) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const viewerItems: ViewerItem[] = items.map((item) => ({
    id: item.id,
    url: item.url ?? '',
    mimeType: item.mimeType ?? 'image/jpeg',
    originalName: item.originalName ?? 'media',
    createdAt: item.createdAt,
    sender: item.sender,
    messageId: item.messageId,
    width: item.width,
    height: item.height,
  }));

  return (
    <>
      <SimpleGrid columns={3} spacing={1.5}>
        {items.map((item, index) => {
          const isVideo = item.mimeType?.startsWith('video/');
          return (
            <Box
              key={item.id}
              as="button"
              type="button"
              position="relative"
              pb="100%"
              borderRadius="md"
              overflow="hidden"
              bg="blackAlpha.100"
              _dark={{ bg: 'whiteAlpha.100' }}
              _focusVisible={{ outline: '2px solid', outlineColor: 'brand.400', outlineOffset: 2 }}
              onClick={() => setViewerIndex(index)}
              aria-label={`Open ${item.originalName ?? 'media'}`}
            >
              <Image
                position="absolute"
                inset={0}
                w="100%"
                h="100%"
                objectFit="cover"
                src={absoluteUrl(item.thumbnailUrl ?? item.url)}
                alt={item.originalName ?? 'Shared media'}
                loading="lazy"
                fallback={
                  <Box position="absolute" inset={0} display="grid" placeItems="center">
                    <Icon as={isVideo ? FiFilm : FiImage} color="gray.400" boxSize={5} />
                  </Box>
                }
              />
              {isVideo && (
                <Box
                  position="absolute"
                  bottom={1}
                  left={1}
                  bg="blackAlpha.700"
                  color="white"
                  borderRadius="sm"
                  px={1}
                  py={0.5}
                >
                  <Icon as={FiPlay} boxSize={2.5} aria-hidden />
                </Box>
              )}
            </Box>
          );
        })}
      </SimpleGrid>

      <MediaViewer
        items={viewerItems}
        startIndex={viewerIndex ?? 0}
        isOpen={viewerIndex !== null}
        onClose={() => setViewerIndex(null)}
        onOpenMessage={onOpenMessage}
      />
    </>
  );
}

// ── grouped lists ───────────────────────────────────────────────────────────

function useMonthGroups(items: SharedMediaItem[]): [string, SharedMediaItem[]][] {
  return useMemo(() => {
    const groups = new Map<string, SharedMediaItem[]>();
    for (const item of items) {
      const key = formatMonthGroup(item.createdAt);
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }
    return [...groups.entries()];
  }, [items]);
}

function GroupHeading({ label }: { label: string }) {
  return (
    <Text fontSize="xs" fontWeight="semibold" color="gray.500" mt={2} mb={1} textTransform="uppercase">
      {label}
    </Text>
  );
}

function FileList({
  items,
  onOpenMessage,
}: {
  items: SharedMediaItem[];
  onOpenMessage?: (messageId: string) => void;
}) {
  const groups = useMonthGroups(items);
  const rowBg = useColorModeValue('gray.50', 'whiteAlpha.100');

  return (
    <VStack align="stretch" spacing={1}>
      {groups.map(([label, group]) => (
        <Fragment key={label}>
          <GroupHeading label={label} />
          {group.map((item) => (
            <HStack
              key={item.id}
              spacing={3}
              p={2}
              borderRadius="md"
              _hover={{ bg: rowBg }}
              align="center"
            >
              <Box
                display="grid"
                placeItems="center"
                boxSize="38px"
                borderRadius="md"
                bg="brand.50"
                color="brand.600"
                _dark={{ bg: 'whiteAlpha.200', color: 'brand.200' }}
                flexShrink={0}
              >
                <Text fontSize="0.6rem" fontWeight="bold">
                  {fileTypeLabel(item.mimeType, item.originalName)}
                </Text>
              </Box>
              <Box flex="1" minW={0}>
                <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                  {item.originalName}
                </Text>
                <Text fontSize="xs" color="gray.500" noOfLines={1}>
                  {formatFileSize(item.size)} · {item.sender ? fullName(item.sender) : 'Unknown'} ·{' '}
                  {formatFullDate(item.createdAt)}
                </Text>
              </Box>
              {onOpenMessage && (
                <Tooltip label="Show in conversation">
                  <IconButton
                    aria-label="Show in conversation"
                    icon={<FiMessageSquare />}
                    size="xs"
                    variant="ghost"
                    onClick={() => onOpenMessage(item.messageId)}
                  />
                </Tooltip>
              )}
              <Tooltip label="Download">
                <IconButton
                  as="a"
                  href={absoluteUrl(item.url)}
                  download={item.originalName ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Download ${item.originalName}`}
                  icon={<FiDownload />}
                  size="xs"
                  variant="ghost"
                />
              </Tooltip>
            </HStack>
          ))}
        </Fragment>
      ))}
    </VStack>
  );
}

function AudioList({
  items,
  onOpenMessage,
}: {
  items: SharedMediaItem[];
  onOpenMessage?: (messageId: string) => void;
}) {
  const groups = useMonthGroups(items);

  return (
    <VStack align="stretch" spacing={1}>
      {groups.map(([label, group]) => (
        <Fragment key={label}>
          <GroupHeading label={label} />
          {group.map((item) => (
            <HStack
              key={item.id}
              spacing={3}
              p={2}
              borderRadius="md"
              bg="blackAlpha.50"
              _dark={{ bg: 'whiteAlpha.100' }}
            >
              <UserAvatar user={item.sender} size="sm" />
              <Box flex="1" minW={0}>
                <HStack justify="space-between" mb={1}>
                  <Text fontSize="xs" fontWeight="medium" noOfLines={1}>
                    {item.sender ? fullName(item.sender) : 'Unknown'}
                  </Text>
                  <Text fontSize="xs" color="gray.500" flexShrink={0}>
                    {formatDuration(item.duration)}
                  </Text>
                </HStack>
                <Box
                  as="audio"
                  src={absoluteUrl(item.url)}
                  controls
                  preload="none"
                  w="100%"
                  h="32px"
                  sx={{ '&::-webkit-media-controls-panel': { bg: 'transparent' } }}
                />
                <Text fontSize="0.65rem" color="gray.500" mt={0.5}>
                  {formatFullDate(item.createdAt)}
                </Text>
              </Box>
              {onOpenMessage && (
                <IconButton
                  aria-label="Show in conversation"
                  icon={<FiMessageSquare />}
                  size="xs"
                  variant="ghost"
                  onClick={() => onOpenMessage(item.messageId)}
                />
              )}
            </HStack>
          ))}
        </Fragment>
      ))}
    </VStack>
  );
}

function LinkList({
  items,
  onOpenMessage,
}: {
  items: SharedMediaItem[];
  onOpenMessage?: (messageId: string) => void;
}) {
  const groups = useMonthGroups(items);
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.300');

  return (
    <VStack align="stretch" spacing={1}>
      {groups.map(([label, group]) => (
        <Fragment key={label}>
          <GroupHeading label={label} />
          {group.map((item) => (
            <Box key={item.id} borderWidth="1px" borderColor={borderColor} borderRadius="md" p={2.5}>
              <HStack align="flex-start" spacing={3}>
                {item.linkImageUrl ? (
                  <Image
                    src={item.linkImageUrl}
                    alt=""
                    boxSize="48px"
                    objectFit="cover"
                    borderRadius="md"
                    flexShrink={0}
                    loading="lazy"
                    fallback={<LinkFallbackIcon />}
                  />
                ) : (
                  <LinkFallbackIcon />
                )}
                <Box flex="1" minW={0}>
                  {item.linkTitle && (
                    <Text fontSize="sm" fontWeight="semibold" noOfLines={1}>
                      {item.linkTitle}
                    </Text>
                  )}
                  <Link
                    href={item.linkUrl ?? '#'}
                    isExternal
                    // noopener/noreferrer: the target page must not get a handle
                    // on this window or the referring URL.
                    rel="noopener noreferrer nofollow"
                    fontSize="xs"
                    color="brand.400"
                    noOfLines={1}
                    display="block"
                  >
                    {item.linkUrl}
                    <Icon as={FiExternalLink} boxSize={2.5} ml={1} aria-hidden />
                  </Link>
                  {item.messageContent && item.messageContent !== item.linkUrl && (
                    <Text fontSize="xs" color="gray.500" noOfLines={2} mt={1}>
                      {item.messageContent}
                    </Text>
                  )}
                  <Text fontSize="0.65rem" color="gray.500" mt={1}>
                    {item.sender ? fullName(item.sender) : 'Unknown'} ·{' '}
                    {formatFullDate(item.createdAt)}
                  </Text>
                </Box>
                {onOpenMessage && (
                  <IconButton
                    aria-label="Show in conversation"
                    icon={<FiMessageSquare />}
                    size="xs"
                    variant="ghost"
                    onClick={() => onOpenMessage(item.messageId)}
                  />
                )}
              </HStack>
            </Box>
          ))}
        </Fragment>
      ))}
    </VStack>
  );
}

function LinkFallbackIcon() {
  return (
    <Box
      display="grid"
      placeItems="center"
      boxSize="48px"
      borderRadius="md"
      bg="blackAlpha.100"
      _dark={{ bg: 'whiteAlpha.200' }}
      flexShrink={0}
    >
      <Icon as={FiLink} color="gray.400" aria-hidden />
    </Box>
  );
}
