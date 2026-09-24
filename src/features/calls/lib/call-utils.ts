import type { Call, CallType, MessageCall } from '@/types/api';

export interface CallLogInfo {
  /** e.g. "Missed voice call", "Outgoing video call". */
  label: string;
  /** "3:24" when the call was answered. */
  duration: string | null;
  direction: 'incoming' | 'outgoing' | 'missed';
  type: CallType;
}

export function formatCallDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function callDurationSeconds(call: Pick<MessageCall, 'answeredAt' | 'endedAt'>): number {
  if (!call.answeredAt || !call.endedAt) return 0;
  return (new Date(call.endedAt).getTime() - new Date(call.answeredAt).getTime()) / 1000;
}

/** Viewer-specific description of a finished call for the call log bubble. */
export function describeCallLog(
  call: MessageCall | Call,
  currentUserId: string | undefined,
): CallLogInfo {
  const kind = call.type === 'VIDEO' ? 'video call' : 'voice call';
  const mine = call.participants.find((p) => p.userId === currentUserId);
  const isInitiator = call.initiatorId === currentUserId;
  const answered = !!call.answeredAt;
  const iJoined = mine?.status === 'JOINED' || mine?.status === 'LEFT';
  const duration = answered && iJoined ? formatCallDuration(callDurationSeconds(call)) : null;

  if (isInitiator) {
    if (answered) {
      return { label: `Outgoing ${kind}`, duration, direction: 'outgoing', type: call.type };
    }
    const outcome =
      call.endReason === 'declined'
        ? 'Declined'
        : call.endReason === 'busy'
          ? 'Busy'
          : call.endReason === 'cancelled'
            ? 'Cancelled'
            : 'No answer';
    return { label: `Outgoing ${kind} · ${outcome}`, duration: null, direction: 'outgoing', type: call.type };
  }

  if (iJoined) {
    return { label: `Incoming ${kind}`, duration, direction: 'incoming', type: call.type };
  }
  if (mine?.status === 'DECLINED') {
    return { label: `Declined ${kind}`, duration: null, direction: 'incoming', type: call.type };
  }
  return { label: `Missed ${kind}`, duration: null, direction: 'missed', type: call.type };
}

/** One-line preview for the chat list / notifications. */
export function callPreview(call: MessageCall | Call, currentUserId: string | undefined): string {
  const info = describeCallLog(call, currentUserId);
  const icon = call.type === 'VIDEO' ? '📹' : '📞';
  return `${icon} ${info.label}${info.duration ? ` · ${info.duration}` : ''}`;
}
