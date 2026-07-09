import { Request, Response, NextFunction } from 'express'
import { requireAuth, AuthRequest } from '../../src/middleware/auth'
import { signAccessToken } from '../../src/lib/jwt'

function mockReq(authHeader?: string): Request {
  return { headers: authHeader ? { authorization: authHeader } : {} } as unknown as Request
}

function mockRes() {
  const res = { status: jest.fn(), json: jest.fn() }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  return res as unknown as Response
}

describe('requireAuth middleware', () => {
  const next = jest.fn() as unknown as NextFunction

  beforeEach(() => jest.clearAllMocks())

  it('401 — no Authorization header', () => {
    requireAuth(mockReq(), mockRes(), next)
    expect(next).not.toHaveBeenCalled()
  })

  it('401 — header does not start with "Bearer "', () => {
    const res = mockRes()
    requireAuth(mockReq('Basic abc'), res, next)
    expect(res.status as jest.Mock).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('401 — invalid token', () => {
    const res = mockRes()
    requireAuth(mockReq('Bearer not-a-real-token'), res, next)
    expect(res.status as jest.Mock).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('calls next and attaches userId for valid token', () => {
    const token = signAccessToken('user_xyz')
    const req = mockReq(`Bearer ${token}`)
    requireAuth(req, mockRes(), next)
    expect(next).toHaveBeenCalled()
    expect((req as unknown as AuthRequest).userId).toBe('user_xyz')
  })
})
