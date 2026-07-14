# Real-Time Events: PBI-4.4 + 4.5 + 4.6

Typing indicators, live vote tallies, live RSVP + outing confirm.

Strategy: direct cache updates (no refetch) for votes and RSVP; invalidate for confirm (state machine change).

---

## PBI-4.4 — Typing Indicators

### Server — `apps/api/src/socket/chatHandler.ts`

Add a `chat:typing` event handler inside `registerChatHandler`, after the existing `outing:leave` handler:

```ts
socket.on('chat:typing', async ({ outingId, isTyping }: { outingId: string; isTyping: boolean }) => {
  const outing = await OutingRepository.findByIdWithGroup(outingId)
  if (!outing) return
  const isMember = outing.group.members.some(m => m.userId === socket.userId)
  if (!isMember) return

  // broadcast to everyone in the room EXCEPT the sender
  socket.to(`outing:${outingId}`).emit('chat:typing', {
    userId: socket.userId,
    isTyping,
  })
})
```

### Client — `apps/web/src/hooks/useChatRoom.ts`

1. Accept a second argument `onTyping` callback, OR expose typing state from the hook. Easiest: return `typingUserIds` set from the hook.

Add inside the hook:

```ts
// map userId → clearTimeout handle
const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
const [typingUserIds, setTypingUserIds] = useState<Set<string>>(new Set())

function onTyping({ userId, isTyping }: { userId: string; isTyping: boolean }) {
  if (isTyping) {
    setTypingUserIds(prev => new Set(prev).add(userId))
    // auto-clear after 3s in case the "stop" event never arrives
    const existing = typingTimers.current.get(userId)
    if (existing) clearTimeout(existing)
    const timer = setTimeout(() => {
      setTypingUserIds(prev => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
    }, 3000)
    typingTimers.current.set(userId, timer)
  } else {
    clearTimeout(typingTimers.current.get(userId))
    typingTimers.current.delete(userId)
    setTypingUserIds(prev => {
      const next = new Set(prev)
      next.delete(userId)
      return next
    })
  }
}

socket.on('chat:typing', onTyping)
// cleanup:
socket.off('chat:typing', onTyping)
```

Change `useChatRoom` to return `{ typingUserIds }`.

2. Change the call site in `ChatWindow.tsx`:

```ts
const { typingUserIds } = useChatRoom(outingId)
```

Pass `typingUserIds` down via context (add it to `ChatWindowContext`).

### Client — `apps/web/src/components/chat/ChatWindow.tsx`

**Emit typing event from `Input`:**

In the `Input` component, add a `sendTyping` ref for debouncing:

```ts
const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
  setBody(e.target.value)
  setError('')

  const socket = getSocket()
  socket.emit('chat:typing', { outingId, isTyping: true })

  if (typingTimer.current) clearTimeout(typingTimer.current)
  typingTimer.current = setTimeout(() => {
    socket.emit('chat:typing', { outingId, isTyping: false })
  }, 2000)
}
```

Clean up timer on unmount with `useEffect(() => () => clearTimeout(typingTimer.current), [])`.

**Show `TypingIndicator` in `MessageList`:**

Add at the bottom of the message list, just above `<div ref={bottomRef} />`:

```tsx
<TypingIndicator typingUserIds={typingUserIds} />
```

Get `typingUserIds` from `ChatWindowContext`.

### New component — `apps/web/src/components/chat/TypingIndicator.tsx`

```tsx
export function TypingIndicator({ typingUserIds }: { typingUserIds: Set<string> }) {
  if (typingUserIds.size === 0) return null
  const count = typingUserIds.size
  const label = count === 1 ? 'Someone is typing…' : `${count} people are typing…`
  return (
    <p className="text-xs text-muted-foreground italic px-1">{label}</p>
  )
}
```

> Note: showing "Someone" instead of names keeps it simple and avoids needing a userId→name lookup here. If you want names, you'll need to pass the members list down and look up by userId.

---

## PBI-4.5 — Live Vote Tallies

### Server — `apps/api/src/controllers/outings.controller.ts`

**`castVote`:** after `const tally = await OutingRepository.castVote(...)`, emit before the response:

```ts
import { getIo } from '../socket'

// inside castVote, after tally is computed:
getIo()
  .to(`outing:${outingId}`)
  .emit('vote:cast', { outingId, placeId, userId, tally })
```

**`voteSlot`:** after `const tally = await OutingRepository.voteSlot(...)`:

```ts
getIo()
  .to(`outing:${outingId}`)
  .emit('slot:vote', { outingId, slotId, userId, voteSummary: tally })
```

Socket payload shapes (already returned by the repository):
- `vote:cast` → `{ outingId, placeId, userId, tally: { up, down, userVote } }`
- `slot:vote` → `{ outingId, slotId, userId, voteSummary: { available, unavailable, userVote } }`

### Client — new hook `apps/web/src/hooks/useOutingSocketEvents.ts`

This hook does NOT join/leave the room (chat room already does that). It only attaches listeners and updates the cache.

```ts
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getSocket } from '@/lib/socket'

export function useOutingSocketEvents(outingId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const socket = getSocket()

    function onVoteCast({
      placeId,
      tally,
    }: {
      outingId: string
      placeId: string
      userId: string
      tally: { up: number; down: number; userVote: 'up' | 'down' | null }
    }) {
      queryClient.setQueryData<OutingDetail>(['outing', outingId], old => {
        if (!old) return old
        return {
          ...old,
          places: old.places.map(p =>
            p.placeId === placeId ? { ...p, tally } : p
          ),
        }
      })
    }

    function onSlotVote({
      slotId,
      voteSummary,
    }: {
      outingId: string
      slotId: string
      userId: string
      voteSummary: { available: number; unavailable: number; userVote: boolean | null }
    }) {
      queryClient.setQueryData<OutingDetail>(['outing', outingId], old => {
        if (!old) return old
        return {
          ...old,
          slots: old.slots.map(s =>
            s.id === slotId ? { ...s, voteSummary } : s
          ),
        }
      })
    }

    socket.on('vote:cast', onVoteCast)
    socket.on('slot:vote', onSlotVote)

    return () => {
      socket.off('vote:cast', onVoteCast)
      socket.off('slot:vote', onSlotVote)
    }
  }, [outingId, queryClient])
}
```

> **Important:** replace `OutingDetail` with whatever type your `['outing', outingId]` query returns. Check `apps/web/src/hooks/useOuting.ts` (or equivalent) to confirm the query key and shape — especially `places[].placeId` (may be `places[].id` depending on what the API returns) and `slots[].voteSummary` (may be `slots[].votes`). Adjust field names to match.

### Client — `apps/web/src/pages/outings/OutingDetailPage.tsx`

Call the hook at the top of the component (after the existing `useChatRoom` or wherever you already call socket hooks):

```ts
useOutingSocketEvents(outingId)
```

---

## PBI-4.6 — Live RSVP + Outing Confirm

### Server — `apps/api/src/controllers/outings.controller.ts`

**`rsvp`:** after `const entry = await OutingRepository.upsertRSVP(...)`:

```ts
getIo()
  .to(`outing:${req.params.id}`)
  .emit('rsvp:updated', { outingId: req.params.id, userId, status: parsed.data.status })
```

**`confirmOuting`:** after `const updated = await OutingRepository.confirmOuting(...)`:

```ts
getIo()
  .to(`outing:${req.params.id}`)
  .emit('outing:confirmed', {
    outingId: req.params.id,
    placeId: parsed.data.placeId,
    slotId: parsed.data.slotId,
    confirmedAt: updated.confirmedAt,
  })
```

### Client — extend `useOutingSocketEvents.ts`

Add two more handlers inside the same `useEffect`:

```ts
function onRsvpUpdated({
  userId,
  status,
}: {
  outingId: string
  userId: string
  status: string
}) {
  queryClient.setQueryData<OutingDetail>(['outing', outingId], old => {
    if (!old) return old
    const existingIdx = old.rsvps?.findIndex(r => r.userId === userId) ?? -1
    const updatedRsvps =
      existingIdx >= 0
        ? old.rsvps!.map(r => (r.userId === userId ? { ...r, status } : r))
        : [...(old.rsvps ?? []), { userId, status }]
    return { ...old, rsvps: updatedRsvps }
  })
}

function onOutingConfirmed(payload: {
  outingId: string
  placeId: string
  slotId: string
  confirmedAt: string
}) {
  // invalidate — state machine change, safer to refetch full outing
  queryClient.invalidateQueries({ queryKey: ['outing', outingId] })
}

socket.on('rsvp:updated', onRsvpUpdated)
socket.on('outing:confirmed', onOutingConfirmed)

// in cleanup:
socket.off('rsvp:updated', onRsvpUpdated)
socket.off('outing:confirmed', onOutingConfirmed)
```

---

## Connection-state banner (remaining PBI-4.8 gap #2)

While you're in `ChatWindow.tsx`, add the disconnect/reconnect banner:

In `ChatWindow`, track connection state:

```ts
const [connected, setConnected] = useState(true)

useEffect(() => {
  const socket = getSocket()
  function onDisconnect() { setConnected(false) }
  function onConnect() { setConnected(true) }
  socket.on('disconnect', onDisconnect)
  socket.on('connect', onConnect)
  return () => {
    socket.off('disconnect', onDisconnect)
    socket.off('connect', onConnect)
  }
}, [])
```

Add in JSX above `{children}`:

```tsx
{!connected && (
  <div className="bg-yellow-100 text-yellow-800 text-xs text-center py-1 px-2">
    Reconnecting…
  </div>
)}
```

---

## Order of implementation

1. PBI-4.4: `chatHandler.ts` → `useChatRoom.ts` → `TypingIndicator.tsx` → `ChatWindow.tsx`
2. PBI-4.5: `outings.controller.ts` (emit `vote:cast` + `slot:vote`) → `useOutingSocketEvents.ts` → `OutingDetailPage.tsx`
3. PBI-4.6: `outings.controller.ts` (emit `rsvp:updated` + `outing:confirmed`) → extend `useOutingSocketEvents.ts`
4. Gap #2: `ChatWindow.tsx` connection banner

## Update docs when done

- Mark PBI-4.4, 4.5, 4.6 as `[x]` in `CLAUDE.md`
- Update `docs/features/chat.md` — remove gaps 1 and 3 (if done), note typing indicator added
- Update `docs/features/realtime.md` — flip ✅ for implemented events, remove resolved gaps
