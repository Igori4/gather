import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import {
  RegisterSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from '@gather/shared'
import { signAccessToken, signRefreshToken, hashToken, verifyRefreshToken } from '../lib/jwt'
import { AuthRequest } from '../middleware/auth'
import { sendPasswordResetEmail } from '../lib/email'
import { UserRepository } from '../repositories/user.repository'

// httpOnly means JavaScript cannot read this cookie — protects against XSS
function setRefreshCookie(res: Response, token: string) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
}

// Store a hash — if DB leaks, the raw token is never exposed
async function issueTokens(userId: string, res: Response) {
  const accessToken = signAccessToken(userId)
  const refreshToken = signRefreshToken(userId)

  await UserRepository.createRefreshToken(
    userId,
    hashToken(refreshToken),
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  )

  setRefreshCookie(res, refreshToken)
  return accessToken
}

export async function register(req: Request, res: Response) {
  const parsed = RegisterSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }
  const { email, password, name } = parsed.data

  const existing = await UserRepository.findByEmail(email)
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await UserRepository.create({ email, passwordHash, name })
  const accessToken = await issueTokens(user.id, res)

  return res.status(201).json({
    accessToken,
    user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
  })
}

export async function login(req: Request, res: Response) {
  const parsed = LoginSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }
  const { email, password } = parsed.data

  const user = await UserRepository.findByEmail(email)
  // Same error for "user not found" and "wrong password" — prevents email enumeration
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
}

export async function refresh(req: Request, res: Response) {
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

  const stored = await UserRepository.findActiveRefreshToken(userId, hashToken(token))
  if (!stored) {
    return res.status(401).json({ error: 'Refresh token revoked or expired' })
  }

  // Rotate: revoke old token so a stolen refresh token can only be used once
  await UserRepository.revokeRefreshToken(stored.id)

  const user = await UserRepository.findById(userId)
  if (!user) return res.status(401).json({ error: 'User not found' })

  const accessToken = await issueTokens(userId, res)
  return res.json({ accessToken, user })
}

export async function logout(req: Request, res: Response) {
  const { userId } = req as AuthRequest
  await UserRepository.revokeAllRefreshTokens(userId)
  res.clearCookie('refreshToken')
  return res.status(204).send()
}

export async function me(req: Request, res: Response) {
  const { userId } = req as AuthRequest
  const user = await UserRepository.findById(userId)
  if (!user) return res.status(404).json({ error: 'User not found' })
  return res.json(user)
}

export async function forgotPassword(req: Request, res: Response) {
  const parsed = ForgotPasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }
  const { email } = parsed.data

  // Always return 200 — never reveal whether an email is registered
  const user = await UserRepository.findByEmail(email)
  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = hashToken(rawToken)

    await UserRepository.deleteActiveResetTokens(user.id)
    await UserRepository.createResetToken(user.id, tokenHash, new Date(Date.now() + 60 * 60 * 1000))

    if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
      console.error(
        '[security] FRONTEND_URL not set in production — reset links will point to localhost'
      )
    }
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
}

export async function resetPassword(req: Request, res: Response) {
  const parsed = ResetPasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }
  const { token, password } = parsed.data

  const stored = await UserRepository.findResetToken(hashToken(token))
  if (!stored || stored.usedAt || stored.expiresAt <= new Date()) {
    return res.status(400).json({ message: 'This reset link is invalid or has expired.' })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  await UserRepository.applyPasswordReset(stored.userId, stored.id, passwordHash)

  return res.json({ message: 'Password reset successfully.' })
}
