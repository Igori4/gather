# Chat

## What it does

Per-outing persistent chat. Messages stored in DB via REST API, delivered in real time via Socket.IO room. Users can edit and soft-delete their own messages. Infinite scroll loads older messages via cursor pagination.

## API routes

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/api/outings/:id/messages?cursor=&limit=30` | requireAuth + group membership |
| `POST` | `/api/outings/:id/messages` | requireAuth + group membership |
| `PATCH` | `/api/outings/:id/messages/:messageId` | requireAuth + message author |
| `DELETE` | `/api/outings/:id/messages/:messageId` | requireAuth + message author |

## Key files

| File | Purpose |
|------|---------|
| `apps/api/src/routes/chat.ts` | Route registration + OpenAPI docs |
| `apps/api/src/controllers/chat.controller.ts` | Request handlers (send, list, edit, delete) |
| `apps/web/src/components/chat/ChatWindow.tsx` | Main chat UI, infinite scroll, input |
| `apps/web/src/components/chat/Message.tsx` | Single message with edit UI |
| `apps/web/src/components/chat/ChatWidget.tsx` | Floating widget with unread counter |
| `apps/web/src/hooks/useChatRoom.ts` | Socket listeners — join/leave, message + edit events |
| `apps/web/src/hooks/useMessages.ts` | TanStack Query — cursor-paginated fetch + cache helpers |

## Data model

`ChatMessage` — `id, outingId, userId, body, createdAt, editedAt?`

Soft-delete: `body` set to `[deleted]` and `deletedAt` set, message stays in DB for continuity.

## Socket events (chat-specific)

| Event | Direction | Payload |
|-------|-----------|---------|
| `chat:message` | server → room | `{ id, outingId, userId, body, createdAt }` |
| `chat:message:edited` | server → room | `{ messageId, newBody, editedAt }` |
| `chat:typing` | client → server → room | `{ outingId, userId, isTyping }` — **not implemented yet** |

## Known gaps / open issues

1. **Connection-state UI (PBI-4.8 gap #2)** — no banner shown on disconnect/reconnect in `ChatWindow.tsx`. `useChatRoom` already handles reconnect (re-emits `outing:join` on `connect` event) but user sees no visual feedback.
2. **Send error handling** — `ChatWindow` input has no `catch` on send; network errors silently swallowed.
3. **Typing indicators (PBI-4.4)** — `chat:typing` event not implemented on server or client.

## Status

`partial` — core send/receive/edit/delete done. Three gaps above remain.
