import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth-store';
import { SOCKET_URL } from './env';

let socket: Socket | null = null;

/**
 * Lazily creates the singleton Socket.IO connection. The token is supplied via
 * a callback so automatic reconnections always use the freshest access token.
 */
export function connectSocket(): Socket {
  if (socket) {
    if (!socket.connected) socket.connect();
    return socket;
  }
  socket = io(SOCKET_URL, {
    withCredentials: true,
    transports: ['websocket', 'polling'],
    auth: (cb) => cb({ token: useAuthStore.getState().accessToken }),
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
  });
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

/** Promise wrapper around Socket.IO acknowledgements. */
export function emitWithAck<T>(event: string, payload: unknown, timeoutMs = 8000): Promise<T> {
  return new Promise((resolve, reject) => {
    const active = getSocket();
    if (!active?.connected) {
      reject(new Error('Socket is not connected'));
      return;
    }
    const timer = setTimeout(() => reject(new Error(`${event} timed out`)), timeoutMs);
    active.emit(event, payload, (response: T) => {
      clearTimeout(timer);
      resolve(response);
    });
  });
}

/** Event names — keep in sync with the backend's events.constants.ts. */
export const WS_EVENTS = {
  READY: 'ready',
  CHAT_CREATED: 'chat:created',
  CHAT_UPDATED: 'chat:updated',
  CHAT_DELETED: 'chat:deleted',
  CHAT_CLEARED: 'chat:cleared',
  CHAT_SETTINGS_UPDATED: 'chat:settings:updated',
  CHAT_DRAFT_UPDATED: 'chat:draft:updated',
  CHAT_JOIN: 'chat:join',
  CHAT_LEAVE: 'chat:leave',
  MARK_READ: 'chat:read',
  MESSAGE_SEND: 'message:send',
  MESSAGE_CREATED: 'message:created',
  MESSAGE_UPDATED: 'message:updated',
  MESSAGE_DELETED: 'message:deleted',
  MESSAGE_STARRED: 'message:starred',
  MESSAGE_DELIVERED: 'message:delivered',
  MESSAGE_READ: 'message:read',
  REACTION_ADD: 'message:reaction:add',
  REACTION_REMOVE: 'message:reaction:remove',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  TYPING_UPDATE: 'typing:update',
  PRESENCE_UPDATE: 'presence:update',
  BLOCK_UPDATED: 'user:block:updated',
  NOTIFICATION_NEW: 'notification:new',
  SYNC: 'sync',
} as const;
