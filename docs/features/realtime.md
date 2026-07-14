# Real-Time (Socket.IO)

## What it does

Socket.IO server runs on the same HTTP server as Express. Each outing gets one room (`outing:{id}`). JWT auth verified in socket middleware on every connection. Currently only chat events are handled — vote, RSVP, presence, and typing events are planned but not implemented.

## Key files

| File | Purpose |
|------|---------|
| `apps/api/src/socket/index.ts` | `initSocket` — auth middleware, connection handler, room cleanup stub |
| `apps/api/src/socket/chatHandler.ts` | `outing:join` / `outing:leave` with membership guard |
| `apps/web/src/lib/socket.ts` | `getSocket()` / `connectSocket()` / `disconnectSocket()` helpers |
| `apps/web/src/hooks/useChatRoom.ts` | Room join/leave lifecycle + chat event listeners |

## Room strategy

One room per outing: `outing:{outingId}`. Join on page mount, leave on unmount. Every server-side event handler must verify group membership before processing — enforced in `chatHandler.ts`.

## Socket auth flow

Client sends JWT access token in `socket.handshake.auth.token`. Server middleware (`socket/index.ts`) calls `verifyAccessToken` — rejects with `"Invalid or expired token"` on failure. Client (`socket.ts`) intercepts `connect_error` with that reason, calls refresh endpoint, reconnects with new token.

## Full event catalogue

| Event | Direction | Status | Payload |
|-------|-----------|--------|---------|
| `outing:join` | client → server | ✅ done | `{ outingId }` |
| `outing:leave` | client → server | ✅ done | `{ outingId }` |
| `chat:message` | server → room | ✅ done | `{ id, outingId, userId, body, createdAt }` |
| `chat:message:edited` | server → room | ✅ done | `{ messageId, newBody, editedAt }` |
| `chat:typing` | client → server → room | ❌ PBI-4.4 | `{ outingId, userId, isTyping }` |
| `vote:cast` | server → room | ❌ PBI-4.5 | `{ outingId, placeId, userId, vote, tally }` |
| `slot:vote` | server → room | ❌ PBI-4.5 | `{ slotId, userId, available, voteSummary }` |
| `rsvp:updated` | server → room | ❌ PBI-4.6 | `{ outingId, userId, status }` |
| `outing:confirmed` | server → room | ❌ PBI-4.6 | `{ outingId, placeId, slotId, confirmedAt }` |
| `presence:join` | server → room | ❌ PBI-4.7 | `{ userId, name, avatarUrl }` |
| `presence:leave` | server → room | ❌ PBI-4.7 | `{ userId }` |

## Known gaps / open issues

1. **Typing indicators (PBI-4.4)** — `chat:typing` not implemented server or client side.
2. **Live vote tallies (PBI-4.5)** — `vote:cast` + `slot:vote` events not emitted; clients must refetch manually.
3. **Live RSVP + confirm (PBI-4.6)** — `rsvp:updated` + `outing:confirmed` not emitted.
4. **Presence (PBI-4.7)** — `presence:join/leave` stub only in `socket/index.ts`; no handler, no UI.
5. **Connection-state UI** — `useChatRoom` rejoins on reconnect but no banner in `ChatWindow`.

## Status

`partial` — auth + rooms + chat events done. Events for votes, RSVP, presence, typing all planned but not implemented.
