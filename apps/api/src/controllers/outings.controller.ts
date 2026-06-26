import { Request, Response } from 'express'
import { CreateOutingSchema } from '@gather/shared'
import { AuthRequest } from '../middleware/auth'
import { OutingRepository } from '../repositories/outing.repository'
import { GroupRepository } from '../repositories/group.repository'

export async function createOuting(req: Request, res: Response) {
  const { userId } = req as AuthRequest
  const { groupId } = req.params

  const membership = await GroupRepository.findMembership(groupId, userId)
  if (!membership) return res.status(403).json({ error: 'Forbidden' })

  const parsed = CreateOutingSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const outing = await OutingRepository.create({ ...parsed.data, groupId, createdBy: userId })
  return res.status(201).json(outing)
}

export async function listOutings(req: Request, res: Response) {
  const { userId } = req as AuthRequest
  const { groupId } = req.params

  const membership = await GroupRepository.findMembership(groupId, userId)
  if (!membership) return res.status(403).json({ error: 'Forbidden' })

  const outings = await OutingRepository.findAllForGroup(groupId)
  return res.json(outings)
}

export async function getOuting(req: Request, res: Response) {
  const { userId } = req as AuthRequest

  const outing = await OutingRepository.findByIdWithGroup(req.params.id)
  if (!outing) return res.status(404).json({ error: 'Outing not found' })

  const isMember = outing.group.members.some(m => m.userId === userId)
  if (!isMember) return res.status(403).json({ error: 'Forbidden' })

  return res.json(outing)
}
