'use client';

import {
  Button,
  FormControl,
  FormLabel,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Radio,
  RadioGroup,
  Text,
  Textarea,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { useState } from 'react';
import { getApiErrorMessage } from '@/lib/api-client';
import type { ReportReason } from '@/types/api';
import { useReportUser } from '../hooks/use-users';

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'SPAM', label: 'Spam or scam' },
  { value: 'HARASSMENT', label: 'Harassment or abuse' },
  { value: 'IMPERSONATION', label: 'Pretending to be someone else' },
  { value: 'INAPPROPRIATE_CONTENT', label: 'Inappropriate content' },
  { value: 'OTHER', label: 'Something else' },
];

interface ReportDialogProps {
  userId: string | null;
  userName: string;
  chatId?: string;
  isOpen: boolean;
  onClose: () => void;
  onReported?: () => void;
}

/** Sends a moderation report. The reported user is never told. */
export function ReportDialog({
  userId,
  userName,
  chatId,
  isOpen,
  onClose,
  onReported,
}: ReportDialogProps) {
  const [reason, setReason] = useState<ReportReason>('SPAM');
  const [details, setDetails] = useState('');
  const report = useReportUser();
  const toast = useToast();

  const close = (): void => {
    setReason('SPAM');
    setDetails('');
    onClose();
  };

  const submit = (): void => {
    if (!userId) return;
    report.mutate(
      { userId, reason, details: details.trim() || undefined, chatId },
      {
        onSuccess: (result) => {
          toast({
            title: result.alreadyReported ? 'Already reported' : 'Report submitted',
            description: result.alreadyReported
              ? 'You have an open report for this account — our team is reviewing it.'
              : 'Our moderation team will review this account. They are not told you reported them.',
            status: 'success',
            duration: 5000,
          });
          onReported?.();
          close();
        },
        onError: (error) =>
          toast({ title: getApiErrorMessage(error), status: 'error', duration: 4000 }),
      },
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={close} size="md" isCentered>
      <ModalOverlay />
      <ModalContent mx={4}>
        <ModalHeader fontSize="md">Report {userName}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack align="stretch" spacing={4}>
            <Text fontSize="sm" color="gray.500">
              Tell us what is wrong. Your report goes to moderation for review — {userName} is not
              told that you reported them.
            </Text>

            <FormControl>
              <FormLabel fontSize="sm">Reason</FormLabel>
              <RadioGroup value={reason} onChange={(value) => setReason(value as ReportReason)}>
                <VStack align="stretch" spacing={2}>
                  {REASONS.map((option) => (
                    <Radio key={option.value} value={option.value} size="sm">
                      {option.label}
                    </Radio>
                  ))}
                </VStack>
              </RadioGroup>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm">Anything else? (optional)</FormLabel>
              <Textarea
                size="sm"
                rows={3}
                maxLength={1000}
                placeholder="Add any context that would help a reviewer…"
                value={details}
                onChange={(event) => setDetails(event.target.value)}
              />
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter gap={2}>
          <Button variant="ghost" colorScheme="gray" size="sm" onClick={close}>
            Cancel
          </Button>
          <Button colorScheme="red" size="sm" isLoading={report.isPending} onClick={submit}>
            Submit report
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
