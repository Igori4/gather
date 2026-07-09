# Outings API + Live Chat Implementation Plan

**Goal:** Build the minimum path from groups to live chat — Outings API (PBI-3.1), Chat REST API (PBI-4.1), Socket.IO rooms (PBI-4.2), and Chat UI (PBI-4.3).
**Architecture:** 3-layer backend (routes → controllers → repositories). REST POST saves message to DB then emits `chat:message` via a `getIo()` singleton. Frontend uses TanStack Query for history + Socket.IO hook for real-time delivery.
**Tech Stack:** Express, Prisma, Socket.IO, React, TanStack Query, Zustand, React Hook Form + Zod.
**Execution:** Use the `executing-plans` skill to implement this plan task-by-task.

---

## Scope

**In scope:** PBI-3.1 (Outings API), GroupDetailPage (minimal), OutingDetailPage (minimal), PBI-4.1 (Chat REST API), PBI-4.2 (Socket.IO rooms), PBI-4.3 (Chat UI).

**Deferred:** PBI-1.4, PBI-2.3, PBI-3.2–3.7 (places/voting/slots/RSVP), PBI-4.4–4.7 (typing/presence/live votes).

---

## Task 1: OutingRepository

**Type:** non-TDD — pure DB abstraction, behaviour tested via route tests in Task 3.

**Files:**

- Create: `apps/api/src/repositories/outing.repository.ts`

**Step 1: Create file**

```typescript
import { prisma } from '../lib/prisma'

export const OutingRepository = {
  create: (data: {
    groupId: string
    title: string
    description?: string | null
    createdBy: string
  }) => prisma.outing.create({ data }),

  findAllForGroup: (groupId: string) =>
    prisma.outing.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        createdAt: true,
        createdBy: true,
      },
    }),

  findById: (id: string) => prisma.outing.findUnique({ where: { id } }),

  findByIdWithGroup: (id: string) =>
    prisma.outing.findUnique({
      where: { id },
      include: { group: { include: { members: { select: { userId: true } } } } },
    }),
}
```

**Step 2: Verify** — `npm run typecheck --workspace=apps/api` passes with no new errors.

**Step 3: Commit**

```bash
git add apps/api/src/repositories/outing.repository.ts
git commit -m "feat(api): add OutingRepository"
```

---

## Task 2: Outings API — failing tests

**Type:** TDD — write failing tests before implementation.

**Files:**

- Create: `apps/api/tests/routes/outings.test.ts`

**Step 1: Write failing tests**

```typescript
import request from 'supertest'
import { app } from '../../src/app'
import { prisma } from '../../src/lib/prisma'

const DOMAIN = '@gather-outings-test.com'
const uid = () => Math.random().toString(36).slice(2, 10)
const email = (label: string) => `test-outings-${label}-${uid()}${DOMAIN}`

async function createTestUser(label: string) {
  const e = email(label)
  const res = await request(app)
    .post('/auth/register')
    .send({ email: e, password: 'Password123!', name: `User ${label}` })
  return { userId: res.body.user.id, token: res.body.accessToken }
}

async function createTestGroup(token: string) {
  const res = await request(app)
    .post('/api/groups')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Test Group' })
  return res.body.id as string
}

afterAll(async () => {
  const users = await prisma.user.findMany({
    where: { email: { contains: DOMAIN } },
    select: { id: true },
  })
  const ids = users.map(u => u.id)
  await prisma.group.deleteMany({ where: { createdBy: { in: ids } } })
  await prisma.user.deleteMany({ where: { id: { in: ids } } })
  await prisma.$disconnect()
})

// ─── POST /api/groups/:groupId/outings ─────────────────────────────────────

describe('POST /api/groups/:groupId/outings', () => {
  it('201 — creates outing', async () => {
    const { token } = await createTestUser('create')
    const groupId = await createTestGroup(token)

    const res = await request(app)
      .post(`/api/groups/${groupId}/outings`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Pizza Night' })

    expect(res.status).toBe(201)
    expect(res.body.title).toBe('Pizza Night')
    expect(res.body.groupId).toBe(groupId)
    expect(res.body.status).toBe('draft')
  })

  it('401 — no auth', async () => {
    const res = await request(app).post('/api/groups/fake-id/outings').send({ title: 'x' })
    expect(res.status).toBe(401)
  })

  it('400 — missing title', async () => {
    const { token } = await createTestUser('create-bad')
    const groupId = await createTestGroup(token)
    const res = await request(app)
      .post(`/api/groups/${groupId}/outings`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
    expect(res.status).toBe(400)
  })

  it('403 — non-member cannot create outing', async () => {
    const { token: adminToken } = await createTestUser('admin')
    const { token: otherToken } = await createTestUser('nonmember')
    const groupId = await createTestGroup(adminToken)

    const res = await request(app)
      .post(`/api/groups/${groupId}/outings`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ title: 'Sneaky Outing' })

    expect(res.status).toBe(403)
  })
})

// ─── GET /api/groups/:groupId/outings ──────────────────────────────────────

describe('GET /api/groups/:groupId/outings', () => {
  it('200 — returns outings for group', async () => {
    const { token } = await createTestUser('list')
    const groupId = await createTestGroup(token)

    await request(app)
      .post(`/api/groups/${groupId}/outings`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'First Outing' })

    const res = await request(app)
      .get(`/api/groups/${groupId}/outings`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThan(0)
  })

  it('403 — non-member gets 403', async () => {
    const { token: adminToken } = await createTestUser('list-admin')
    const { token: otherToken } = await createTestUser('list-other')
    const groupId = await createTestGroup(adminToken)

    const res = await request(app)
      .get(`/api/groups/${groupId}/outings`)
      .set('Authorization', `Bearer ${otherToken}`)

    expect(res.status).toBe(403)
  })
})

// ─── GET /api/outings/:id ──────────────────────────────────────────────────

describe('GET /api/outings/:id', () => {
  it('200 — returns outing detail', async () => {
    const { token } = await createTestUser('get')
    const groupId = await createTestGroup(token)
    const createRes = await request(app)
      .post(`/api/groups/${groupId}/outings`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Detail Outing' })
    const outingId = createRes.body.id

    const res = await request(app)
      .get(`/api/outings/${outingId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.id).toBe(outingId)
    expect(res.body.title).toBe('Detail Outing')
  })

  it('403 — non-member gets 403', async () => {
    const { token: adminToken } = await createTestUser('get-admin')
    const { token: otherToken } = await createTestUser('get-other')
    const groupId = await createTestGroup(adminToken)
    const createRes = await request(app)
      .post(`/api/groups/${groupId}/outings`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Private Outing' })

    const res = await request(app)
      .get(`/api/outings/${createRes.body.id}`)
      .set('Authorization', `Bearer ${otherToken}`)

    expect(res.status).toBe(403)
  })

  it('404 — outing not found', async () => {
    const { token } = await createTestUser('get-404')
    const res = await request(app)
      .get('/api/outings/nonexistent-id')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(404)
  })
})
```

**Step 2: Run — verify fails**

```bash
npm test --workspace=apps/api -- --testPathPattern=outings
```

Expected: FAIL — routes not registered yet (404 responses).

---

## Task 3: Outings controller + routes + registration

**Type:** TDD — make Task 2 tests pass.

**Files:**

- Create: `apps/api/src/controllers/outings.controller.ts`
- Create: `apps/api/src/routes/outings.ts`
- Modify: `apps/api/src/app.ts`

**Step 1: Create controller**

```typescript
// apps/api/src/controllers/outings.controller.ts
import { Request, Response } from 'express'
import { CreateOutingSchema } from '@gather/shared'
import { AuthRequest } from '../middleware/auth'
import { OutingRepository } from '../repositories/outing.repository'
import { GroupRepository } from '../repositories/group.repository'

export async function createOuting(req: Request, res: Response) {
  const { userId } = req as AuthRequest
  const { groupId } = req.params

  const membership = await GroupRepository.findMembership(groupId, userId)
  if (!membership) return res.status(403).json({ error: 'Forbidden' })

  const parsed = CreateOutingSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const outing = await OutingRepository.create({ ...parsed.data, groupId, createdBy: userId })
  return res.status(201).json(outing)
}

export async function listOutings(req: Request, res: Response) {
  const { userId } = req as AuthRequest
  const { groupId } = req.params

  const membership = await GroupRepository.findMembership(groupId, userId)
  if (!membership) return res.status(403).json({ error: 'Forbidden' })

  const outings = await OutingRepository.findAllForGroup(groupId)
  return res.json(outings)
}

export async function getOuting(req: Request, res: Response) {
  const { userId } = req as AuthRequest

  const outing = await OutingRepository.findByIdWithGroup(req.params.id)
  if (!outing) return res.status(404).json({ error: 'Outing not found' })

  const isMember = outing.group.members.some(m => m.userId === userId)
  if (!isMember) return res.status(403).json({ error: 'Forbidden' })

  return res.json(outing)
}
```

**Step 2: Create route file**

```typescript
// apps/api/src/routes/outings.ts
/**
 * @openapi
 * tags:
 *   name: Outings
 *   description: Outing planning within a group
 */
import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import * as OutingsController from '../controllers/outings.controller'

export const outingsRouter = Router()

outingsRouter.use(requireAuth)

/**
 * @openapi
 * /api/groups/{groupId}/outings:
 *   post:
 *     tags: [Outings]
 *     summary: Create a new outing in a group (members only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *     responses:
 *       201: { description: Outing created }
 *       400: { description: Validation error }
 *       403: { description: Not a group member }
 */
outingsRouter.post('/groups/:groupId/outings', OutingsController.createOuting)

/**
 * @openapi
 * /api/groups/{groupId}/outings:
 *   get:
 *     tags: [Outings]
 *     summary: List outings for a group (members only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Array of outings }
 *       403: { description: Not a group member }
 */
outingsRouter.get('/groups/:groupId/outings', OutingsController.listOutings)

/**
 * @openapi
 * /api/outings/{id}:
 *   get:
 *     tags: [Outings]
 *     summary: Get outing detail (members only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Outing detail }
 *       403: { description: Not a group member }
 *       404: { description: Outing not found }
 */
outingsRouter.get('/outings/:id', OutingsController.getOuting)
```

**Step 3: Register in app.ts** — replace the commented line:

In `apps/api/src/app.ts` replace:

```typescript
// app.use('/api/outings', outingsRouter) — Phase 3
```

with:

```typescript
import { outingsRouter } from './routes/outings'
// ...
app.use('/api', outingsRouter)
```

Actually add the import at the top with other imports and replace the comment line:

At the top of `apps/api/src/app.ts`, after existing route imports add:

```typescript
import { outingsRouter } from './routes/outings'
```

In the Routes section replace `// app.use('/api/outings', outingsRouter) — Phase 3` with:

```typescript
app.use('/api', outingsRouter)
```

**Step 4: Run tests — verify pass**

```bash
npm test --workspace=apps/api -- --testPathPattern=outings
```

Expected: all outings tests PASS.

**Step 5: Commit**

```bash
git add apps/api/src/controllers/outings.controller.ts apps/api/src/routes/outings.ts apps/api/src/app.ts apps/api/tests/routes/outings.test.ts
git commit -m "feat(api): add Outings API (PBI-3.1)"
```

---

## Task 4: ChatRepository

**Type:** non-TDD — pure DB abstraction, behaviour tested via route tests in Task 6.

**Files:**

- Create: `apps/api/src/repositories/chat.repository.ts`

**Step 1: Create file**

```typescript
import { prisma } from '../lib/prisma'

export const ChatRepository = {
  // Cursor pagination: returns `limit` messages before `cursor` (exclusive), newest-first
  listMessages: (outingId: string, limit: number, cursor?: string) =>
    prisma.chatMessage.findMany({
      where: {
        outingId,
        ...(cursor ? { id: { lt: cursor } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    }),

  createMessage: (outingId: string, userId: string, body: string) =>
    prisma.chatMessage.create({
      data: { outingId, userId, body },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    }),

  findById: (id: string) => prisma.chatMessage.findUnique({ where: { id } }),

  editMessage: (id: string, body: string) =>
    prisma.chatMessage.update({
      where: { id },
      data: { body, editedAt: new Date() },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    }),

  deleteMessage: (id: string) => prisma.chatMessage.delete({ where: { id } }),
}
```

**Step 2: Verify** — `npm run typecheck --workspace=apps/api` passes.

**Step 3: Commit**

```bash
git add apps/api/src/repositories/chat.repository.ts
git commit -m "feat(api): add ChatRepository"
```

---

## Task 5: Chat REST API — failing tests

**Type:** TDD — write failing tests first.

**Files:**

- Create: `apps/api/tests/routes/chat.test.ts`

**Step 1: Write failing tests**

```typescript
import request from 'supertest'
import { app } from '../../src/app'
import { prisma } from '../../src/lib/prisma'

const DOMAIN = '@gather-chat-test.com'
const uid = () => Math.random().toString(36).slice(2, 10)
const email = (label: string) => `test-chat-${label}-${uid()}${DOMAIN}`

async function createTestUser(label: string) {
  const e = email(label)
  const res = await request(app)
    .post('/auth/register')
    .send({ email: e, password: 'Password123!', name: `User ${label}` })
  return { userId: res.body.user.id, token: res.body.accessToken }
}

async function createTestGroup(token: string) {
  const res = await request(app)
    .post('/api/groups')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Chat Test Group' })
  return res.body.id as string
}

async function createTestOuting(token: string, groupId: string) {
  const res = await request(app)
    .post(`/api/groups/${groupId}/outings`)
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Chat Outing' })
  return res.body.id as string
}

afterAll(async () => {
  const users = await prisma.user.findMany({
    where: { email: { contains: DOMAIN } },
    select: { id: true },
  })
  const ids = users.map(u => u.id)
  await prisma.group.deleteMany({ where: { createdBy: { in: ids } } })
  await prisma.user.deleteMany({ where: { id: { in: ids } } })
  await prisma.$disconnect()
})

// ─── POST /api/outings/:id/messages ────────────────────────────────────────

describe('POST /api/outings/:id/messages', () => {
  it('201 — sends message, returns message with user', async () => {
    const { token } = await createTestUser('send')
    const groupId = await createTestGroup(token)
    const outingId = await createTestOuting(token, groupId)

    const res = await request(app)
      .post(`/api/outings/${outingId}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'Hello everyone!' })

    expect(res.status).toBe(201)
    expect(res.body.body).toBe('Hello everyone!')
    expect(res.body.user).toHaveProperty('name')
    expect(res.body.outingId).toBe(outingId)
  })

  it('401 — no auth', async () => {
    const res = await request(app).post('/api/outings/fake/messages').send({ body: 'x' })
    expect(res.status).toBe(401)
  })

  it('400 — empty body rejected', async () => {
    const { token } = await createTestUser('send-bad')
    const groupId = await createTestGroup(token)
    const outingId = await createTestOuting(token, groupId)

    const res = await request(app)
      .post(`/api/outings/${outingId}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body: '' })

    expect(res.status).toBe(400)
  })

  it('403 — non-member cannot send', async () => {
    const { token: adminToken } = await createTestUser('send-admin')
    const { token: otherToken } = await createTestUser('send-other')
    const groupId = await createTestGroup(adminToken)
    const outingId = await createTestOuting(adminToken, groupId)

    const res = await request(app)
      .post(`/api/outings/${outingId}/messages`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ body: 'Sneaky message' })

    expect(res.status).toBe(403)
  })
})

// ─── GET /api/outings/:id/messages ─────────────────────────────────────────

describe('GET /api/outings/:id/messages', () => {
  it('200 — returns messages with nextCursor', async () => {
    const { token } = await createTestUser('list-msg')
    const groupId = await createTestGroup(token)
    const outingId = await createTestOuting(token, groupId)

    await request(app)
      .post(`/api/outings/${outingId}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'First message' })

    const res = await request(app)
      .get(`/api/outings/${outingId}/messages`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.messages)).toBe(true)
    expect(res.body.messages.length).toBeGreaterThan(0)
    expect(res.body).toHaveProperty('nextCursor')
  })

  it('403 — non-member cannot list', async () => {
    const { token: adminToken } = await createTestUser('list-admin')
    const { token: otherToken } = await createTestUser('list-other')
    const groupId = await createTestGroup(adminToken)
    const outingId = await createTestOuting(adminToken, groupId)

    const res = await request(app)
      .get(`/api/outings/${outingId}/messages`)
      .set('Authorization', `Bearer ${otherToken}`)

    expect(res.status).toBe(403)
  })
})

// ─── PATCH /api/outings/:id/messages/:messageId ────────────────────────────

describe('PATCH /api/outings/:id/messages/:messageId', () => {
  it('200 — author can edit own message', async () => {
    const { token } = await createTestUser('edit')
    const groupId = await createTestGroup(token)
    const outingId = await createTestOuting(token, groupId)
    const sendRes = await request(app)
      .post(`/api/outings/${outingId}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'Original' })
    const messageId = sendRes.body.id

    const res = await request(app)
      .patch(`/api/outings/${outingId}/messages/${messageId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'Edited' })

    expect(res.status).toBe(200)
    expect(res.body.body).toBe('Edited')
    expect(res.body.editedAt).toBeTruthy()
  })

  it("403 — another member cannot edit someone else's message", async () => {
    const { token: adminToken } = await createTestUser('edit-admin')
    const groupId = await createTestGroup(adminToken)
    const outingId = await createTestOuting(adminToken, groupId)
    const sendRes = await request(app)
      .post(`/api/outings/${outingId}/messages`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ body: 'Admin message' })
    const messageId = sendRes.body.id

    // Register second user and add to group via invite
    const { userId: otherId, token: otherToken } = await createTestUser('edit-other')
    const inviteRes = await request(app)
      .post(`/api/groups/${groupId}/invite`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: (await prisma.user.findUnique({ where: { id: otherId }, select: { email: true } }))!
          .email,
        role: 'member',
      })
    await request(app)
      .post('/api/groups/accept-invite')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ token: inviteRes.body.token })

    const res = await request(app)
      .patch(`/api/outings/${outingId}/messages/${messageId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ body: 'Hacked!' })

    expect(res.status).toBe(403)
  })
})

// ─── DELETE /api/outings/:id/messages/:messageId ───────────────────────────

describe('DELETE /api/outings/:id/messages/:messageId', () => {
  it('204 — author can delete own message', async () => {
    const { token } = await createTestUser('delete')
    const groupId = await createTestGroup(token)
    const outingId = await createTestOuting(token, groupId)
    const sendRes = await request(app)
      .post(`/api/outings/${outingId}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'Delete me' })

    const res = await request(app)
      .delete(`/api/outings/${outingId}/messages/${sendRes.body.id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(204)
  })
})
```

**Step 2: Run — verify fails**

```bash
npm test --workspace=apps/api -- --testPathPattern=chat
```

Expected: FAIL — routes not registered yet.

---

## Task 6: Chat controller + routes + registration

**Type:** TDD — make Task 5 tests pass.

**Files:**

- Create: `apps/api/src/controllers/chat.controller.ts`
- Create: `apps/api/src/routes/chat.ts`
- Modify: `apps/api/src/app.ts`

**Step 1: Create controller**

```typescript
// apps/api/src/controllers/chat.controller.ts
import { Request, Response } from 'express'
import { SendMessageSchema, EditMessageSchema } from '@gather/shared'
import { AuthRequest } from '../middleware/auth'
import { ChatRepository } from '../repositories/chat.repository'
import { OutingRepository } from '../repositories/outing.repository'

const DEFAULT_LIMIT = 30

async function assertMembership(userId: string, outingId: string, res: Response) {
  const outing = await OutingRepository.findByIdWithGroup(outingId)
  if (!outing) {
    res.status(404).json({ error: 'Outing not found' })
    return null
  }
  const isMember = outing.group.members.some(m => m.userId === userId)
  if (!isMember) {
    res.status(403).json({ error: 'Forbidden' })
    return null
  }
  return outing
}

export async function listMessages(req: Request, res: Response) {
  const { userId } = req as AuthRequest
  const { id: outingId } = req.params
  const cursor = req.query.cursor as string | undefined
  const limit = Math.min(Number(req.query.limit ?? DEFAULT_LIMIT), 100)

  const outing = await assertMembership(userId, outingId, res)
  if (!outing) return

  const messages = await ChatRepository.listMessages(outingId, limit + 1, cursor)
  const hasMore = messages.length > limit
  const page = hasMore ? messages.slice(0, limit) : messages
  const nextCursor = hasMore ? page[page.length - 1].id : null

  return res.json({ messages: page, nextCursor })
}

export async function sendMessage(req: Request, res: Response) {
  const { userId } = req as AuthRequest
  const { id: outingId } = req.params

  const outing = await assertMembership(userId, outingId, res)
  if (!outing) return

  const parsed = SendMessageSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const message = await ChatRepository.createMessage(outingId, userId, parsed.data.body)

  // Emit to Socket.IO room — import lazily to avoid circular dependency at startup
  try {
    const { getIo } = await import('../socket/index')
    getIo().to(`outing:${outingId}`).emit('chat:message', message)
  } catch {
    // Socket not initialized in test environment — skip emit
  }

  return res.status(201).json(message)
}

export async function editMessage(req: Request, res: Response) {
  const { userId } = req as AuthRequest
  const { id: outingId, messageId } = req.params

  const outing = await assertMembership(userId, outingId, res)
  if (!outing) return

  const existing = await ChatRepository.findById(messageId)
  if (!existing) return res.status(404).json({ error: 'Message not found' })
  if (existing.userId !== userId) return res.status(403).json({ error: 'Forbidden' })

  const parsed = EditMessageSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const message = await ChatRepository.editMessage(messageId, parsed.data.body)

  try {
    const { getIo } = await import('../socket/index')
    getIo().to(`outing:${outingId}`).emit('chat:message:edited', {
      messageId,
      newBody: message.body,
      editedAt: message.editedAt,
    })
  } catch {
    // Socket not initialized in test environment — skip emit
  }

  return res.json(message)
}

export async function deleteMessage(req: Request, res: Response) {
  const { userId } = req as AuthRequest
  const { id: outingId, messageId } = req.params

  const outing = await assertMembership(userId, outingId, res)
  if (!outing) return

  const existing = await ChatRepository.findById(messageId)
  if (!existing) return res.status(404).json({ error: 'Message not found' })
  if (existing.userId !== userId) return res.status(403).json({ error: 'Forbidden' })

  await ChatRepository.deleteMessage(messageId)
  return res.status(204).send()
}
```

**Step 2: Create route file**

```typescript
// apps/api/src/routes/chat.ts
/**
 * @openapi
 * tags:
 *   name: Chat
 *   description: Per-outing chat messages
 */
import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import * as ChatController from '../controllers/chat.controller'

export const chatRouter = Router()

chatRouter.use(requireAuth)

/**
 * @openapi
 * /api/outings/{id}/messages:
 *   get:
 *     tags: [Chat]
 *     summary: List messages (cursor pagination, newest-first)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 30 }
 *     responses:
 *       200:
 *         description: Messages page
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages: { type: array }
 *                 nextCursor: { type: string, nullable: true }
 */
chatRouter.get('/outings/:id/messages', ChatController.listMessages)

/**
 * @openapi
 * /api/outings/{id}/messages:
 *   post:
 *     tags: [Chat]
 *     summary: Send a message (persists + emits socket event)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [body]
 *             properties:
 *               body: { type: string, maxLength: 2000 }
 *     responses:
 *       201: { description: Message created and emitted }
 *       400: { description: Validation error }
 *       403: { description: Not a group member }
 */
chatRouter.post('/outings/:id/messages', ChatController.sendMessage)

/**
 * @openapi
 * /api/outings/{id}/messages/{messageId}:
 *   patch:
 *     tags: [Chat]
 *     summary: Edit own message
 *     security:
 *       - bearerAuth: []
 */
chatRouter.patch('/outings/:id/messages/:messageId', ChatController.editMessage)

/**
 * @openapi
 * /api/outings/{id}/messages/{messageId}:
 *   delete:
 *     tags: [Chat]
 *     summary: Delete own message
 *     security:
 *       - bearerAuth: []
 */
chatRouter.delete('/outings/:id/messages/:messageId', ChatController.deleteMessage)
```

**Step 3: Register in app.ts**

Add import at top of `apps/api/src/app.ts`:

```typescript
import { chatRouter } from './routes/chat'
```

Add after `app.use('/api', outingsRouter)`:

```typescript
app.use('/api', chatRouter)
```

**Step 4: Run tests — verify pass**

```bash
npm test --workspace=apps/api -- --testPathPattern=chat
```

Expected: all chat tests PASS.

**Step 5: Run all API tests to catch regressions**

```bash
npm test --workspace=apps/api
```

Expected: all tests PASS.

**Step 6: Commit**

```bash
git add apps/api/src/controllers/chat.controller.ts apps/api/src/routes/chat.ts apps/api/src/app.ts apps/api/tests/routes/chat.test.ts
git commit -m "feat(api): add Chat REST API (PBI-4.1)"
```

---

## Task 7: Socket.IO — io singleton export + chat handler

**Type:** non-TDD — Socket.IO wiring; integration tested manually in Task 13.

**Files:**

- Modify: `apps/api/src/socket/index.ts`
- Create: `apps/api/src/socket/chatHandler.ts`

**Step 1: Export `getIo()` from socket index**

Replace full content of `apps/api/src/socket/index.ts`:

```typescript
import { Server } from 'socket.io'
import type { Server as HttpServer } from 'http'
import { verifyAccessToken } from '../lib/jwt'
import { registerChatHandler } from './chatHandler'

type AuthSocket = Parameters<Parameters<Server['on']>[1]>[0] & { userId: string }

let ioInstance: Server | null = null

export function getIo(): Server {
  if (!ioInstance) throw new Error('Socket.IO not initialized')
  return ioInstance
}

export function initSocket(server: HttpServer): void {
  ioInstance = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
      credentials: true,
    },
  })

  ioInstance.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined
    if (!token) return next(new Error('Authentication required'))
    try {
      const payload = verifyAccessToken(token)
      ;(socket as AuthSocket).userId = payload.userId
      next()
    } catch {
      next(new Error('Invalid or expired token'))
    }
  })

  ioInstance.on('connection', socket => {
    const userId = (socket as AuthSocket).userId
    registerChatHandler(ioInstance!, socket as AuthSocket)

    socket.on('disconnect', () => {
      // Presence cleanup (PBI-4.7)
    })
  })
}
```

**Step 2: Create chat handler**

```typescript
// apps/api/src/socket/chatHandler.ts
import type { Server, Socket } from 'socket.io'
import { OutingRepository } from '../repositories/outing.repository'

type AuthSocket = Socket & { userId: string }

export function registerChatHandler(io: Server, socket: AuthSocket): void {
  socket.on('outing:join', async ({ outingId }: { outingId: string }) => {
    const outing = await OutingRepository.findByIdWithGroup(outingId)
    if (!outing) return

    const isMember = outing.group.members.some(m => m.userId === socket.userId)
    if (!isMember) return

    socket.join(`outing:${outingId}`)
  })

  socket.on('outing:leave', ({ outingId }: { outingId: string }) => {
    socket.leave(`outing:${outingId}`)
  })
}
```

**Step 3: Verify typecheck**

```bash
npm run typecheck --workspace=apps/api
```

Expected: no errors.

**Step 4: Commit**

```bash
git add apps/api/src/socket/index.ts apps/api/src/socket/chatHandler.ts
git commit -m "feat(api): Socket.IO rooms + chat handler (PBI-4.2)"
```

---

## Task 8: Frontend — update socket.ts to pass auth token

**Type:** non-TDD — socket singleton initialization.

**Files:**

- Modify: `apps/web/src/lib/socket.ts`

**Step 1: Update to accept token**

Replace full content of `apps/web/src/lib/socket.ts`:

```typescript
import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:4000', {
      withCredentials: true,
      autoConnect: false,
    })
  }
  return socket
}

export function connectSocket(token: string): void {
  const s = getSocket()
  s.auth = { token }
  if (!s.connected) s.connect()
}

export function disconnectSocket(): void {
  socket?.disconnect()
  socket = null
}
```

**Step 2: Call connectSocket after login** — in `apps/web/src/lib/axios.ts`, the silent refresh interceptor already sets `accessToken` in authStore. We need to call `connectSocket` when the user's access token is set.

The cleanest place is `AppLayout.tsx` — connect on mount when user is authenticated, disconnect on unmount.

Modify `apps/web/src/layouts/AppLayout.tsx` to add socket lifecycle:

```typescript
// Add these imports at the top:
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { connectSocket, disconnectSocket } from '@/lib/socket'

// Inside the component, before the return:
const accessToken = useAuthStore(s => s.accessToken)

useEffect(() => {
  if (accessToken) {
    connectSocket(accessToken)
  }
  return () => {
    disconnectSocket()
  }
}, [accessToken])
```

**Step 3: Commit**

```bash
git add apps/web/src/lib/socket.ts apps/web/src/layouts/AppLayout.tsx
git commit -m "feat(web): socket connects with auth token on app mount"
```

---

## Task 9: Frontend — Outings API client + hooks

**Type:** non-TDD — API integration layer.

**Files:**

- Create: `apps/web/src/api/outings.ts`
- Create: `apps/web/src/hooks/useOutings.ts`

**Step 1: API client**

```typescript
// apps/web/src/api/outings.ts
import { api } from '@/lib/axios'
import type { CreateOutingInput } from '@gather/shared'

export interface Outing {
  id: string
  groupId: string
  title: string
  description: string | null
  status: string
  createdBy: string
  createdAt: string
}

export async function listOutings(groupId: string): Promise<Outing[]> {
  const res = await api.get<Outing[]>(`/api/groups/${groupId}/outings`)
  return res.data
}

export async function createOuting(groupId: string, data: CreateOutingInput): Promise<Outing> {
  const res = await api.post<Outing>(`/api/groups/${groupId}/outings`, data)
  return res.data
}

export async function getOuting(outingId: string): Promise<Outing> {
  const res = await api.get<Outing>(`/api/outings/${outingId}`)
  return res.data
}
```

**Step 2: TanStack Query hooks**

```typescript
// apps/web/src/hooks/useOutings.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateOutingInput } from '@gather/shared'
import { listOutings, createOuting, getOuting } from '@/api/outings'

export function useOutings(groupId: string) {
  return useQuery({
    queryKey: ['outings', groupId],
    queryFn: () => listOutings(groupId),
  })
}

export function useOuting(outingId: string) {
  return useQuery({
    queryKey: ['outing', outingId],
    queryFn: () => getOuting(outingId),
  })
}

export function useCreateOuting(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateOutingInput) => createOuting(groupId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['outings', groupId] }),
  })
}
```

**Step 3: Commit**

```bash
git add apps/web/src/api/outings.ts apps/web/src/hooks/useOutings.ts
git commit -m "feat(web): Outings API client and TanStack Query hooks"
```

---

## Task 10: Frontend — GroupDetailPage + CreateOutingModal

**Type:** non-TDD — UI component.

**Files:**

- Create: `apps/web/src/pages/groups/GroupDetailPage.tsx`
- Create: `apps/web/src/components/outings/CreateOutingModal.tsx`
- Modify: `apps/web/src/routes/groupRoutes.tsx`

**Step 1: CreateOutingModal**

```typescript
// apps/web/src/components/outings/CreateOutingModal.tsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateOutingSchema, type CreateOutingInput } from '@gather/shared'
import { useCreateOuting } from '@/hooks/useOutings'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Plus } from 'lucide-react'

export function CreateOutingModal({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false)
  const { mutate, isPending } = useCreateOuting(groupId)

  const form = useForm<CreateOutingInput>({
    resolver: zodResolver(CreateOutingSchema),
    defaultValues: { title: '', description: '' },
  })

  function onSubmit(data: CreateOutingInput) {
    mutate(data, {
      onSuccess: () => {
        form.reset()
        setOpen(false)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New outing
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create outing</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Pizza night" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="What's the plan?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 2: GroupDetailPage**

```typescript
// apps/web/src/pages/groups/GroupDetailPage.tsx
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { useOutings } from '@/hooks/useOutings'
import { CreateOutingModal } from '@/components/outings/CreateOutingModal'
import { Users, CalendarDays } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface GroupDetail {
  id: string
  name: string
  description: string | null
  members: { userId: string; role: string; user: { id: string; name: string; email: string } }[]
}

function useGroupDetail(id: string) {
  return useQuery({
    queryKey: ['group', id],
    queryFn: async () => {
      const res = await api.get<GroupDetail>(`/api/groups/${id}`)
      return res.data
    },
  })
}

export default function GroupDetailPage() {
  const { id = '' } = useParams()
  const { data: group, isLoading: groupLoading } = useGroupDetail(id)
  const { data: outings, isLoading: outingsLoading } = useOutings(id)

  if (groupLoading) return <p className="text-muted-foreground">Loading…</p>
  if (!group) return <p className="text-destructive">Group not found.</p>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{group.name}</h1>
        {group.description && <p className="text-muted-foreground mt-1">{group.description}</p>}
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> Outings
          </h2>
          <CreateOutingModal groupId={id} />
        </div>

        {outingsLoading && <p className="text-muted-foreground text-sm">Loading outings…</p>}

        {outings && outings.length === 0 && (
          <p className="text-muted-foreground text-sm">No outings yet. Create one!</p>
        )}

        {outings && outings.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {outings.map(outing => (
              <Link key={outing.id} to={`/outings/${outing.id}`}>
                <Card className="p-4 hover:border-primary/50 transition-colors">
                  <CardHeader className="p-0">
                    <CardTitle className="text-base">{outing.title}</CardTitle>
                    {outing.description && (
                      <CardDescription className="line-clamp-2">{outing.description}</CardDescription>
                    )}
                  </CardHeader>
                  <p className="text-xs text-muted-foreground mt-2 capitalize">{outing.status}</p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Users className="h-4 w-4" /> Members ({group.members.length})
        </h2>
        <ul className="space-y-2">
          {group.members.map(m => (
            <li key={m.userId} className="flex items-center justify-between text-sm">
              <span>{m.user.name}</span>
              <span className="text-muted-foreground capitalize">{m.role}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
```

**Step 3: Add route**

Replace full content of `apps/web/src/routes/groupRoutes.tsx`:

```typescript
import { Route } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import GroupListPage from '@/pages/groups/GroupListPage'
import GroupDetailPage from '@/pages/groups/GroupDetailPage'

export const groupRoutes = (
  <Route element={<AppLayout />}>
    <Route path="/groups" element={<GroupListPage />} />
    <Route path="/groups/:id" element={<GroupDetailPage />} />
  </Route>
)
```

**Step 4: Commit**

```bash
git add apps/web/src/pages/groups/GroupDetailPage.tsx apps/web/src/components/outings/CreateOutingModal.tsx apps/web/src/routes/groupRoutes.tsx
git commit -m "feat(web): GroupDetailPage with outing list and create modal (PBI-2.2 minimal)"
```

---

## Task 11: Frontend — Chat API client + hooks

**Type:** non-TDD — API integration layer.

**Files:**

- Create: `apps/web/src/api/chat.ts`
- Create: `apps/web/src/hooks/useMessages.ts`

**Step 1: API client**

```typescript
// apps/web/src/api/chat.ts
import { api } from '@/lib/axios'
import type { SendMessageInput, EditMessageInput } from '@gather/shared'

export interface ChatMessage {
  id: string
  outingId: string
  userId: string
  body: string
  createdAt: string
  editedAt: string | null
  user: { id: string; name: string; avatarUrl: string | null }
}

export interface MessagesPage {
  messages: ChatMessage[]
  nextCursor: string | null
}

export async function fetchMessages(outingId: string, cursor?: string): Promise<MessagesPage> {
  const params = new URLSearchParams({ limit: '30' })
  if (cursor) params.set('cursor', cursor)
  const res = await api.get<MessagesPage>(`/api/outings/${outingId}/messages?${params}`)
  return res.data
}

export async function sendMessage(outingId: string, data: SendMessageInput): Promise<ChatMessage> {
  const res = await api.post<ChatMessage>(`/api/outings/${outingId}/messages`, data)
  return res.data
}

export async function editMessage(
  outingId: string,
  messageId: string,
  data: EditMessageInput
): Promise<ChatMessage> {
  const res = await api.patch<ChatMessage>(`/api/outings/${outingId}/messages/${messageId}`, data)
  return res.data
}

export async function deleteMessage(outingId: string, messageId: string): Promise<void> {
  await api.delete(`/api/outings/${outingId}/messages/${messageId}`)
}
```

**Step 2: TanStack Query hook (infinite scroll)**

```typescript
// apps/web/src/hooks/useMessages.ts
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { fetchMessages, type ChatMessage } from '@/api/chat'

export function useMessages(outingId: string) {
  return useInfiniteQuery({
    queryKey: ['messages', outingId],
    queryFn: ({ pageParam }) => fetchMessages(outingId, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
  })
}

export function useAddMessageToCache(outingId: string) {
  const queryClient = useQueryClient()
  return (message: ChatMessage) => {
    queryClient.setQueryData<ReturnType<typeof useMessages>['data']>(
      ['messages', outingId],
      old => {
        if (!old) return old
        const firstPage = old.pages[0]
        return {
          ...old,
          pages: [
            { ...firstPage, messages: [message, ...firstPage.messages] },
            ...old.pages.slice(1),
          ],
        }
      }
    )
  }
}
```

**Step 3: Commit**

```bash
git add apps/web/src/api/chat.ts apps/web/src/hooks/useMessages.ts
git commit -m "feat(web): chat API client and useMessages infinite query hook"
```

---

## Task 12: Frontend — useChatRoom Socket.IO hook

**Type:** non-TDD — Socket.IO lifecycle hook.

**Files:**

- Create: `apps/web/src/hooks/useChatRoom.ts`

**Step 1: Create hook**

```typescript
// apps/web/src/hooks/useChatRoom.ts
import { useEffect } from 'react'
import { getSocket } from '@/lib/socket'
import { useAddMessageToCache } from '@/hooks/useMessages'
import type { ChatMessage } from '@/api/chat'

export function useChatRoom(outingId: string) {
  const addToCache = useAddMessageToCache(outingId)

  useEffect(() => {
    const socket = getSocket()

    socket.emit('outing:join', { outingId })

    function onMessage(message: ChatMessage) {
      addToCache(message)
    }

    socket.on('chat:message', onMessage)

    return () => {
      socket.off('chat:message', onMessage)
      socket.emit('outing:leave', { outingId })
    }
  }, [outingId])
}
```

**Step 2: Commit**

```bash
git add apps/web/src/hooks/useChatRoom.ts
git commit -m "feat(web): useChatRoom Socket.IO hook (PBI-4.2)"
```

---

## Task 13: Frontend — ChatWindow + Message components

**Type:** non-TDD — UI components.

**Files:**

- Create: `apps/web/src/components/chat/Message.tsx`
- Create: `apps/web/src/components/chat/ChatWindow.tsx`

**Step 1: Message component**

```typescript
// apps/web/src/components/chat/Message.tsx
import type { ChatMessage } from '@/api/chat'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function Message({ message }: { message: ChatMessage }) {
  const currentUserId = useAuthStore(s => s.user?.id)
  const isOwn = message.userId === currentUserId

  return (
    <div className={cn('flex gap-2', isOwn && 'flex-row-reverse')}>
      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
        {message.user.name[0].toUpperCase()}
      </div>
      <div className={cn('max-w-[70%] space-y-1', isOwn && 'items-end flex flex-col')}>
        <div className={cn('flex items-baseline gap-2', isOwn && 'flex-row-reverse')}>
          <span className="text-xs font-medium">{message.user.name}</span>
          <span className="text-xs text-muted-foreground">{formatTime(message.createdAt)}</span>
          {message.editedAt && <span className="text-xs text-muted-foreground">(edited)</span>}
        </div>
        <div
          className={cn(
            'rounded-lg px-3 py-2 text-sm',
            isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'
          )}
        >
          {message.body}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: ChatWindow component**

```typescript
// apps/web/src/components/chat/ChatWindow.tsx
import { useRef, useEffect, FormEvent, useState } from 'react'
import { useMessages } from '@/hooks/useMessages'
import { useChatRoom } from '@/hooks/useChatRoom'
import { sendMessage } from '@/api/chat'
import { Message } from './Message'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { SendHorizonal } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

export function ChatWindow({ outingId }: { outingId: string }) {
  useChatRoom(outingId)
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useMessages(outingId)
  const queryClient = useQueryClient()
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Flatten pages (newest-first per page) → reverse for display (oldest-first)
  const messages = (data?.pages ?? [])
    .flatMap(p => p.messages)
    .reverse()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!body.trim() || sending) return
    setSending(true)
    try {
      // REST call persists + server emits socket event; our useChatRoom hook receives it
      // and adds to cache, so no manual cache update needed here
      await sendMessage(outingId, { body: body.trim() })
      setBody('')
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as FormEvent)
    }
  }

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {hasNextPage && (
          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? 'Loading…' : 'Load earlier messages'}
            </Button>
          </div>
        )}

        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            No messages yet. Say hello!
          </p>
        )}

        {messages.map(msg => (
          <Message key={msg.id} message={msg} />
        ))}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t p-3 flex gap-2 items-end">
        <Textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message… (Enter to send, Shift+Enter for new line)"
          className="resize-none min-h-[40px] max-h-[120px]"
          rows={1}
        />
        <Button type="submit" size="icon" disabled={!body.trim() || sending}>
          <SendHorizonal className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add apps/web/src/components/chat/Message.tsx apps/web/src/components/chat/ChatWindow.tsx
git commit -m "feat(web): ChatWindow and Message components (PBI-4.3)"
```

---

## Task 14: Frontend — OutingDetailPage + route

**Type:** non-TDD — wires ChatWindow into a page and adds route.

**Files:**

- Create: `apps/web/src/pages/outings/OutingDetailPage.tsx`
- Modify: `apps/web/src/routes/groupRoutes.tsx`

**Step 1: OutingDetailPage**

```typescript
// apps/web/src/pages/outings/OutingDetailPage.tsx
import { useParams } from 'react-router-dom'
import { useOuting } from '@/hooks/useOutings'
import { ChatWindow } from '@/components/chat/ChatWindow'

export default function OutingDetailPage() {
  const { id = '' } = useParams()
  const { data: outing, isLoading } = useOuting(id)

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>
  if (!outing) return <p className="text-destructive">Outing not found.</p>

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-4">
      <div>
        <h1 className="text-2xl font-bold">{outing.title}</h1>
        {outing.description && (
          <p className="text-muted-foreground mt-1">{outing.description}</p>
        )}
        <span className="text-xs text-muted-foreground capitalize">Status: {outing.status}</span>
      </div>
      <ChatWindow outingId={id} />
    </div>
  )
}
```

**Step 2: Add outing route to groupRoutes.tsx**

Replace full content of `apps/web/src/routes/groupRoutes.tsx`:

```typescript
import { Route } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import GroupListPage from '@/pages/groups/GroupListPage'
import GroupDetailPage from '@/pages/groups/GroupDetailPage'
import OutingDetailPage from '@/pages/outings/OutingDetailPage'

export const groupRoutes = (
  <Route element={<AppLayout />}>
    <Route path="/groups" element={<GroupListPage />} />
    <Route path="/groups/:id" element={<GroupDetailPage />} />
    <Route path="/outings/:id" element={<OutingDetailPage />} />
  </Route>
)
```

**Step 3: Commit**

```bash
git add apps/web/src/pages/outings/OutingDetailPage.tsx apps/web/src/routes/groupRoutes.tsx
git commit -m "feat(web): OutingDetailPage with live chat (PBI-4.3)"
```

---

## Task 15: Manual verification

**Type:** non-TDD — smoke test the full flow.

**Step 1: Start dev servers**

```bash
npm run dev
```

**Step 2: Test the golden path**

1. Register two users in two different browser tabs (or one normal + one incognito).
2. User A creates a group → navigates to group detail page.
3. User A creates an outing.
4. User A navigates to the outing detail page — chat window is visible.
5. User B registers and (for now) cannot join without invite — invite User B from the group page using the existing `/api/groups/:id/invite` route tested via API, then `POST /api/groups/accept-invite` with the token. _(Full invite UI is PBI-2.3.)_
6. Open the outing detail page in both tabs.
7. User A sends a message — it appears instantly in User B's tab via Socket.IO without page refresh.
8. User B sends a reply — appears in User A's tab.
9. Reload the page — messages reload from the DB (REST history).

**Step 3: Verify no console errors**

Check browser devtools and API terminal for socket connection errors or 4xx/5xx responses.

---

## Task Dependencies

- Task 1: no dependencies
- Task 2: no dependencies (writes tests only)
- Task 3: depends on Task 1 (repository) and Task 2 (tests to make pass)
- Task 4: no dependencies
- Task 5: depends on Task 3 (needs outings routes for test helpers)
- Task 6: depends on Task 4 and Task 5
- Task 7: depends on Task 1 (OutingRepository used in chatHandler)
- Task 8: no dependencies
- Task 9: depends on Task 3 (Outings API must exist)
- Task 10: depends on Task 9
- Task 11: depends on Task 6 (Chat REST API must exist)
- Task 12: depends on Task 11 (useMessages cache mutation)
- Task 13: depends on Task 12
- Task 14: depends on Task 10, Task 13
- Task 15: depends on all tasks

Independent groups (can run in parallel):

- **Group A:** Tasks 1, 2, 4 (all repository/test setup, no dependencies)
- **Group B:** Task 3 (after Task 1+2), Task 7 (after Task 1)
- **Group C:** Task 5 (after Task 3), Task 8 (independent)
- **Group D:** Task 6 (after Task 4+5)
- **Group E:** Tasks 9, 11 (after Tasks 3 and 6 respectively)
- **Group F:** Task 10 (after 9), Task 12 (after 11)
- **Group G:** Task 13 (after 12), Task 14 waits for 10+13
- **Group H:** Task 15 (after all)
