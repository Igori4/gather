import request from 'supertest'
import { app } from '../../src/app'
import { prisma } from '../../src/lib/prisma'
import { hashToken } from '../../src/lib/jwt'

// Never send real emails in tests
jest.mock('../../src/lib/email', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}))

const DOMAIN = '@gather-test.com'
const uid = () => Math.random().toString(36).slice(2, 10)
const email = (label: string) => `test-auth-${label}-${uid()}${DOMAIN}`

afterAll(async () => {
  // RefreshToken + PasswordResetToken cascade-delete when User is deleted
  await prisma.user.deleteMany({ where: { email: { contains: DOMAIN } } })
  await prisma.$disconnect()
})

// ─── Register ────────────────────────────────────────────────────────────────

describe('POST /auth/register', () => {
  it('201 — creates user, returns accessToken + user', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: email('reg'), password: 'Password123!', name: 'Test User' })

    expect(res.status).toBe(201)
    expect(res.body.accessToken).toBeDefined()
    expect(res.body.user.email).toContain(DOMAIN)
    expect(res.body.user.passwordHash).toBeUndefined()
    expect(res.headers['set-cookie']).toBeDefined()
  })

  it('409 — duplicate email', async () => {
    const e = email('dup')
    await request(app)
      .post('/auth/register')
      .send({ email: e, password: 'Password123!', name: 'A' })
    const res = await request(app)
      .post('/auth/register')
      .send({ email: e, password: 'Password123!', name: 'B' })
    expect(res.status).toBe(409)
  })

  it('400 — missing required fields', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: email('bad') })
    expect(res.status).toBe(400)
  })

  it('400 — password too short', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: email('short'), password: '123', name: 'Test' })
    expect(res.status).toBe(400)
  })
})

// ─── Login ───────────────────────────────────────────────────────────────────

describe('POST /auth/login', () => {
  const e = email('login')
  const password = 'Password123!'

  beforeAll(async () => {
    await request(app).post('/auth/register').send({ email: e, password, name: 'Login User' })
  })

  it('200 — valid credentials return accessToken + cookie', async () => {
    const res = await request(app).post('/auth/login').send({ email: e, password })
    expect(res.status).toBe(200)
    expect(res.body.accessToken).toBeDefined()
    expect(res.headers['set-cookie']).toBeDefined()
  })

  it('401 — wrong password', async () => {
    const res = await request(app).post('/auth/login').send({ email: e, password: 'wrongpass' })
    expect(res.status).toBe(401)
  })

  it('401 — non-existent email', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: email('none'), password })
    expect(res.status).toBe(401)
  })
})

// ─── Refresh ─────────────────────────────────────────────────────────────────

describe('POST /auth/refresh', () => {
  it('200 — valid refresh cookie returns new accessToken', async () => {
    const registerRes = await request(app)
      .post('/auth/register')
      .send({ email: email('refresh'), password: 'Password123!', name: 'Refresh User' })

    const cookie = registerRes.headers['set-cookie'] as unknown as string[]

    const res = await request(app).post('/auth/refresh').set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body.accessToken).toBeDefined()
  })

  it('401 — no cookie', async () => {
    const res = await request(app).post('/auth/refresh')
    expect(res.status).toBe(401)
  })

  it('401 — cookie with invalid token', async () => {
    const res = await request(app).post('/auth/refresh').set('Cookie', ['refreshToken=bad-token'])
    expect(res.status).toBe(401)
  })
})

// ─── Logout ──────────────────────────────────────────────────────────────────

describe('POST /auth/logout', () => {
  it('204 — clears cookie', async () => {
    const regRes = await request(app)
      .post('/auth/register')
      .send({ email: email('logout'), password: 'Password123!', name: 'Logout User' })

    const res = await request(app)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${regRes.body.accessToken}`)

    expect(res.status).toBe(204)
  })

  it('401 — no token', async () => {
    const res = await request(app).post('/auth/logout')
    expect(res.status).toBe(401)
  })
})

// ─── Me ──────────────────────────────────────────────────────────────────────

describe('GET /auth/me', () => {
  it('200 — returns current user (no passwordHash)', async () => {
    const e = email('me')
    const regRes = await request(app)
      .post('/auth/register')
      .send({ email: e, password: 'Password123!', name: 'Me User' })

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${regRes.body.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.email).toBe(e)
    expect(res.body.passwordHash).toBeUndefined()
  })

  it('401 — no token', async () => {
    expect((await request(app).get('/auth/me')).status).toBe(401)
  })

  it('401 — invalid token', async () => {
    expect((await request(app).get('/auth/me').set('Authorization', 'Bearer bad')).status).toBe(401)
  })
})

// ─── Forgot Password ─────────────────────────────────────────────────────────

describe('POST /auth/forgot-password', () => {
  it('200 — registered email (does not leak existence)', async () => {
    const e = email('forgot')
    await request(app)
      .post('/auth/register')
      .send({ email: e, password: 'Password123!', name: 'F' })
    const res = await request(app).post('/auth/forgot-password').send({ email: e })
    expect(res.status).toBe(200)
    expect(res.body.message).toBeDefined()
  })

  it('200 — unknown email (same response, no info leak)', async () => {
    const res = await request(app)
      .post('/auth/forgot-password')
      .send({ email: email('unknown') })
    expect(res.status).toBe(200)
  })

  it('400 — invalid email format', async () => {
    const res = await request(app).post('/auth/forgot-password').send({ email: 'not-an-email' })
    expect(res.status).toBe(400)
  })
})

// ─── Reset Password ───────────────────────────────────────────────────────────

describe('POST /auth/reset-password', () => {
  it('200 — valid token resets password', async () => {
    const e = email('reset')
    await request(app).post('/auth/register').send({ email: e, password: 'OldPass1!', name: 'R' })
    await request(app).post('/auth/forgot-password').send({ email: e })

    const user = await prisma.user.findUnique({ where: { email: e } })
    const tokenRecord = await prisma.passwordResetToken.findFirst({ where: { userId: user!.id } })
    // Reconstruct raw token is not possible — we stored the hash.
    // Instead, create a fresh token directly for this test.
    const rawToken = 'test-raw-token-for-reset-' + uid()
    await prisma.passwordResetToken.create({
      data: {
        userId: user!.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 3600_000),
      },
    })

    const res = await request(app).post('/auth/reset-password').send({
      token: rawToken,
      password: 'NewPassword99!',
      confirmPassword: 'NewPassword99!',
    })
    expect(res.status).toBe(200)

    // Can now login with new password
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: e, password: 'NewPassword99!' })
    expect(loginRes.status).toBe(200)
  })

  it('400 — invalid token', async () => {
    const res = await request(app).post('/auth/reset-password').send({
      token: 'nonexistent-token',
      password: 'NewPassword99!',
      confirmPassword: 'NewPassword99!',
    })
    expect(res.status).toBe(400)
  })

  it('400 — already used token', async () => {
    const e = email('reset-used')
    await request(app).post('/auth/register').send({ email: e, password: 'OldPass1!', name: 'RU' })
    const user = await prisma.user.findUnique({ where: { email: e } })

    const rawToken = 'used-token-' + uid()
    await prisma.passwordResetToken.create({
      data: {
        userId: user!.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 3600_000),
        usedAt: new Date(), // already used
      },
    })

    const res = await request(app).post('/auth/reset-password').send({
      token: rawToken,
      password: 'NewPassword99!',
      confirmPassword: 'NewPassword99!',
    })
    expect(res.status).toBe(400)
  })

  it('400 — expired token', async () => {
    const e = email('reset-exp')
    await request(app).post('/auth/register').send({ email: e, password: 'OldPass1!', name: 'RE' })
    const user = await prisma.user.findUnique({ where: { email: e } })

    const rawToken = 'expired-token-' + uid()
    await prisma.passwordResetToken.create({
      data: {
        userId: user!.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() - 1000), // already expired
      },
    })

    const res = await request(app).post('/auth/reset-password').send({
      token: rawToken,
      password: 'NewPassword99!',
      confirmPassword: 'NewPassword99!',
    })
    expect(res.status).toBe(400)
  })
})
