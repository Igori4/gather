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
    const res = await request(app)
      .post('/api/groups/fake-id/outings')
      .send({ title: 'x' })
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
