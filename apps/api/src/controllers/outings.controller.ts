import { Request, Response } from 'express'
import { CreateOutingSchema, AddPlaceSchema, CastVoteSchema } from '@gather/shared'
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

export async function addPlace(req: Request, res: Response) {
  const { userId } = req as AuthRequest

  const outing = await OutingRepository.findByIdWithGroup(req.params.id)
  if (!outing) return res.status(404).json({ error: 'Outing not found' })

  const isMember = outing.group.members.some(m => m.userId === userId)
  if (!isMember) return res.status(403).json({ error: 'Forbidden' })

  const parsed = AddPlaceSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const existing = await OutingRepository.findPlace(req.params.id, parsed.data.placeId)
  if (existing) return res.status(409).json({ error: 'Place already added' })

  const place = await OutingRepository.addPlace({
    outingId: req.params.id,
    addedBy: userId,
    ...parsed.data,
  })
  return res.status(201).json(place)
}

export async function castVote(req: Request, res: Response) {
  const { userId } = req as AuthRequest
  const { id: outingId, placeId } = req.params

  const outing = await OutingRepository.findByIdWithGroup(outingId)
  if (!outing) return res.status(404).json({ error: 'Outing not found' })

  const isMember = outing.group.members.some(m => m.userId === userId)
  if (!isMember) return res.status(403).json({ error: 'Forbidden' })

  const place = await OutingRepository.findPlace(outingId, placeId)
  if (!place) return res.status(404).json({ error: 'Place not found' })

  const parsed = CastVoteSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const tally = await OutingRepository.castVote(outingId, placeId, userId, parsed.data.vote)
  return res.json(tally)
}

export async function removePlace(req: Request, res: Response) {
  const { userId } = req as AuthRequest

  const outing = await OutingRepository.findByIdWithGroup(req.params.id)
  if (!outing) return res.status(404).json({ error: 'Outing not found' })

  const isMember = outing.group.members.some(m => m.userId === userId)
  if (!isMember) return res.status(403).json({ error: 'Forbidden' })

  const existing = await OutingRepository.findPlace(req.params.id, req.params.placeId)
  if (!existing) return res.status(404).json({ error: 'Place not found' })

  await OutingRepository.removePlace(req.params.id, req.params.placeId)
  return res.status(204).send()
}
