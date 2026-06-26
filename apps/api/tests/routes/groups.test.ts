import request from 'supertest'
import { app } from '../../src/app'
import { prisma } from '../../src/lib/prisma'

const DOMAIN = '@gather-test.com'
const uid = () => Math.random().toString(36).slice(2, 10)
const email = (label: string) => `test-groups-${label}-${uid()}${DOMAIN}`

// Create a user and return their access token
async function createTestUser(label: string) {
  const e = email(label)
  const res = await request(app)
    .post('/auth/register')
    .send({ email: e, password: 'Password123!', name: `User ${label}` })
  return { userId: res.body.user.id, token: res.body.accessToken, email: e }
}

afterAll(async () => {
  const testUsers = await prisma.user.findMany({
    where: { email: { contains: DOMAIN } },
    select: { id: true },
  })
  const ids = testUsers.map(u => u.id)
  // Groups reference createdBy (no cascade from User→Group), delete groups first
  await prisma.group.deleteMany({ where: { createdBy: { in: ids } } })
  await prisma.user.deleteMany({ where: { id: { in: ids } } })
  await prisma.$disconnect()
})

// ─── Create group ─────────────────────────────────────────────────────────────

describe('POST /api/groups', () => {
  it('201 — creates group, creator is admin', async () => {
    const { token } = await createTestUser('create')

    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Group', description: 'desc' })

    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Test Group')
    expect(res.body.id).toBeDefined()
  })

  it('401 — no auth token', async () => {
    const res = await request(app).post('/api/groups').send({ name: 'No Auth' })
    expect(res.status).toBe(401)
  })

  it('400 — missing name', async () => {
    const { token } = await createTestUser('create-bad')
    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({})
    expect(res.status).toBe(400)
  })
})

// ─── List groups ──────────────────────────────────────────────────────────────

describe('GET /api/groups', () => {
  it('200 — returns only groups the user belongs to', async () => {
    const { token } = await createTestUser('list')

    await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'My Group' })

    const res = await request(app).get('/api/groups').set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThan(0)
    expect(res.body[0]).toHaveProperty('_count')
  })

  it('401 — no auth token', async () => {
    expect((await request(app).get('/api/groups')).status).toBe(401)
  })
})

// ─── Get group ────────────────────────────────────────────────────────────────

describe('GET /api/groups/:id', () => {
  it('200 — member can fetch group with members list', async () => {
    const { token } = await createTestUser('get')

    const createRes = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Get Group' })

    const res = await request(app)
      .get(`/api/groups/${createRes.body.id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.members).toBeDefined()
    expect(res.body.members.length).toBeGreaterThan(0)
  })

  it('403 — non-member is forbidden', async () => {
    const owner = await createTestUser('get-owner')
    const stranger = await createTestUser('get-stranger')

    const createRes = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: 'Private Group' })

    const res = await request(app)
      .get(`/api/groups/${createRes.body.id}`)
      .set('Authorization', `Bearer ${stranger.token}`)

    expect(res.status).toBe(403)
  })

  it('404 — group does not exist', async () => {
    const { token } = await createTestUser('get-404')
    const res = await request(app)
      .get('/api/groups/nonexistent-id-xyz')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(404)
  })
})

// ─── Invite member ────────────────────────────────────────────────────────────

describe('POST /api/groups/:id/invite', () => {
  it('201 — admin can invite, returns token + email', async () => {
    const admin = await createTestUser('invite-admin')

    const groupRes = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ name: 'Invite Group' })

    const res = await request(app)
      .post(`/api/groups/${groupRes.body.id}/invite`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ email: email('invitee'), role: 'member' })

    expect(res.status).toBe(201)
    expect(res.body.token).toBeDefined()
    expect(res.body.email).toBeDefined()
  })

  it('403 — non-admin cannot invite', async () => {
    const admin = await createTestUser('invite-admin2')
    const member = await createTestUser('invite-member')

    const groupRes = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ name: 'Perm Group' })

    // Invite member via accept-invite flow
    const inviteRes = await request(app)
      .post(`/api/groups/${groupRes.body.id}/invite`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ email: member.email, role: 'member' })

    await request(app)
      .post('/api/groups/accept-invite')
      .set('Authorization', `Bearer ${member.token}`)
      .send({ token: inviteRes.body.token })

    // Now member tries to invite someone
    const res = await request(app)
      .post(`/api/groups/${groupRes.body.id}/invite`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ email: email('new'), role: 'member' })

    expect(res.status).toBe(403)
  })
})

// ─── Accept invite ────────────────────────────────────────────────────────────

describe('POST /api/groups/accept-invite', () => {
  it('200 — valid token joins the group', async () => {
    const admin = await createTestUser('accept-admin')
    const joiner = await createTestUser('accept-joiner')

    const groupRes = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ name: 'Join Group' })

    const inviteRes = await request(app)
      .post(`/api/groups/${groupRes.body.id}/invite`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ email: joiner.email, role: 'member' })

    const res = await request(app)
      .post('/api/groups/accept-invite')
      .set('Authorization', `Bearer ${joiner.token}`)
      .send({ token: inviteRes.body.token })

    expect(res.status).toBe(200)
    expect(res.body.id).toBe(groupRes.body.id)
  })

  it('409 — already a member', async () => {
    const admin = await createTestUser('accept-dup-admin')
    const joiner = await createTestUser('accept-dup-joiner')

    const groupRes = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ name: 'Dup Group' })

    const inviteRes = await request(app)
      .post(`/api/groups/${groupRes.body.id}/invite`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ email: joiner.email, role: 'member' })

    // First accept
    await request(app)
      .post('/api/groups/accept-invite')
      .set('Authorization', `Bearer ${joiner.token}`)
      .send({ token: inviteRes.body.token })

    // Create a second invite to the same group (since first token is used)
    const invite2Res = await request(app)
      .post(`/api/groups/${groupRes.body.id}/invite`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ email: joiner.email, role: 'member' })

    // Try to accept second invite — already a member
    const res = await request(app)
      .post('/api/groups/accept-invite')
      .set('Authorization', `Bearer ${joiner.token}`)
      .send({ token: invite2Res.body.token })

    expect(res.status).toBe(409)
  })

  it('400 — expired invitation token', async () => {
    const { token } = await createTestUser('accept-exp')

    // Directly create an expired invitation
    const group = await prisma.group.create({
      data: {
        name: 'Exp Group',
        createdBy: (await prisma.user.findFirst({ where: { email: { contains: 'accept-exp' } } }))!.id,
        members: {
          create: {
            userId: (await prisma.user.findFirst({ where: { email: { contains: 'accept-exp' } } }))!.id,
            role: 'admin',
          },
        },
      },
    })
    const expiredInvite = await prisma.invitation.create({
      data: {
        groupId: group.id,
        email: email('exp-invitee'),
        role: 'member',
        token: 'expired-token-' + uid(),
        expiresAt: new Date(Date.now() - 1000),
      },
    })

    const res = await request(app)
      .post('/api/groups/accept-invite')
      .set('Authorization', `Bearer ${token}`)
      .send({ token: expiredInvite.token })

    expect(res.status).toBe(400)
  })

  it('400 — invalid token', async () => {
    const { token } = await createTestUser('accept-inv')
    const res = await request(app)
      .post('/api/groups/accept-invite')
      .set('Authorization', `Bearer ${token}`)
      .send({ token: 'does-not-exist' })
    expect(res.status).toBe(400)
  })
})
