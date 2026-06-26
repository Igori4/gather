import jwt from 'jsonwebtoken'
import {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} from '../../src/lib/jwt'

const userId = 'user_test_abc123'

describe('signAccessToken / verifyAccessToken', () => {
  it('round-trips userId', () => {
    const token = signAccessToken(userId)
    expect(verifyAccessToken(token).userId).toBe(userId)
  })

  it('throws on tampered token', () => {
    const token = signAccessToken(userId)
    expect(() => verifyAccessToken(token + 'x')).toThrow()
  })

  it('throws on expired token', async () => {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '0s' })
    await new Promise(r => setTimeout(r, 10))
    expect(() => verifyAccessToken(token)).toThrow()
  })

  it('throws on token signed with wrong secret', () => {
    const token = jwt.sign({ userId }, 'wrong-secret')
    expect(() => verifyAccessToken(token)).toThrow()
  })
})

describe('signRefreshToken / verifyRefreshToken', () => {
  it('round-trips userId', () => {
    const token = signRefreshToken(userId)
    expect(verifyRefreshToken(token).userId).toBe(userId)
  })

  it('throws on tampered token', () => {
    const token = signRefreshToken(userId)
    expect(() => verifyRefreshToken(token + 'x')).toThrow()
  })

  it('access token is rejected by verifyRefreshToken', () => {
    // Signed with JWT_SECRET, not REFRESH_TOKEN_SECRET
    const accessToken = signAccessToken(userId)
    expect(() => verifyRefreshToken(accessToken)).toThrow()
  })
})

describe('hashToken', () => {
  it('is deterministic', () => {
    expect(hashToken('some-token')).toBe(hashToken('some-token'))
  })

  it('different inputs produce different hashes', () => {
    expect(hashToken('token-a')).not.toBe(hashToken('token-b'))
  })

  it('returns 64-char hex string (SHA-256)', () => {
    expect(hashToken('test')).toMatch(/^[a-f0-9]{64}$/)
  })
})
