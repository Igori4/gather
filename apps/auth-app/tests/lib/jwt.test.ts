import {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} from '../../src/lib/jwt'

beforeAll(() => {
  process.env.JWT_SECRET = 'test-access-secret-32-chars-long!!'
  process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-32-chars-long!'
  process.env.JWT_EXPIRES_IN = '15m'
  process.env.REFRESH_TOKEN_EXPIRES_IN = '7d'
})

describe.skip('signAccessToken / verifyAccessToken', () => {
  it('round-trips a userId', () => {
    const token = signAccessToken('user-123')
    const payload = verifyAccessToken(token)
    expect(payload.userId).toBe('user-123')
  })

  it('throws on a tampered token', () => {
    const token = signAccessToken('user-123')
    expect(() => verifyAccessToken(token + 'x')).toThrow()
  })
})

describe.skip('signRefreshToken / verifyRefreshToken', () => {
  it('round-trips a userId', () => {
    const token = signRefreshToken('user-456')
    const payload = verifyRefreshToken(token)
    expect(payload.userId).toBe('user-456')
  })
})

describe.skip('hashToken', () => {
  it('produces a consistent SHA-256 hex string', () => {
    const h1 = hashToken('some-token')
    const h2 = hashToken('some-token')
    expect(h1).toBe(h2)
    expect(h1).toHaveLength(64)
  })

  it('produces different hashes for different inputs', () => {
    expect(hashToken('a')).not.toBe(hashToken('b'))
  })
})
