'use client';

import {
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  useToast,
} from '@chakra-ui/react';
import { WallpaperPicker } from '@/components/shared/wallpaper-picker';
import { getApiErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import type { Chat } from '@/types/api';
import { useUpdateChatSettings } from '../hooks/use-chats';

interface ChatWallpaperModalProps {
  chat: Chat;
  isOpen: boolean;
  onClose: () => void;
}

/** Per-chat wallpaper. It is a personal setting: other participants keep their own. */
export function ChatWallpaperModal({ chat, isOpen, onClose }: ChatWallpaperModalProps) {
  const user = useAuthStore((s) => s.user);
  const updateSettings = useUpdateChatSettings(chat.id);
  const toast = useToast();

  return (
    <Modal isOpen={isOpen} onClose={onClose} size={{ base: 'full', md: 'xl' }} scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader pb={0}>Chat wallpaper</ModalHeader>
        <ModalCloseButton />
        <Text px={6} pt={1} pb={3} fontSize="sm" color="text.muted">
          Only you see this background, and only in this chat.
        </Text>
        <ModalBody pb={6}>
          <WallpaperPicker
            value={chat.settings.wallpaper}
            inheritedValue={user?.chatWallpaper ?? null}
            inheritLabel="Use my default"
            isSaving={updateSettings.isPending}
            onChange={(value) =>
              updateSettings.mutate(
                { wallpaper: value },
                {
                  onError: (error) =>
                    toast({
                      title: "Couldn't change the wallpaper",
                      description: getApiErrorMessage(error),
                      status: 'error',
                    }),
                },
              )
            }
          />
        </ModalBody>
        <ModalFooter pb="max(1rem, env(safe-area-inset-bottom))">
          <Button onClick={onClose}>Done</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
