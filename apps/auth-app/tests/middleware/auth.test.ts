import { Request, Response, NextFunction } from 'express'
import { requireAuth, AuthRequest } from '../../src/middleware/auth'
import { signAccessToken } from '../../src/lib/jwt'

beforeAll(() => {
  process.env.JWT_SECRET = 'test-access-secret-32-chars-long!!'
  process.env.JWT_EXPIRES_IN = '15m'
})

function mockRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response
  return res
}

describe.skip('requireAuth middleware', () => {
  it('calls next() and sets userId when token is valid', () => {
    const token = signAccessToken('user-abc')
    const req = { headers: { authorization: `Bearer ${token}` } } as unknown as Request
    const res = mockRes()
    const next = jest.fn() as NextFunction

    requireAuth(req, res, next)

    expect(next).toHaveBeenCalled()
    expect((req as AuthRequest).userId).toBe('user-abc')
  })

  it('returns 401 when Authorization header is missing', () => {
    const req = { headers: {} } as Request
    const res = mockRes()
    const next = jest.fn() as NextFunction

    requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when token is invalid', () => {
    const req = {
      headers: { authorization: 'Bearer bad.token.here' },
    } as unknown as Request
    const res = mockRes()
    const next = jest.fn() as NextFunction

    requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })
})
