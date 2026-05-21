/**
 * @openapi
 * tags:
 *   name: Auth
 *   description: Authentication — register, login, token refresh, logout, current user
 */

import { Router } from 'express'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import {
  RegisterSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from '@gather/shared'
import { prisma } from '../lib/prisma'
import { signAccessToken, signRefreshToken, hashToken, verifyRefreshToken } from '../lib/jwt'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { sendPasswordResetEmail } from '../lib/email'

export const authRouter = Router()

// ─── Helper: set the refresh token as an httpOnly cookie ─────────────────────
// httpOnly means JavaScript cannot read this cookie — protects against XSS
function setRefreshCookie(res: import('express').Response, token: string) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    sameSite: 'strict', // blocks cross-site requests
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
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
  console.log('user', user)
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
  return res.json({
    accessToken,
    user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
  })
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

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request a password reset email
 *     description: >
 *       Always returns 200 regardless of whether the email is registered,
 *       to prevent email enumeration. If the email is found, a reset link
 *       valid for 1 hour is sent to that address.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Request accepted (email may or may not have been sent)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// ─── POST /auth/forgot-password ───────────────────────────────────────────────
authRouter.post('/forgot-password', async (req, res) => {
  const parsed = ForgotPasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }
  const { email } = parsed.data

  // Always return 200 — never reveal whether an email is registered
  const user = await prisma.user.findUnique({ where: { email } })
  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = hashToken(rawToken)

    // Invalidate any existing unexpired tokens for this user before creating a new one
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
    })

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    })

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173'
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`
    try {
      await sendPasswordResetEmail(email, resetUrl)
    } catch (err) {
      console.error('Failed to send password reset email:', err)
      // Still return 200 — a send failure must not leak whether the email is registered
    }
  }

  return res.json({ message: 'If that email is registered, you will receive a reset link.' })
})

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password using a token from the reset email
 *     description: >
 *       Validates the token (must not be used or expired), updates the user's
 *       password, marks the token as used, and revokes all active sessions.
 *       The user must log in again after a successful reset.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token:    { type: string, description: 'Raw reset token from the email link' }
 *               password: { type: string, minLength: 8 }
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *       400:
 *         description: Token is invalid, expired, or already used — or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// ─── POST /auth/reset-password ────────────────────────────────────────────────
authRouter.post('/reset-password', async (req, res) => {
  const parsed = ResetPasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }
  const { token, password } = parsed.data

  const tokenHash = hashToken(token)
  const stored = await prisma.passwordResetToken.findUnique({ where: { tokenHash } })

  if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
    return res.status(400).json({ message: 'This reset link is invalid or has expired.' })
  }

  const passwordHash = await bcrypt.hash(password, 10)

  await prisma.$transaction([
    prisma.user.update({ where: { id: stored.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } }),
    // Revoke all sessions — the user must log in fresh with their new password
    prisma.refreshToken.deleteMany({ where: { userId: stored.userId } }),
  ])

  return res.json({ message: 'Password reset successfully.' })
})
