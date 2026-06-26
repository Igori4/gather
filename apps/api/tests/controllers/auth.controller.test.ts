import { Request, Response } from 'express'

jest.mock('../../src/repositories/user.repository', () => ({
  UserRepository: {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    createRefreshToken: jest.fn().mockResolvedValue({}),
    findActiveRefreshToken: jest.fn(),
    revokeRefreshToken: jest.fn().mockResolvedValue({}),
    revokeAllRefreshTokens: jest.fn().mockResolvedValue({}),
    deleteActiveResetTokens: jest.fn().mockResolvedValue({}),
    createResetToken: jest.fn().mockResolvedValue({}),
    findResetToken: jest.fn(),
    applyPasswordReset: jest.fn().mockResolvedValue({}),
  },
}))

jest.mock('../../src/lib/jwt', () => ({
  signAccessToken: jest.fn().mockReturnValue('mock-access-token'),
  signRefreshToken: jest.fn().mockReturnValue('mock-refresh-token'),
  hashToken: jest.fn().mockImplementation((t: string) => `hashed-${t}`),
  verifyRefreshToken: jest.fn().mockReturnValue({ userId: 'user_123' }),
}))

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}))

jest.mock('../../src/lib/email', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}))

// Import after mocks are set up
import { register, login, refresh, resetPassword } from '../../src/controllers/auth.controller'
import { UserRepository } from '../../src/repositories/user.repository'

const repo = UserRepository as jest.Mocked<typeof UserRepository>

function mockReq(overrides: object = {}): Request {
  return { body: {}, cookies: {}, headers: {}, ...overrides } as unknown as Request
}

function mockRes() {
  const res = { status: jest.fn(), json: jest.fn(), send: jest.fn(), cookie: jest.fn() }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  res.send.mockReturnValue(res)
  return res as unknown as Response
}

beforeEach(() => jest.clearAllMocks())

// ─── register ─────────────────────────────────────────────────────────────────

const VALID_PASSWORD = 'Password123!'

describe('register', () => {
  it('409 when email already exists', async () => {
    repo.findByEmail.mockResolvedValue({ id: 'existing' } as any)
    const res = mockRes()
    await register(mockReq({ body: { email: 'a@b.com', password: VALID_PASSWORD, name: 'A' } }), res)
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(409)
  })

  it('400 on schema validation failure', async () => {
    const res = mockRes()
    await register(mockReq({ body: { email: 'not-an-email' } }), res)
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(400)
  })
})

// ─── login ────────────────────────────────────────────────────────────────────

describe('login', () => {
  it('401 when user not found', async () => {
    repo.findByEmail.mockResolvedValue(null)
    const res = mockRes()
    await login(mockReq({ body: { email: 'x@x.com', password: 'anypass' } }), res)
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(401)
  })

  it('401 when user has no passwordHash (OAuth account)', async () => {
    repo.findByEmail.mockResolvedValue({ id: 'u1', passwordHash: null } as any)
    const res = mockRes()
    await login(mockReq({ body: { email: 'x@x.com', password: 'anypass' } }), res)
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(401)
  })

  it('401 when password is wrong', async () => {
    repo.findByEmail.mockResolvedValue({ id: 'u1', passwordHash: 'hash' } as any)
    const bcrypt = await import('bcrypt')
    ;(bcrypt.compare as jest.Mock).mockResolvedValueOnce(false)
    const res = mockRes()
    await login(mockReq({ body: { email: 'x@x.com', password: 'anypass' } }), res)
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(401)
  })
})

// ─── refresh ──────────────────────────────────────────────────────────────────

describe('refresh', () => {
  it('401 when no cookie', async () => {
    const res = mockRes()
    await refresh(mockReq({ cookies: {} }), res)
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(401)
  })

  it('401 when verifyRefreshToken throws', async () => {
    const { verifyRefreshToken } = await import('../../src/lib/jwt')
    ;(verifyRefreshToken as jest.Mock).mockImplementationOnce(() => { throw new Error('expired') })
    const res = mockRes()
    await refresh(mockReq({ cookies: { refreshToken: 'bad-token' } }), res)
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(401)
  })

  it('401 when stored token not found (revoked)', async () => {
    repo.findActiveRefreshToken.mockResolvedValue(null)
    const res = mockRes()
    await refresh(mockReq({ cookies: { refreshToken: 'some-token' } }), res)
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(401)
  })
})

// ─── resetPassword ───────────────────────────────────────────────────────────

const VALID_RESET_BODY = { token: 'some-token', password: VALID_PASSWORD, confirmPassword: VALID_PASSWORD }

describe('resetPassword', () => {
  it('400 when token not found', async () => {
    repo.findResetToken.mockResolvedValue(null)
    const res = mockRes()
    await resetPassword(mockReq({ body: VALID_RESET_BODY }), res)
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(400)
  })

  it('400 when token already used', async () => {
    repo.findResetToken.mockResolvedValue({
      id: 't1', userId: 'u1', usedAt: new Date(), expiresAt: new Date(Date.now() + 3600_000),
    } as any)
    const res = mockRes()
    await resetPassword(mockReq({ body: VALID_RESET_BODY }), res)
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(400)
  })

  it('400 when token expired', async () => {
    repo.findResetToken.mockResolvedValue({
      id: 't2', userId: 'u1', usedAt: null, expiresAt: new Date(Date.now() - 1000),
    } as any)
    const res = mockRes()
    await resetPassword(mockReq({ body: VALID_RESET_BODY }), res)
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(400)
  })
})
