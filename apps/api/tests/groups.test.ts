import request from 'supertest'
import { app } from '../src/app'
import { prisma } from '../src/lib/prisma'

jest.mock('../src/lib/prisma', () => ({
  prisma: {
    group: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    groupMember: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    invitation: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}))

const db = prisma as unknown as {
  group: Record<string, jest.Mock>
  groupMember: Record<string, jest.Mock>
  invitation: Record<string, jest.Mock>
}

beforeEach(() => jest.clearAllMocks())

beforeAll(() => {
  process.env.JWT_SECRET = 'test-access-secret-32-chars-long!!'
  process.env.JWT_EXPIRES_IN = '15m'
})

async function authHeader(userId = 'u1') {
  const { signAccessToken } = await import('../src/lib/jwt')
  return `Bearer ${signAccessToken(userId)}`
}

// ─── POST /api/groups ─────────────────────────────────────────────────────────

describe('POST /api/groups', () => {
  it('creates a group and returns 201', async () => {
    db.group.create.mockResolvedValue({
      id: 'g1',
      name: 'Weekend Crew',
      description: 'Our squad',
      coverImageUrl: null,
      createdBy: 'u1',
      createdAt: new Date().toISOString(),
    })

    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', await authHeader())
      .send({ name: 'Weekend Crew', description: 'Our squad' })

    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Weekend Crew')
    expect(res.body.id).toBeDefined()
  })

  it('returns 400 on invalid input (empty name)', async () => {
    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', await authHeader())
      .send({ name: '' })

    expect(res.status).toBe(400)
    expect(db.group.create).not.toHaveBeenCalled()
  })

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/groups').send({ name: 'Test' })
    expect(res.status).toBe(401)
  })
})

// ─── GET /api/groups ──────────────────────────────────────────────────────────

describe('GET /api/groups', () => {
  it('returns groups the user is a member of', async () => {
    db.group.findMany.mockResolvedValue([
      { id: 'g1', name: 'Weekend Crew', _count: { members: 3 } },
      { id: 'g2', name: 'Work Gang', _count: { members: 5 } },
    ])

    const res = await request(app)
      .get('/api/groups')
      .set('Authorization', await authHeader())

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(db.group.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { members: { some: { userId: 'u1' } } },
      })
    )
  })

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/groups')
    expect(res.status).toBe(401)
  })
})

// ─── GET /api/groups/:id ──────────────────────────────────────────────────────

describe('GET /api/groups/:id', () => {
  it('returns the group with members when user is a member', async () => {
    db.group.findUnique.mockResolvedValue({
      id: 'g1',
      name: 'Weekend Crew',
      members: [
        { userId: 'u1', role: 'admin', user: { id: 'u1', name: 'Alice', avatarUrl: null, email: 'alice@example.com' } },
      ],
    })

    const res = await request(app)
      .get('/api/groups/g1')
      .set('Authorization', await authHeader())

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Weekend Crew')
    expect(res.body.members).toHaveLength(1)
  })

  it('returns 404 when group does not exist', async () => {
    db.group.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .get('/api/groups/not-real')
      .set('Authorization', await authHeader())

    expect(res.status).toBe(404)
  })

  it('returns 403 when user is not a member', async () => {
    db.group.findUnique.mockResolvedValue({
      id: 'g1',
      name: 'Secret Club',
      members: [
        { userId: 'u99', role: 'admin', user: { id: 'u99', name: 'Bob', avatarUrl: null, email: 'bob@example.com' } },
      ],
    })

    const res = await request(app)
      .get('/api/groups/g1')
      .set('Authorization', await authHeader('u1'))

    expect(res.status).toBe(403)
  })
})

// ─── POST /api/groups/:id/invite ─────────────────────────────────────────────

describe('POST /api/groups/:id/invite', () => {
  it('creates an invitation when requester is admin', async () => {
    db.groupMember.findUnique.mockResolvedValue({ userId: 'u1', groupId: 'g1', role: 'admin' })
    db.invitation.create.mockResolvedValue({
      id: 'inv1',
      token: 'abc123token',
      email: 'bob@example.com',
    })

    const res = await request(app)
      .post('/api/groups/g1/invite')
      .set('Authorization', await authHeader())
      .send({ email: 'bob@example.com', role: 'member' })

    expect(res.status).toBe(201)
    expect(res.body.token).toBeDefined()
    expect(res.body.email).toBe('bob@example.com')
  })

  it('returns 403 when requester is not an admin', async () => {
    db.groupMember.findUnique.mockResolvedValue({ userId: 'u1', groupId: 'g1', role: 'member' })

    const res = await request(app)
      .post('/api/groups/g1/invite')
      .set('Authorization', await authHeader())
      .send({ email: 'bob@example.com' })

    expect(res.status).toBe(403)
    expect(db.invitation.create).not.toHaveBeenCalled()
  })

  it('returns 403 when requester is not a member at all', async () => {
    db.groupMember.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .post('/api/groups/g1/invite')
      .set('Authorization', await authHeader())
      .send({ email: 'bob@example.com' })

    expect(res.status).toBe(403)
  })

  it('returns 400 on invalid email', async () => {
    const res = await request(app)
      .post('/api/groups/g1/invite')
      .set('Authorization', await authHeader())
      .send({ email: 'not-an-email' })

    expect(res.status).toBe(400)
    expect(db.invitation.create).not.toHaveBeenCalled()
  })
})

// ─── POST /api/groups/accept-invite ──────────────────────────────────────────

describe('POST /api/groups/accept-invite', () => {
  it('joins the group and returns 200 with the group', async () => {
    db.invitation.findUnique.mockResolvedValue({
      id: 'inv1',
      groupId: 'g1',
      email: 'alice@example.com',
      role: 'member',
      token: 'validtoken',
      expiresAt: new Date(Date.now() + 60_000),
      acceptedAt: null,
    })
    db.groupMember.findUnique.mockResolvedValue(null) // not already a member
    db.groupMember.create.mockResolvedValue({})
    db.invitation.update.mockResolvedValue({})
    db.group.findUnique.mockResolvedValue({ id: 'g1', name: 'Weekend Crew' })

    const res = await request(app)
      .post('/api/groups/accept-invite')
      .set('Authorization', await authHeader())
      .send({ token: 'validtoken' })

    expect(res.status).toBe(200)
    expect(res.body.id).toBe('g1')
    expect(db.groupMember.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'u1', groupId: 'g1' }) })
    )
  })

  it('returns 400 when token is missing', async () => {
    const res = await request(app)
      .post('/api/groups/accept-invite')
      .set('Authorization', await authHeader())
      .send({})

    expect(res.status).toBe(400)
  })

  it('returns 400 when invitation is not found', async () => {
    db.invitation.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .post('/api/groups/accept-invite')
      .set('Authorization', await authHeader())
      .send({ token: 'bogus' })

    expect(res.status).toBe(400)
  })

  it('returns 400 when invitation is expired', async () => {
    db.invitation.findUnique.mockResolvedValue({
      id: 'inv1',
      groupId: 'g1',
      role: 'member',
      token: 'expiredtoken',
      expiresAt: new Date(Date.now() - 1000), // past
      acceptedAt: null,
    })

    const res = await request(app)
      .post('/api/groups/accept-invite')
      .set('Authorization', await authHeader())
      .send({ token: 'expiredtoken' })

    expect(res.status).toBe(400)
  })

  it('returns 409 when user is already a member', async () => {
    db.invitation.findUnique.mockResolvedValue({
      id: 'inv1',
      groupId: 'g1',
      role: 'member',
      token: 'validtoken',
      expiresAt: new Date(Date.now() + 60_000),
      acceptedAt: null,
    })
    db.groupMember.findUnique.mockResolvedValue({ userId: 'u1', groupId: 'g1', role: 'member' })

    const res = await request(app)
      .post('/api/groups/accept-invite')
      .set('Authorization', await authHeader())
      .send({ token: 'validtoken' })

    expect(res.status).toBe(409)
  })
})
