'use client';

import {
  Box,
  Button,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Text,
  Tooltip,
  useClipboard,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { useEffect } from 'react';
import { FiCheck, FiCopy, FiLink, FiRefreshCw, FiSlash } from 'react-icons/fi';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { getApiErrorMessage } from '@/lib/api-client';
import { useGroupInvite, useInviteMutations } from '../hooks/use-chats';

interface InviteLinkSectionProps {
  chatId: string;
  canManage: boolean;
  isOpen: boolean;
}

/** Create, copy, regenerate and revoke the group's invite link (admins only). */
export function InviteLinkSection({ chatId, canManage, isOpen }: InviteLinkSectionProps) {
  const invite = useGroupInvite(chatId, canManage && isOpen);
  const { create, regenerate, revoke } = useInviteMutations(chatId);
  const { onCopy, setValue, hasCopied } = useClipboard('');
  const revokeConfirm = useDisclosure();
  const regenerateConfirm = useDisclosure();
  const toast = useToast();

  useEffect(() => {
    setValue(invite.data?.url ?? '');
  }, [invite.data?.url, setValue]);

  const onError = (error: unknown): void => {
    toast({ title: getApiErrorMessage(error), status: 'error', duration: 4000 });
  };

  if (!canManage) return null;

  return (
    <>
      <VStack align="stretch" spacing={2}>
        {invite.data ? (
          <>
            <InputGroup size="sm">
              <Input
                value={invite.data.url}
                isReadOnly
                fontSize="xs"
                fontFamily="mono"
                pr="2.5rem"
                aria-label="Group invite link"
                onFocus={(event) => event.target.select()}
              />
              <InputRightElement>
                <Tooltip label={hasCopied ? 'Copied' : 'Copy link'}>
                  <IconButton
                    aria-label="Copy invite link"
                    icon={hasCopied ? <FiCheck /> : <FiCopy />}
                    size="xs"
                    variant="ghost"
                    colorScheme={hasCopied ? 'green' : undefined}
                    onClick={onCopy}
                  />
                </Tooltip>
              </InputRightElement>
            </InputGroup>

            <HStack spacing={2}>
              <Button
                size="xs"
                variant="ghost"
                leftIcon={<FiRefreshCw />}
                onClick={regenerateConfirm.onOpen}
                isLoading={regenerate.isPending}
              >
                Regenerate
              </Button>
              <Button
                size="xs"
                variant="ghost"
                colorScheme="red"
                leftIcon={<FiSlash />}
                onClick={revokeConfirm.onOpen}
                isLoading={revoke.isPending}
              >
                Revoke
              </Button>
            </HStack>

            <Text fontSize="xs" color="gray.500">
              Anyone with this link can join the group.
              {invite.data.useCount > 0 &&
                ` Used ${invite.data.useCount} time${invite.data.useCount === 1 ? '' : 's'}.`}
            </Text>
          </>
        ) : (
          <Box>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Icon as={FiLink} />}
              isLoading={create.isPending || invite.isLoading}
              onClick={() => create.mutate(undefined, { onError })}
            >
              Create invite link
            </Button>
            <Text fontSize="xs" color="gray.500" mt={2}>
              Generate a secure link people can use to join this group.
            </Text>
          </Box>
        )}
      </VStack>

      <ConfirmDialog
        isOpen={regenerateConfirm.isOpen}
        onClose={regenerateConfirm.onClose}
        onConfirm={() =>
          regenerate.mutate(undefined, {
            onSuccess: () => {
              toast({ title: 'New invite link created', status: 'success', duration: 3000 });
              regenerateConfirm.onClose();
            },
            onError,
          })
        }
        isLoading={regenerate.isPending}
        title="Regenerate invite link?"
        body="The current link stops working immediately. Anyone who has it will no longer be able to join."
        confirmLabel="Regenerate"
      />

      <ConfirmDialog
        isOpen={revokeConfirm.isOpen}
        onClose={revokeConfirm.onClose}
        onConfirm={() =>
          revoke.mutate(undefined, {
            onSuccess: () => {
              toast({ title: 'Invite link revoked', status: 'success', duration: 3000 });
              revokeConfirm.onClose();
            },
            onError,
          })
        }
        isLoading={revoke.isPending}
        title="Revoke invite link?"
        body="Nobody will be able to join with the current link. You can create a new one later."
        confirmLabel="Revoke"
      />
    </>
  );
}
