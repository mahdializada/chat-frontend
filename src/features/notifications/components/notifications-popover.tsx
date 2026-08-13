'use client';

import {
  Badge,
  Box,
  Button,
  Center,
  HStack,
  IconButton,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { FiBell } from 'react-icons/fi';
import { formatChatListTime } from '@/utils/format';
import type { AppNotification } from '@/types/api';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '../hooks/use-notifications';

export function NotificationsPopover() {
  const notifications = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const router = useRouter();

  const unread = notifications.data?.unreadCount ?? 0;

  const handleClick = (notification: AppNotification): void => {
    if (!notification.isRead) markRead.mutate(notification.id);
    if (notification.data?.chatId && notification.type !== 'REMOVED_FROM_GROUP') {
      router.push(`/chat/${notification.data.chatId}`);
    }
  };

  return (
    <Popover placement="bottom-end" isLazy>
      <PopoverTrigger>
        <Box position="relative" display="inline-block">
          <IconButton aria-label="Notifications" icon={<FiBell />} variant="ghost" size="sm" />
          {unread > 0 && (
            <Badge
              position="absolute"
              top="-1"
              right="-1"
              colorScheme="red"
              variant="solid"
              borderRadius="full"
              fontSize="0.6rem"
              px={1.5}
            >
              {unread > 9 ? '9+' : unread}
            </Badge>
          )}
        </Box>
      </PopoverTrigger>
      <PopoverContent w="320px" maxW="90vw">
        <PopoverHeader border="0" fontWeight="semibold">
          <HStack justify="space-between">
            <Text>Notifications</Text>
            {unread > 0 && (
              <Button
                size="xs"
                variant="ghost"
                onClick={() => markAllRead.mutate()}
                isLoading={markAllRead.isPending}
              >
                Mark all read
              </Button>
            )}
          </HStack>
        </PopoverHeader>
        <PopoverBody maxH="360px" overflowY="auto" px={2} pb={3}>
          {notifications.isLoading && (
            <Center py={6}>
              <Spinner size="sm" />
            </Center>
          )}
          {notifications.data?.items.length === 0 && (
            <Text fontSize="sm" color="gray.500" textAlign="center" py={4}>
              Nothing here yet
            </Text>
          )}
          <VStack align="stretch" spacing={1}>
            {notifications.data?.items.map((notification) => (
              <Box
                key={notification.id}
                p={2.5}
                borderRadius="md"
                cursor="pointer"
                bg={notification.isRead ? 'transparent' : 'whiteAlpha.100'}
                _hover={{ bg: 'whiteAlpha.200' }}
                onClick={() => handleClick(notification)}
              >
                <HStack justify="space-between" align="baseline">
                  <Text fontSize="sm" fontWeight={notification.isRead ? 'normal' : 'semibold'}>
                    {notification.title}
                  </Text>
                  <Text fontSize="xs" color="gray.500" flexShrink={0}>
                    {formatChatListTime(notification.createdAt)}
                  </Text>
                </HStack>
                {notification.body && (
                  <Text fontSize="xs" color="gray.500" mt={0.5}>
                    {notification.body}
                  </Text>
                )}
              </Box>
            ))}
          </VStack>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}
