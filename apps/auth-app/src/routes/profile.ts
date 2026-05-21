import { Router } from 'express'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { ChangeNameSchema, ChangePasswordSchema, ChangeEmailRequestSchema, ActivateSchema } from '@gather/shared'
import { prisma } from '../lib/prisma'
import { hashToken } from '../lib/jwt'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { sendEmailChangeConfirmation, sendEmailChangeNotification } from '../lib/email'

export const profileRouter = Router()

// All profile routes require authentication
profileRouter.use(requireAuth)

// ─── PATCH /profile ───────────────────────────────────────────────────────────
// Change display name
profileRouter.patch('/', async (req, res) => {
  const parsed = ChangeNameSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }

  const { userId } = req as AuthRequest
  const user = await prisma.user.update({
    where: { id: userId },
    data: { name: parsed.data.name },
    select: { id: true, email: true, name: true },
  })

  return res.json(user)
})

// ─── PATCH /profile/password ──────────────────────────────────────────────────
// Change password — requires current password
profileRouter.patch('/password', async (req, res) => {
  const parsed = ChangePasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }

  const { userId } = req as AuthRequest
  const { currentPassword, newPassword } = parsed.data

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || !user.passwordHash) {
    return res.status(404).json({ error: 'User not found' })
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!valid) {
    return res.status(401).json({ error: 'Current password is incorrect' })
  }

  const passwordHash = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } })

  return res.json({ message: 'Password updated successfully.' })
})

// ─── PATCH /profile/email ─────────────────────────────────────────────────────
// Request email change — sends confirmation to new email, notification to old
profileRouter.patch('/email', async (req, res) => {
  const parsed = ChangeEmailRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }

  const { userId } = req as AuthRequest
  const { password, newEmail } = parsed.data

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || !user.passwordHash) {
    return res.status(404).json({ error: 'User not found' })
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    return res.status(401).json({ error: 'Password is incorrect' })
  }

  const existing = await prisma.user.findUnique({ where: { email: newEmail } })
  if (existing) {
    return res.status(409).json({ error: 'Email already in use' })
  }

  const rawToken = crypto.randomBytes(32).toString('hex')

  await prisma.emailChangeToken.deleteMany({
    where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
  })

  await prisma.emailChangeToken.create({
    data: {
      userId,
      newEmail,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    },
  })

  await sendEmailChangeConfirmation(newEmail, rawToken)
  await sendEmailChangeNotification(user.email)

  return res.json({ message: 'Confirmation email sent. Please check your new email address.' })
})

// ─── POST /profile/email/confirm ─────────────────────────────────────────────
// Confirm email change via token from email link
profileRouter.post('/email/confirm', async (req, res) => {
  const parsed = ActivateSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }

  const stored = await prisma.emailChangeToken.findUnique({
    where: { tokenHash: hashToken(parsed.data.token) },
  })

  if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
    return res.status(400).json({ error: 'This link is invalid or has expired.' })
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: stored.userId }, data: { email: stored.newEmail } }),
    prisma.emailChangeToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } }),
  ])

  return res.json({ message: 'Email updated successfully.' })
})
