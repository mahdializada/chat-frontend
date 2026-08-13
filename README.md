# Chat Frontend

Modern real-time chat UI built with **Next.js (App Router)**, **React**, **TypeScript**, **Chakra UI**, **TanStack Query**, **Socket.IO Client**, **React Hook Form + Zod** and **Zustand**.

Works against the separate [`chat-backend`](../chat-backend) repository (REST + WebSocket). This app never talks to PostgreSQL/Redis directly.

## Features

- Login / register with validated forms; session restored after refresh via the backend's httpOnly refresh cookie (access token lives only in memory)
- Chat list with last-message preview, unread badges, live presence dots and typing previews
- Direct chats and full group management (create, rename, description, add/remove members, promote/demote, leave, delete — permission-aware UI)
- Real-time messaging with optimistic sending, retry on failure, and de-duplication between REST, optimistic updates and WebSocket events
- Replies, editing (with `edited` label), delete-for-me / delete-for-everyone, emoji reactions with live updates
- Sent ✓ / delivered ✓✓ / read (colored ✓✓) ticks driven by per-recipient receipts
- Typing indicators (throttled, auto-clearing), online/offline/last-seen presence
- Image, file and **voice message** support (MediaRecorder) with previews and an audio player
- Search across chats and message content; clicking a message result jumps into its context
- In-app notification center + real-time toasts
- Infinite upward scrolling with cursor pagination; day separators; auto mark-as-read
- Fully responsive: dedicated mobile flow (list ⇄ conversation with back button), dark mode

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev            # http://localhost:3000
```

The backend must be running first (see its README — API on port 3001 by default).

## Environment variables

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | REST base URL | `http://localhost:3001/api/v1` |
| `NEXT_PUBLIC_SOCKET_URL` | Socket.IO origin | `http://localhost:3001` |

## Scripts

```bash
npm run dev         # development server
npm run build       # production build
npm run start       # serve the production build
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
```

## Architecture

```
src/
├── app/                    # App Router pages
│   ├── (auth)/             # /login, /register (guest-only)
│   └── (dashboard)/        # /chat, /chat/[chatId], /profile (auth-guarded)
├── components/shared/      # avatars, guards, confirm dialog, spinner
├── features/
│   ├── auth/               # forms, zod schemas, auth hooks, service
│   ├── users/              # user search
│   ├── chats/              # sidebar, list, modals, header, group drawer, hooks
│   ├── messages/           # list, bubbles, input, voice recorder, player, hooks
│   └── notifications/      # popover, hooks, service
├── lib/                    # axios client (+ silent token refresh), socket client,
│                           # socket→query-cache wiring, cache helpers, theme
├── providers/              # Chakra + QueryClient + Auth + Socket providers
├── store/                  # zustand: auth, presence/typing; active-chat ref
├── services/               # uploads service
├── types/                  # API types mirrored from the backend
└── utils/                  # formatting helpers
```

### How real-time stays consistent

- **Server state lives in TanStack Query.** Socket events (`message:created`, `message:read`, `presence:update`, …) are translated into targeted query-cache updates in `src/lib/socket-events.ts`; ephemeral state (typing, live presence) lives in a small Zustand store.
- **Optimistic sending** creates a temporary message keyed by a `clientId`; the REST response and the echoed WebSocket event both reconcile against it, so no duplicates appear regardless of arrival order.
- **Reconnection**: the server emits `ready` once the socket is authenticated and joined to its rooms; the client then invalidates chats/messages/notifications, so anything missed while offline is refetched. The same path handles page refresh.
- **Auth**: axios attaches the in-memory access token and transparently refreshes it on 401 (single-flight), retrying the original request; the socket pulls the freshest token on every (re)connect attempt.

## WebSocket events used

`ready`, `message:send` (ack), `message:created|updated|deleted`, `message:delivered`, `message:read`, `message:reaction:add|remove`, `typing:start|stop|update`, `presence:update`, `chat:created|updated|deleted`, `chat:join|leave`, `chat:read`, `notification:new` — payloads documented in the backend README.

## Build

```bash
npm run build && npm run start
```

Point `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_SOCKET_URL` at your deployed backend. They are inlined at build time, so rebuild after changing them.
