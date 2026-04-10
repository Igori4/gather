import request from 'supertest'
import bcrypt from 'bcrypt'
import { app } from '../src/app'
import { prisma } from '../src/lib/prisma'

// Mock Prisma so tests never touch a real database
jest.mock('../src/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}))

// Cast to plain objects of mocks — avoids fighting TypeScript's PrismaClient types
const db = prisma as unknown as {
  user: Record<string, jest.Mock>
  refreshToken: Record<string, jest.Mock>
}

beforeAll(() => {
  process.env.JWT_SECRET = 'test-access-secret-32-chars-long!!'
  process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-32-chars-long!'
  process.env.JWT_EXPIRES_IN = '15m'
  process.env.REFRESH_TOKEN_EXPIRES_IN = '7d'
})

beforeEach(() => jest.clearAllMocks())

// ─── REGISTER ─────────────────────────────────────────────────────────────────

describe('POST /auth/register', () => {
  it('creates a user and returns 201 with accessToken', async () => {
    db.user.findUnique.mockResolvedValue(null)
    db.user.create.mockResolvedValue({
      id: 'u1',
      email: 'alice@example.com',
      name: 'Alice',
      avatarUrl: null,
    })
    db.refreshToken.create.mockResolvedValue({})

    const res = await request(app).post('/auth/register').send({
      email: 'alice@example.com',
      password: 'secret123',
      name: 'Alice',
    })

    expect(res.status).toBe(201)
    expect(res.body.accessToken).toBeDefined()
    expect(res.body.user.email).toBe('alice@example.com')
    expect(res.body.refreshToken).toBeUndefined() // must be in cookie, not body
  })

  it('returns 409 when email is already registered', async () => {
    db.user.findUnique.mockResolvedValue({ id: 'u1', email: 'alice@example.com' })

    const res = await request(app).post('/auth/register').send({
      email: 'alice@example.com',
      password: 'secret123',
      name: 'Alice',
    })

    expect(res.status).toBe(409)
    expect(db.user.create).not.toHaveBeenCalled()
  })

  it('returns 400 on invalid input (short password)', async () => {
    const res = await request(app).post('/auth/register').send({
      email: 'alice@example.com',
      password: 'short',
      name: 'Alice',
    })

    expect(res.status).toBe(400)
  })
})

// ─── LOGIN ────────────────────────────────────────────────────────────────────

describe('POST /auth/login', () => {
  it('returns 200 with accessToken on valid credentials', async () => {
    const hash = await bcrypt.hash('secret123', 10)
    db.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'alice@example.com',
      name: 'Alice',
      avatarUrl: null,
      passwordHash: hash,
    })
    db.refreshToken.create.mockResolvedValue({})

    const res = await request(app).post('/auth/login').send({
      email: 'alice@example.com',
      password: 'secret123',
    })

    expect(res.status).toBe(200)
    expect(res.body.accessToken).toBeDefined()
    expect(res.body.user.id).toBe('u1')
  })

  it('returns 401 on wrong password', async () => {
    const hash = await bcrypt.hash('correct', 10)
    db.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'alice@example.com',
      passwordHash: hash,
    })

    const res = await request(app).post('/auth/login').send({
      email: 'alice@example.com',
      password: 'wrong',
    })

    expect(res.status).toBe(401)
  })

  it('returns 401 when user does not exist', async () => {
    db.user.findUnique.mockResolvedValue(null)

    const res = await request(app).post('/auth/login').send({
      email: 'nobody@example.com',
      password: 'whatever',
    })

    expect(res.status).toBe(401)
  })
})

// ─── REFRESH ──────────────────────────────────────────────────────────────────

describe('POST /auth/refresh', () => {
  it('returns a new accessToken when refresh cookie is valid', async () => {
    const { signRefreshToken, hashToken } = await import('../src/lib/jwt')
    const refreshToken = signRefreshToken('u1')

    db.refreshToken.findFirst.mockResolvedValue({
      id: 'rt1',
      userId: 'u1',
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 60_000),
      revoked: false,
    })
    db.refreshToken.update.mockResolvedValue({})
    db.user.findUnique.mockResolvedValue({
      id: 'u1', email: 'alice@example.com', name: 'Alice', avatarUrl: null,
    })
    db.refreshToken.create.mockResolvedValue({})

    const res = await request(app)
      .post('/auth/refresh')
      .set('Cookie', `refreshToken=${refreshToken}`)

    expect(res.status).toBe(200)
    expect(res.body.accessToken).toBeDefined()
  })

  it('returns 401 when no cookie is present', async () => {
    const res = await request(app).post('/auth/refresh')
    expect(res.status).toBe(401)
  })

  it('returns 401 when token is not found in DB (revoked)', async () => {
    const { signRefreshToken } = await import('../src/lib/jwt')
    const refreshToken = signRefreshToken('u1')
    db.refreshToken.findFirst.mockResolvedValue(null)

    const res = await request(app)
      .post('/auth/refresh')
      .set('Cookie', `refreshToken=${refreshToken}`)

    expect(res.status).toBe(401)
  })
})

// ─── LOGOUT ───────────────────────────────────────────────────────────────────

describe('POST /auth/logout', () => {
  it('revokes refresh tokens and returns 204', async () => {
    const { signAccessToken } = await import('../src/lib/jwt')
    const accessToken = signAccessToken('u1')
    db.refreshToken.deleteMany.mockResolvedValue({ count: 1 })

    const res = await request(app)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(204)
    expect(db.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } })
  })

  it('returns 401 when no access token is provided', async () => {
    const res = await request(app).post('/auth/logout')
    expect(res.status).toBe(401)
  })
})

// ─── GET ME ───────────────────────────────────────────────────────────────────

describe('GET /auth/me', () => {
  it('returns the current user when authenticated', async () => {
    const { signAccessToken } = await import('../src/lib/jwt')
    const accessToken = signAccessToken('u1')
    db.user.findUnique.mockResolvedValue({
      id: 'u1', email: 'alice@example.com', name: 'Alice', avatarUrl: null,
    })

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.id).toBe('u1')
  })

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/auth/me')
    expect(res.status).toBe(401)
  })
})
