import { Request, Response, NextFunction } from 'express'
import { randomUUID } from 'crypto'
import { verifyAccessToken } from '../lib/jwt'

export interface IdentityRequest extends Request {
  identity: {
    userId?: string
    anonymousId?: string
  }
}

const ANONYMOUS_ID_COOKIE = 'gather_aid'

// Flags/experiments must work for logged-out visitors too, so this never
// 401s — it resolves whatever identity is available (JWT user, existing
// anonymous cookie, or a freshly minted one) and lets the route decide.
export function resolveIdentity(req: Request, res: Response, next: NextFunction): void {
  let userId: string | undefined
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) {
    try {
      userId = verifyAccessToken(header.slice(7)).userId
    } catch {
      // Expired/invalid token — fall through as anonymous rather than failing.
    }
  }

  let anonymousId = req.cookies?.[ANONYMOUS_ID_COOKIE] as string | undefined
  if (!userId && !anonymousId) {
    anonymousId = randomUUID()
    res.cookie(ANONYMOUS_ID_COOKIE, anonymousId, {
      maxAge: 1000 * 60 * 60 * 24 * 365,
      httpOnly: true,
      sameSite: 'strict',
    })
  }

  ;(req as IdentityRequest).identity = { userId, anonymousId }
  next()
}
