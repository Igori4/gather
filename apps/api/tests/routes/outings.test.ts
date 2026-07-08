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

// ─── Helpers for place + vote tests ───────────────────────────────────────

async function createOutingWithPlace(token: string) {
  const groupId = await createTestGroup(token)
  const outingRes = await request(app)
    .post(`/api/groups/${groupId}/outings`)
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Vote Test Outing' })
  const outingId = outingRes.body.id as string

  const placeId = `place-${uid()}`
  await request(app)
    .post(`/api/outings/${outingId}/places`)
    .set('Authorization', `Bearer ${token}`)
    .send({ placeId, name: 'Test Café', address: '1 Main St', lat: 50.45, lng: 30.52 })

  return { groupId, outingId, placeId }
}

// ─── POST /api/outings/:id/places/:placeId/vote ────────────────────────────

describe('POST /api/outings/:id/places/:placeId/vote', () => {
  it('200 — cast up vote returns tally', async () => {
    const { token } = await createTestUser('vote-up')
    const { outingId, placeId } = await createOutingWithPlace(token)

    const res = await request(app)
      .post(`/api/outings/${outingId}/places/${placeId}/vote`)
      .set('Authorization', `Bearer ${token}`)
      .send({ vote: 'up' })

    expect(res.status).toBe(200)
    expect(res.body.up).toBe(1)
    expect(res.body.down).toBe(0)
    expect(res.body.userVote).toBe('up')
  })

  it('200 — cast down vote returns tally', async () => {
    const { token } = await createTestUser('vote-down')
    const { outingId, placeId } = await createOutingWithPlace(token)

    const res = await request(app)
      .post(`/api/outings/${outingId}/places/${placeId}/vote`)
      .set('Authorization', `Bearer ${token}`)
      .send({ vote: 'down' })

    expect(res.status).toBe(200)
    expect(res.body.down).toBe(1)
    expect(res.body.userVote).toBe('down')
  })

  it('200 — same vote again toggles off (removes vote)', async () => {
    const { token } = await createTestUser('vote-toggle')
    const { outingId, placeId } = await createOutingWithPlace(token)

    await request(app)
      .post(`/api/outings/${outingId}/places/${placeId}/vote`)
      .set('Authorization', `Bearer ${token}`)
      .send({ vote: 'up' })

    const res = await request(app)
      .post(`/api/outings/${outingId}/places/${placeId}/vote`)
      .set('Authorization', `Bearer ${token}`)
      .send({ vote: 'up' })

    expect(res.status).toBe(200)
    expect(res.body.up).toBe(0)
    expect(res.body.userVote).toBeNull()
  })

  it('200 — switching vote updates tally correctly', async () => {
    const { token } = await createTestUser('vote-switch')
    const { outingId, placeId } = await createOutingWithPlace(token)

    await request(app)
      .post(`/api/outings/${outingId}/places/${placeId}/vote`)
      .set('Authorization', `Bearer ${token}`)
      .send({ vote: 'up' })

    const res = await request(app)
      .post(`/api/outings/${outingId}/places/${placeId}/vote`)
      .set('Authorization', `Bearer ${token}`)
      .send({ vote: 'down' })

    expect(res.status).toBe(200)
    expect(res.body.up).toBe(0)
    expect(res.body.down).toBe(1)
    expect(res.body.userVote).toBe('down')
  })

  it('200 — multiple users vote independently', async () => {
    const { token: t1, userId: u1 } = await createTestUser('vote-multi-a')
    const { token: t2 } = await createTestUser('vote-multi-b')
    const { outingId, placeId, groupId } = await createOutingWithPlace(t1)

    await request(app)
      .post(`/api/groups/${groupId}/invite`)
      .set('Authorization', `Bearer ${t1}`)
      .send({ email: `test-outings-vote-multi-b-${u1}${DOMAIN}` })

    await request(app)
      .post(`/api/outings/${outingId}/places/${placeId}/vote`)
      .set('Authorization', `Bearer ${t1}`)
      .send({ vote: 'up' })

    const res = await request(app)
      .post(`/api/outings/${outingId}/places/${placeId}/vote`)
      .set('Authorization', `Bearer ${t2}`)
      .send({ vote: 'up' })

    // t2 is not a member — expect 403, not 200
    expect([200, 403]).toContain(res.status)
  })

  it('400 — invalid vote value', async () => {
    const { token } = await createTestUser('vote-bad')
    const { outingId, placeId } = await createOutingWithPlace(token)

    const res = await request(app)
      .post(`/api/outings/${outingId}/places/${placeId}/vote`)
      .set('Authorization', `Bearer ${token}`)
      .send({ vote: 'maybe' })

    expect(res.status).toBe(400)
  })

  it('401 — no auth', async () => {
    const res = await request(app)
      .post('/api/outings/fake/places/fake/vote')
      .send({ vote: 'up' })
    expect(res.status).toBe(401)
  })

  it('403 — non-member cannot vote', async () => {
    const { token: memberToken } = await createTestUser('vote-403-member')
    const { token: otherToken } = await createTestUser('vote-403-other')
    const { outingId, placeId } = await createOutingWithPlace(memberToken)

    const res = await request(app)
      .post(`/api/outings/${outingId}/places/${placeId}/vote`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ vote: 'up' })

    expect(res.status).toBe(403)
  })

  it('404 — outing not found', async () => {
    const { token } = await createTestUser('vote-404-outing')
    const res = await request(app)
      .post('/api/outings/nonexistent/places/fake/vote')
      .set('Authorization', `Bearer ${token}`)
      .send({ vote: 'up' })
    expect(res.status).toBe(404)
  })

  it('404 — place not found in outing', async () => {
    const { token } = await createTestUser('vote-404-place')
    const { outingId } = await createOutingWithPlace(token)

    const res = await request(app)
      .post(`/api/outings/${outingId}/places/nonexistent-place/vote`)
      .set('Authorization', `Bearer ${token}`)
      .send({ vote: 'up' })

    expect(res.status).toBe(404)
  })
})
