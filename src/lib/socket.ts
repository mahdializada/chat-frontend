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

/** Event names — keep in sync with the backend's events.constants.ts. */
export const WS_EVENTS = {
  READY: 'ready',
  CHAT_CREATED: 'chat:created',
  CHAT_UPDATED: 'chat:updated',
  CHAT_DELETED: 'chat:deleted',
  CHAT_JOIN: 'chat:join',
  CHAT_LEAVE: 'chat:leave',
  MARK_READ: 'chat:read',
  MESSAGE_SEND: 'message:send',
  MESSAGE_CREATED: 'message:created',
  MESSAGE_UPDATED: 'message:updated',
  MESSAGE_DELETED: 'message:deleted',
  MESSAGE_DELIVERED: 'message:delivered',
  MESSAGE_READ: 'message:read',
  REACTION_ADD: 'message:reaction:add',
  REACTION_REMOVE: 'message:reaction:remove',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  TYPING_UPDATE: 'typing:update',
  PRESENCE_UPDATE: 'presence:update',
  NOTIFICATION_NEW: 'notification:new',
} as const;
