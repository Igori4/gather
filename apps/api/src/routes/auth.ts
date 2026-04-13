/**
 * @openapi
 * tags:
 *   name: Auth
 *   description: Authentication — register, login, token refresh, logout, current user
 */

import { Router } from 'express'
import bcrypt from 'bcrypt'
import { RegisterSchema, LoginSchema } from '@gather/shared'
import { prisma } from '../lib/prisma'
import { signAccessToken, signRefreshToken, hashToken, verifyRefreshToken } from '../lib/jwt'
import { requireAuth, AuthRequest } from '../middleware/auth'

export const authRouter = Router()

// ─── Helper: set the refresh token as an httpOnly cookie ─────────────────────
// httpOnly means JavaScript cannot read this cookie — protects against XSS
function setRefreshCookie(res: import('express').Response, token: string) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    sameSite: 'strict',                            // blocks cross-site requests
    maxAge: 7 * 24 * 60 * 60 * 1000,              // 7 days in ms
  })
}

// ─── Helper: issue both tokens and persist the hashed refresh token ───────────
async function issueTokens(userId: string, res: import('express').Response) {
  const accessToken = signAccessToken(userId)
  const refreshToken = signRefreshToken(userId)

  // Store a hash — if DB leaks, the raw token is never exposed
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })

  setRefreshCookie(res, refreshToken)
  return accessToken
}

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name]
 *             properties:
 *               email:    { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               name:     { type: string }
 *     responses:
 *       201:
 *         description: User created — returns access token and user object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Email already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// ─── POST /auth/register ─────────────────────────────────────────────────────
authRouter.post('/register', async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }
  const { email, password, name } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { email, passwordHash, name },
  })

  const accessToken = await issueTokens(user.id, res)

  return res.status(201).json({
    accessToken,
    user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
  })
})

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// ─── POST /auth/login ─────────────────────────────────────────────────────────
authRouter.post('/login', async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }
  const { email, password } = parsed.data

  const user = await prisma.user.findUnique({ where: { email } })
  // Same error for "user not found" and "wrong password"
  // so attackers can't enumerate which emails are registered
  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const accessToken = await issueTokens(user.id, res)

  return res.json({
    accessToken,
    user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
  })
})

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token using the httpOnly refresh cookie
 *     responses:
 *       200:
 *         description: New access token issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *       401:
 *         description: Missing, invalid, or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// ─── POST /auth/refresh ───────────────────────────────────────────────────────
authRouter.post('/refresh', async (req, res) => {
  const token = req.cookies?.refreshToken as string | undefined
  if (!token) {
    return res.status(401).json({ error: 'No refresh token' })
  }

  let userId: string
  try {
    userId = verifyRefreshToken(token).userId
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' })
  }

  // Find the hashed token in DB — must not be revoked or expired
  const stored = await prisma.refreshToken.findFirst({
    where: {
      userId,
      tokenHash: hashToken(token),
      revoked: false,
      expiresAt: { gt: new Date() },
    },
  })
  if (!stored) {
    return res.status(401).json({ error: 'Refresh token revoked or expired' })
  }

  // Rotate: revoke the old one, issue a fresh pair
  // This means a stolen refresh token can only be used once before becoming invalid
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } })

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return res.status(401).json({ error: 'User not found' })

  const accessToken = await issueTokens(userId, res)
  return res.json({ accessToken })
})

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout — revokes all refresh tokens and clears the cookie
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: Logged out successfully
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// ─── POST /auth/logout ────────────────────────────────────────────────────────
authRouter.post('/logout', requireAuth, async (req, res) => {
  const { userId } = req as AuthRequest
  await prisma.refreshToken.deleteMany({ where: { userId } })
  res.clearCookie('refreshToken')
  return res.status(204).send()
})

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the current authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// ─── GET /auth/me ─────────────────────────────────────────────────────────────
authRouter.get('/me', requireAuth, async (req, res) => {
  const { userId } = req as AuthRequest
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, avatarUrl: true },
  })
  if (!user) return res.status(404).json({ error: 'User not found' })
  return res.json(user)
})
