# NexaChat Frontend

Modern real-time messaging UI built with **Next.js (App Router)**, **React**, **TypeScript**, **Chakra UI**, **TanStack Query**, **Socket.IO Client**, **React Hook Form + Zod** and **Zustand**.

Works against the separate [`chat-backend`](../chat-backend) repository (REST + WebSocket). This app never talks to PostgreSQL/Redis directly.

## Features

**Conversations**
- Login / register with validated forms; session restored after refresh via the backend's httpOnly refresh cookie (access token lives only in memory)
- Chat list with last-message preview, unread badges, live presence dots, typing previews, delivery ticks, pinned/muted/draft/mention indicators
- Pin, archive (with its own section), mute (8 h / 1 week / forever), mark as unread, clear chat, delete chat — all persisted per user and synced across devices
- Direct chats and full group management: create, rename, description, avatar, add/remove members, promote/demote admins, **transfer ownership**, leave, delete — permission-aware UI backed by server-side checks
- Group permissions (who may send, edit group info, use `@everyone`) and secure **invite links** (create, copy, regenerate, revoke, join)

**Messages**
- Real-time messaging with optimistic sending, retry on failure, and de-duplication between REST, optimistic updates and WebSocket events
- Message actions: reply, react, copy, forward, star, edit, delete, select — only the actions allowed for that message are shown
- Multi-select mode with a selection toolbar (copy · forward · star · delete)
- Reply context that scrolls to the original, or says *"Original message unavailable"* when it is gone
- Emoji reactions with counts and a "who reacted" sheet; `Read by` sheet in groups
- `@mentions` with autocomplete, highlighting, click-to-open-profile and `@everyone` (permission-gated)
- Automatic link detection with rich previews, plus emoji / GIF / sticker pickers with recently-used memory
- Sent ✓ / delivered ✓✓ / read (coloured ✓✓) ticks driven by per-recipient receipts
- Image, video, file and **voice message** support (MediaRecorder) with previews and an audio player

**Finding things**
- Global search across chats and messages, and `Ctrl/⌘+F` search **inside** a conversation with match highlighting and next/previous navigation — all server-side
- Clicking any result jumps to the message, loading the surrounding page if needed and highlighting it briefly
- Starred messages drawer (per user, never shared)
- "Media, links and docs" gallery with Media / Files / Links / Audio tabs, search, sort, counts, and a full-screen viewer (← → Esc, zoom, pan, download, jump to message)

**People & privacy**
- Contact info panel: avatar, name, username, online/last seen, about, shared media, **groups in common** (computed by the API), and actions
- Block / unblock, moderation reports, chat export (text or JSON)
- Privacy settings for profile photo, last seen, online status, about and read receipts — enforced on the server
- Active sessions with per-device sign-out

**Reliability & polish**
- Offline banner; messages composed offline are queued in a persistent outbox and flushed on reconnect, reconciled by `clientId`
- Reconnect synchronisation patches the cache from `/messages/sync` instead of discarding it
- Multi-device/tab sync for messages, receipts, reactions, edits, deletes, presence and chat settings
- Desktop notifications that respect muted chats and per-account preferences
- Infinite upward scrolling with cursor pagination, day separators, auto mark-as-read
- Skeleton loading, empty states, error states, confirmation dialogs for destructive actions
- Keyboard shortcuts, visible focus rings, ARIA landmarks, `prefers-reduced-motion` support
- Fully responsive mobile flow (list ⇄ conversation with back button), light/dark/system themes and chat wallpapers

## Keyboard shortcuts

| Keys | Action |
|---|---|
| `Enter` | Send message |
| `Shift+Enter` | New line |
| `Ctrl/⌘+K` | Focus the chat search |
| `Ctrl/⌘+F` | Search inside the open conversation |
| `Esc` | Close a panel, cancel a reply/edit, or exit selection mode |
| `←` `→` `Esc` | Previous / next / close in the media viewer |
| `↑` `↓` `Enter` | Navigate and pick a `@mention` suggestion |

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev            # http://localhost:3002
```

> The dev/start scripts pin port **3002** so this app never collides with other
> local Next.js projects (a silent fallback would break the backend's CORS
> allowlist and can steal the API's port 3001).

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
│   └── (dashboard)/        # /chat, /chat/[chatId], /chat/archived,
│                           # /profile, /invite/[token] (auth-guarded)
├── components/shared/      # avatars, guards, empty states, skeletons,
│                           # confirm dialog, offline banner
├── features/
│   ├── auth/               # forms, zod schemas, auth + session hooks, service
│   ├── users/              # search, contact profile drawer, common groups,
│   │                       # privacy, blocked contacts, sessions, appearance, report
│   ├── chats/              # sidebar, list item, modals, header, group info,
│   │                       # in-conversation search, invite links, hooks
│   ├── media/              # shared media gallery, full-screen viewer,
│   │                       # GIF + sticker pickers
│   ├── messages/           # list, bubbles, input, mentions, link previews,
│   │                       # forward dialog, selection toolbar, starred, read-by
│   └── notifications/      # popover, hooks, service
├── hooks/                  # keyboard shortcuts
├── lib/                    # axios client (+ silent token refresh), socket client,
│                           # socket→query-cache wiring, cache helpers, outbox,
│                           # emoji data, wallpapers, notifications, theme
├── providers/              # Chakra + QueryClient + Auth + ThemeSync + Socket
├── store/                  # zustand: auth, chat UI (presence/typing/selection/drafts),
│                           # connection status, persistent outbox; active-chat ref
├── services/               # uploads, GIF/sticker media services
├── types/                  # API types mirrored from the backend
└── utils/                  # formatting helpers
```

### How real-time stays consistent

- **Server state lives in TanStack Query.** Socket events (`message:created`, `message:read`, `presence:update`, …) are translated into targeted query-cache updates in `src/lib/socket-events.ts`; ephemeral state (typing, live presence) lives in a small Zustand store.
- **Optimistic sending** creates a temporary message keyed by a `clientId`; the REST response and the echoed WebSocket event both reconcile against it, so no duplicates appear regardless of arrival order.
- **Reconnection**: the server emits `ready` (with a `serverTime` cursor) once the socket is authenticated and joined to its rooms. The client then calls `/messages/sync?since=<cursor>` and **patches** the cache with what it missed instead of throwing it away — no flicker, no lost scroll position. If more changed than the sync limit, it falls back to a full refetch.
- **Offline**: `navigator.onLine` drives an offline banner; the composer stays usable and messages go into a `localStorage`-backed outbox. On reconnect the outbox is flushed oldest-first, and because each entry carries its `clientId`, a message that actually reached the server before the drop is reconciled rather than duplicated.
- **Multi-device**: per-user state (chat settings, drafts, stars, block state) is broadcast to the user's own socket room, so every tab and device stays in step.
- **Auth**: axios attaches the in-memory access token and transparently refreshes it on 401 (single-flight), retrying the original request; the socket pulls the freshest token on every (re)connect attempt.
- **Privacy is not a UI concern**: hidden fields never reach the client. The UI only decides how to phrase their absence (e.g. *"Status hidden"*).

## WebSocket events used

`ready`, `sync` (ack), `message:send` (ack), `message:created|updated|deleted`,
`message:starred`, `message:delivered`, `message:read`,
`message:reaction:add|remove`, `typing:start|stop|update`, `presence:update`,
`chat:created|updated|deleted|cleared`, `chat:settings:updated`,
`chat:draft:updated`, `chat:join|leave`, `chat:read`, `user:block:updated`,
`notification:new` — payloads documented in the backend README.

## External providers

GIF search is the only feature that requires a third-party service. When the
backend has no GIF provider configured, `GET /gifs/status` returns
`{ enabled: false }` and the GIF tab explains that instead of failing. Emoji and
stickers need no external service — the emoji set ships in
`src/lib/emoji-data.ts` and stickers are served by the backend's local provider.

## Build

```bash
npm run build && npm run start
```

Point `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_SOCKET_URL` at your deployed backend. They are inlined at build time, so rebuild after changing them.
