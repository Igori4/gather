import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../lib/jwt'

// Extend Request so TypeScript knows userId exists after this middleware runs
export interface AuthRequest extends Request {
  userId: string
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    const token = header.slice(7) // strip "Bearer "
    const payload = verifyAccessToken(token)
    ;(req as AuthRequest).userId = payload.userId
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
