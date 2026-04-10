import { Router } from 'express'
import crypto from 'crypto'
import { CreateGroupSchema, InviteMemberSchema } from '@gather/shared'
import { prisma } from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

export const groupsRouter = Router()

// All groups routes require authentication
groupsRouter.use(requireAuth)

// ─── POST /api/groups ─────────────────────────────────────────────────────────
// Create a group — creator is automatically added as admin
groupsRouter.post('/', async (req, res) => {
  const { userId } = req as AuthRequest
  const parsed = CreateGroupSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }

  const group = await prisma.group.create({
    data: {
      ...parsed.data,
      createdBy: userId,
      members: { create: { userId, role: 'admin' } },
    },
  })

  return res.status(201).json(group)
})

// ─── GET /api/groups ──────────────────────────────────────────────────────────
// List all groups the current user belongs to
groupsRouter.get('/', async (req, res) => {
  const { userId } = req as AuthRequest
  const groups = await prisma.group.findMany({
    where: { members: { some: { userId } } },
    include: { _count: { select: { members: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return res.json(groups)
})

// ─── POST /api/groups/accept-invite ──────────────────────────────────────────
// Must be declared before /:id to avoid "accept-invite" matching :id
// Accept an invitation token and join the group
groupsRouter.post('/accept-invite', async (req, res) => {
  const { userId } = req as AuthRequest
  const { token } = req.body
  if (!token) {
    return res.status(400).json({ error: 'token is required' })
  }

  const invitation = await prisma.invitation.findUnique({ where: { token } })
  if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
    return res.status(400).json({ error: 'Invalid or expired invitation' })
  }

  const existing = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: invitation.groupId, userId } },
  })
  if (existing) {
    return res.status(409).json({ error: 'Already a member of this group' })
  }

  await prisma.groupMember.create({
    data: { groupId: invitation.groupId, userId, role: invitation.role },
  })
  await prisma.invitation.update({
    where: { id: invitation.id },
    data: { acceptedAt: new Date() },
  })

  const group = await prisma.group.findUnique({ where: { id: invitation.groupId } })
  return res.json(group)
})

// ─── GET /api/groups/:id ──────────────────────────────────────────────────────
// Get a single group with its members — only accessible to members
groupsRouter.get('/:id', async (req, res) => {
  const { userId } = req as unknown as AuthRequest
  const group = await prisma.group.findUnique({
    where: { id: req.params.id },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, avatarUrl: true, email: true } },
        },
      },
    },
  })

  if (!group) return res.status(404).json({ error: 'Group not found' })

  const isMember = group.members.some(m => m.userId === userId)
  if (!isMember) return res.status(403).json({ error: 'Forbidden' })

  return res.json(group)
})

// ─── POST /api/groups/:id/invite ─────────────────────────────────────────────
// Send an invitation — admin only, generates a unique token
groupsRouter.post('/:id/invite', async (req, res) => {
  const { userId } = req as unknown as AuthRequest
  const parsed = InviteMemberSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: req.params.id, userId } },
  })
  if (!membership || membership.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can invite members' })
  }

  const token = crypto.randomBytes(32).toString('hex')
  const invitation = await prisma.invitation.create({
    data: {
      groupId: req.params.id,
      email: parsed.data.email,
      role: parsed.data.role,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })

  return res.status(201).json({ token: invitation.token, email: invitation.email })
})
