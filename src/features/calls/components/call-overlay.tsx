'use client';

import {
  Badge,
  Box,
  Center,
  Grid,
  HStack,
  Icon,
  IconButton,
  Text,
  Tooltip,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { useMemo } from 'react';
import {
  FiMaximize2,
  FiMic,
  FiMicOff,
  FiMinimize2,
  FiMonitor,
  FiPhoneOff,
  FiUsers,
  FiVideo,
  FiVideoOff,
} from 'react-icons/fi';
import { UserAvatar } from '@/components/shared/user-avatar';
import { useCoarsePointer } from '@/hooks/use-media';
import { useAuthStore } from '@/store/auth-store';
import { fullName } from '@/utils/format';
import type { Call, CallParticipant } from '@/types/api';
import { useCallTimer } from '../hooks/use-call';
import { callManager } from '../lib/call-manager';
import { formatCallDuration } from '../lib/call-utils';
import { useCallStore, type PeerMedia } from '../store/call-store';
import { StreamVideo } from './media-elements';

/** Above Chakra modals/drawers (1400) so a call is never hidden behind a panel. */
const OVERLAY_Z = 1450;

function callTitle(call: Call, myId: string): string {
  if (call.chat.type === 'GROUP') return call.chat.name ?? 'Group call';
  const other = call.participants.find((p) => p.userId !== myId);
  return other ? fullName(other.user) : 'Call';
}

/** The full-screen call UI plus its minimised pill and the "call ended" card. */
export function CallOverlay() {
  const active = useCallStore((s) => s.active);
  const phase = useCallStore((s) => s.phase);
  const ended = useCallStore((s) => s.ended);
  const isMinimized = useCallStore((s) => s.isMinimized);
  const me = useAuthStore((s) => s.user);

  if (!me) return null;

  if (phase === 'ended' && ended) {
    return <EndedCard call={ended.call} myId={me.id} />;
  }
  if (phase === 'requesting-media') {
    return (
      <FloatingCard>
        <Text fontSize="sm">Waiting for microphone access…</Text>
      </FloatingCard>
    );
  }
  if (!active || phase === 'idle') return null;

  return isMinimized ? (
    <MinimizedPill call={active} myId={me.id} />
  ) : (
    <FullScreenCall call={active} myId={me.id} />
  );
}

// ─────────────────────────────── full screen ───────────────────────────────

function FullScreenCall({ call, myId }: { call: Call; myId: string }) {
  const phase = useCallStore((s) => s.phase);
  const localStream = useCallStore((s) => s.localStream);
  const screenStream = useCallStore((s) => s.screenStream);
  const micOn = useCallStore((s) => s.micOn);
  const cameraOn = useCallStore((s) => s.cameraOn);
  const screenOn = useCallStore((s) => s.screenOn);
  const seconds = useCallTimer();
  const toast = useToast();
  const isTouch = useCoarsePointer();

  const others = useMemo(
    () =>
      call.participants.filter(
        (p) => p.userId !== myId && (p.status === 'JOINED' || p.status === 'RINGING'),
      ),
    [call.participants, myId],
  );
  const joinedCount = call.participants.filter((p) => p.status === 'JOINED').length;
  const isGroup = call.chat.type === 'GROUP';

  const status = (): string => {
    if (phase === 'connected') return formatCallDuration(seconds);
    if (call.status === 'RINGING') return call.initiatorId === myId ? 'Ringing…' : 'Connecting…';
    return 'Waiting for others to join…';
  };

  const columns = useMemo(() => {
    const n = Math.max(others.length, 1);
    if (n === 1) return { base: '1fr', md: '1fr' };
    if (n === 2) return { base: '1fr', md: 'repeat(2, 1fr)' };
    if (n <= 4) return { base: 'repeat(2, 1fr)', md: 'repeat(2, 1fr)' };
    return { base: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' };
  }, [others.length]);

  const fail = (error: unknown): void => {
    toast({
      title: error instanceof Error ? error.message : 'Something went wrong',
      status: 'error',
      duration: 4000,
    });
  };

  const canShareScreen =
    !isTouch && typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia;
  const showLocalPreview = !!localStream && (cameraOn || screenOn);

  return (
    <Box
      position="fixed"
      inset={0}
      zIndex={OVERLAY_Z}
      bg="gray.900"
      color="white"
      display="flex"
      flexDirection="column"
      role="dialog"
      aria-modal="true"
      aria-label={`${call.type === 'VIDEO' ? 'Video' : 'Voice'} call with ${callTitle(call, myId)}`}
    >
      {/* header */}
      <HStack px={4} py={3} spacing={3} bg="blackAlpha.400">
        <Box flex="1" minW={0}>
          <Text fontWeight="semibold" noOfLines={1}>
            {callTitle(call, myId)}
          </Text>
          <HStack spacing={2}>
            <Text fontSize="sm" color="whiteAlpha.700" aria-live="polite">
              {status()}
            </Text>
            {isGroup && (
              <Badge colorScheme="whiteAlpha" fontSize="0.65rem" display="inline-flex" alignItems="center" gap={1}>
                <Icon as={FiUsers} boxSize={3} /> {joinedCount}
              </Badge>
            )}
          </HStack>
        </Box>
        <Tooltip label="Minimise">
          <IconButton
            aria-label="Minimise call"
            icon={<FiMinimize2 />}
            variant="ghost"
            colorScheme="whiteAlpha"
            color="white"
            onClick={() => callManager.setMinimized(true)}
          />
        </Tooltip>
      </HStack>

      {/* tiles */}
      <Box flex="1" minH={0} position="relative" p={{ base: 2, md: 4 }}>
        <Grid templateColumns={columns} gap={{ base: 2, md: 3 }} h="100%" autoRows="1fr">
          {others.map((participant) => (
            <ParticipantTile key={participant.userId} participant={participant} callType={call.type} />
          ))}
          {others.length === 0 && (
            <Center>
              <Text color="whiteAlpha.700">Nobody else is in the call yet.</Text>
            </Center>
          )}
        </Grid>

        {showLocalPreview && (
          <Box
            position="absolute"
            right={{ base: 3, md: 6 }}
            bottom={{ base: 3, md: 6 }}
            w={{ base: '110px', md: '200px' }}
            h={{ base: '150px', md: '140px' }}
            borderRadius="lg"
            overflow="hidden"
            boxShadow="lg"
            borderWidth="2px"
            borderColor="whiteAlpha.400"
            aria-label="Your camera"
          >
            <StreamVideo stream={screenOn ? screenStream : localStream} mirror={!screenOn} />
          </Box>
        )}
      </Box>

      {/* controls */}
      <HStack justify="center" spacing={{ base: 3, md: 4 }} py={4} bg="blackAlpha.400">
        <ControlButton
          label={micOn ? 'Mute microphone' : 'Unmute microphone'}
          icon={micOn ? <FiMic /> : <FiMicOff />}
          isActive={!micOn}
          onClick={() => callManager.toggleMic()}
        />
        <ControlButton
          label={cameraOn ? 'Turn camera off' : 'Turn camera on'}
          icon={cameraOn ? <FiVideo /> : <FiVideoOff />}
          isActive={!cameraOn}
          onClick={() => callManager.toggleCamera().catch(fail)}
        />
        {canShareScreen && (
          <ControlButton
            label={screenOn ? 'Stop sharing screen' : 'Share screen'}
            icon={<FiMonitor />}
            isActive={screenOn}
            activeColor="brand.500"
            onClick={() =>
              callManager.toggleScreenShare().catch((error: unknown) => {
                // Cancelling the picker throws NotAllowedError — that is not an error to show.
                if ((error as { name?: string })?.name !== 'NotAllowedError') fail(error);
              })
            }
          />
        )}
        <IconButton
          aria-label="Hang up"
          icon={<FiPhoneOff />}
          colorScheme="red"
          borderRadius="full"
          size="lg"
          fontSize="xl"
          onClick={() => void callManager.leave()}
        />
      </HStack>
    </Box>
  );
}

function ControlButton({
  label,
  icon,
  isActive,
  activeColor = 'white',
  onClick,
}: {
  label: string;
  icon: React.ReactElement;
  isActive: boolean;
  activeColor?: string;
  onClick: () => void;
}) {
  return (
    <Tooltip label={label}>
      <IconButton
        aria-label={label}
        aria-pressed={isActive}
        icon={icon}
        borderRadius="full"
        size="lg"
        fontSize="xl"
        bg={isActive ? activeColor : 'whiteAlpha.200'}
        color={isActive ? (activeColor === 'white' ? 'gray.900' : 'white') : 'white'}
        _hover={{ bg: isActive ? activeColor : 'whiteAlpha.300' }}
        onClick={onClick}
      />
    </Tooltip>
  );
}

const DEFAULT_MEDIA: PeerMedia = { micOn: true, cameraOn: false, screenOn: false };

function ParticipantTile({
  participant,
  callType,
}: {
  participant: CallParticipant;
  callType: Call['type'];
}) {
  const stream = useCallStore((s) => s.remoteStreams[participant.userId] ?? null);
  const peerState = useCallStore((s) => s.peerStates[participant.userId]);
  const media = useCallStore((s) => s.peerMedia[participant.userId]) ?? {
    ...DEFAULT_MEDIA,
    cameraOn: callType === 'VIDEO',
  };

  const hasVideoTrack = !!stream && stream.getVideoTracks().some((t) => t.readyState === 'live');
  const showVideo = hasVideoTrack && (media.cameraOn || media.screenOn);
  const isRinging = participant.status === 'RINGING';

  const stateLabel = isRinging
    ? 'Ringing…'
    : peerState === 'connecting'
      ? 'Connecting…'
      : peerState === 'reconnecting'
        ? 'Reconnecting…'
        : peerState === 'failed'
          ? 'Connection failed'
          : null;

  return (
    <Box
      position="relative"
      borderRadius="xl"
      overflow="hidden"
      bg="gray.800"
      minH={{ base: '160px', md: '220px' }}
      opacity={isRinging ? 0.6 : 1}
    >
      {showVideo ? (
        <StreamVideo stream={stream} fit={media.screenOn ? 'contain' : 'cover'} />
      ) : (
        <Center h="100%" w="100%">
          <VStack spacing={3}>
            <UserAvatar user={participant.user} size="2xl" />
            <Text fontWeight="medium">{fullName(participant.user)}</Text>
          </VStack>
        </Center>
      )}

      <HStack position="absolute" left={3} bottom={3} spacing={2}>
        <Badge bg="blackAlpha.600" color="white" borderRadius="md" px={2} py={0.5} textTransform="none">
          {fullName(participant.user)}
        </Badge>
        {!media.micOn && !isRinging && (
          <Center bg="blackAlpha.600" borderRadius="full" boxSize={6} aria-label="Muted">
            <Icon as={FiMicOff} boxSize={3.5} color="red.300" />
          </Center>
        )}
      </HStack>

      {stateLabel && (
        <Badge
          position="absolute"
          top={3}
          right={3}
          bg={peerState === 'failed' ? 'red.500' : 'blackAlpha.600'}
          color="white"
          borderRadius="md"
          textTransform="none"
        >
          {stateLabel}
        </Badge>
      )}
    </Box>
  );
}

// ─────────────────────────────── minimised & ended ───────────────────────────────

function FloatingCard({ children }: { children: React.ReactNode }) {
  return (
    <Box
      position="fixed"
      top={{ base: 2, md: 4 }}
      left="50%"
      transform="translateX(-50%)"
      zIndex={OVERLAY_Z}
      bg="gray.900"
      color="white"
      borderRadius="full"
      px={4}
      py={2}
      boxShadow="lg"
      maxW="calc(100vw - 32px)"
    >
      {children}
    </Box>
  );
}

function MinimizedPill({ call, myId }: { call: Call; myId: string }) {
  const phase = useCallStore((s) => s.phase);
  const micOn = useCallStore((s) => s.micOn);
  const seconds = useCallTimer();

  return (
    <FloatingCard>
      <HStack spacing={3}>
        <Box>
          <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
            {callTitle(call, myId)}
          </Text>
          <Text fontSize="xs" color="green.300">
            {phase === 'connected' ? formatCallDuration(seconds) : 'Ringing…'}
          </Text>
        </Box>
        <IconButton
          aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
          icon={micOn ? <FiMic /> : <FiMicOff />}
          size="sm"
          borderRadius="full"
          variant="ghost"
          color="white"
          onClick={() => callManager.toggleMic()}
        />
        <IconButton
          aria-label="Open call"
          icon={<FiMaximize2 />}
          size="sm"
          borderRadius="full"
          variant="ghost"
          color="white"
          onClick={() => callManager.setMinimized(false)}
        />
        <IconButton
          aria-label="Hang up"
          icon={<FiPhoneOff />}
          size="sm"
          borderRadius="full"
          colorScheme="red"
          onClick={() => void callManager.leave()}
        />
      </HStack>
    </FloatingCard>
  );
}

function EndedCard({ call, myId }: { call: Call; myId: string }) {
  const seconds = call.answeredAt && call.endedAt
    ? (new Date(call.endedAt).getTime() - new Date(call.answeredAt).getTime()) / 1000
    : 0;
  const reason = (): string => {
    switch (call.endReason) {
      case 'declined':
        return 'Call declined';
      case 'busy':
        return 'Busy';
      case 'missed':
        return call.initiatorId === myId ? 'No answer' : 'Missed call';
      case 'cancelled':
        return 'Call cancelled';
      case 'failed':
        return 'Call dropped';
      default:
        return seconds > 0 ? `Call ended · ${formatCallDuration(seconds)}` : 'Call ended';
    }
  };
  return (
    <FloatingCard>
      <Text fontSize="sm" role="status">
        {reason()}
      </Text>
    </FloatingCard>
  );
}
