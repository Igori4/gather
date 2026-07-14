import { Request, Response } from 'express'
import crypto from 'crypto'
import { CreateGroupSchema, InviteMemberSchema, UpdateGroupSchema } from '@gather/shared'
import { AuthRequest } from '../middleware/auth'
import { GroupRepository } from '../repositories/group.repository'
import { sendInviteEmail } from '../lib/email'

export async function createGroup(req: Request, res: Response) {
  const { userId } = req as AuthRequest
  const parsed = CreateGroupSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }

  const group = await GroupRepository.create({ ...parsed.data, createdBy: userId })
  return res.status(201).json(group)
}

export async function listGroups(req: Request, res: Response) {
  const { userId } = req as AuthRequest
  const groups = await GroupRepository.findAllForUser(userId)
  return res.json(groups)
}

export async function acceptInvite(req: Request, res: Response) {
  const { userId } = req as AuthRequest
  const { token } = req.body
  if (!token) {
    return res.status(400).json({ error: 'token is required' })
  }

  const invitation = await GroupRepository.findInvitation(token)
  if (!invitation || invitation.acceptedAt || invitation.expiresAt <= new Date()) {
    return res.status(400).json({ error: 'Invalid or expired invitation' })
  }

  const existing = await GroupRepository.findMembership(invitation.groupId, userId)
  if (existing) {
    return res.status(409).json({ error: 'Already a member of this group' })
  }

  await GroupRepository.joinViaInvitation(
    invitation.id,
    invitation.groupId,
    userId,
    invitation.role
  )

  const group = await GroupRepository.findById(invitation.groupId)
  return res.json(group)
}

export async function getGroup(req: Request, res: Response) {
  const { userId } = req as AuthRequest
  const group = await GroupRepository.findByIdWithMembers(req.params.id)

  if (!group) return res.status(404).json({ error: 'Group not found' })

  const isMember = group.members.some(m => m.userId === userId)
  if (!isMember) return res.status(403).json({ error: 'Forbidden' })

  return res.json(group)
}

export async function inviteMember(req: Request, res: Response) {
  const { userId } = req as AuthRequest
  const parsed = InviteMemberSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }

  const membership = await GroupRepository.findMembership(req.params.id, userId)
  if (!membership || membership.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can invite members' })
  }

  const group = await GroupRepository.findById(req.params.id)
  if (!group) return res.status(404).json({ error: 'Group not found' })

  const token = crypto.randomBytes(32).toString('hex')
  const invitation = await GroupRepository.createInvitation({
    groupId: req.params.id,
    email: parsed.data.email,
    role: parsed.data.role,
    token,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  })

  const clientUrl = process.env.CORS_ORIGIN ?? 'http://localhost:5173'
  const inviteUrl = `${clientUrl}/accept-invite?token=${token}`
  await sendInviteEmail(parsed.data.email, inviteUrl, group.name)

  return res.status(201).json({ token: invitation.token, email: invitation.email })
}

export async function updateGroup(req: Request, res: Response) {
  const { userId } = req as AuthRequest
  const { id } = req.params

  const membership = await GroupRepository.findMembership(id, userId)
  if (!membership || membership.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can edit this group' })
  }

  const parsed = UpdateGroupSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }

  const group = await GroupRepository.update(id, parsed.data)
  return res.json(group)
}

export async function removeMember(req: Request, res: Response) {
  const { userId } = req as AuthRequest
  const { id, userId: targetId } = req.params

  const membership = await GroupRepository.findMembership(id, userId)
  if (!membership || membership.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can remove members' })
  }

  const targetMembership = await GroupRepository.findMembership(id, targetId)
  if (!targetMembership) {
    return res.status(404).json({ error: 'Member not found' })
  }

  if (targetMembership.role === 'admin') {
    const adminCount = await GroupRepository.countAdmins(id)
    if (adminCount <= 1) {
      return res.status(400).json({ error: 'Cannot remove the last admin' })
    }
  }

  await GroupRepository.removeMember(id, targetId)
  return res.status(204).send()
}

export async function leaveGroup(req: Request, res: Response) {
  const { userId } = req as AuthRequest
  const { id } = req.params

  const membership = await GroupRepository.findMembership(id, userId)
  if (!membership) {
    return res.status(404).json({ error: 'Not a member of this group' })
  }

  if (membership.role === 'admin') {
    const adminCount = await GroupRepository.countAdmins(id)
    if (adminCount <= 1) {
      return res.status(400).json({ error: 'Transfer admin role before leaving' })
    }
  }

  await GroupRepository.removeMember(id, userId)
  return res.status(204).send()
}
