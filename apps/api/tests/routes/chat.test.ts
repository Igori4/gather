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
    const res = await request(app)
      .post('/api/outings/fake/messages')
      .send({ body: 'x' })
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

  it("403 — member cannot edit another member's message", async () => {
    const { token: adminToken } = await createTestUser('edit-admin')
    const groupId = await createTestGroup(adminToken)
    const outingId = await createTestOuting(adminToken, groupId)
    const sendRes = await request(app)
      .post(`/api/outings/${outingId}/messages`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ body: 'Admin message' })
    const messageId = sendRes.body.id

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
