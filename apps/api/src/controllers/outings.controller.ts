import { Request, Response } from 'express'
import { CreateOutingSchema, AddPlaceSchema, CastVoteSchema, ProposeSlotSchema, ConfirmOutingSchema, RSVPSchema } from '@gather/shared'
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

export async function proposeSlot(req: Request, res: Response) {
  const { userId } = req as AuthRequest

  const outing = await OutingRepository.findByIdWithGroup(req.params.id)
  if (!outing) return res.status(404).json({ error: 'Outing not found' })

  const isMember = outing.group.members.some(m => m.userId === userId)
  if (!isMember) return res.status(403).json({ error: 'Forbidden' })

  const parsed = ProposeSlotSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const startsAt = new Date(parsed.data.startsAt)
  const endsAt = new Date(parsed.data.endsAt)
  if (endsAt <= startsAt) return res.status(400).json({ error: 'endsAt must be after startsAt' })

  const slot = await OutingRepository.proposeSlot({
    outingId: req.params.id,
    proposedBy: userId,
    startsAt,
    endsAt,
  })
  return res.status(201).json(slot)
}

export async function voteSlot(req: Request, res: Response) {
  const { userId } = req as AuthRequest
  const { id: outingId, slotId } = req.params

  const outing = await OutingRepository.findByIdWithGroup(outingId)
  if (!outing) return res.status(404).json({ error: 'Outing not found' })

  const isMember = outing.group.members.some(m => m.userId === userId)
  if (!isMember) return res.status(403).json({ error: 'Forbidden' })

  const slot = await OutingRepository.findSlot(slotId)
  if (!slot || slot.outingId !== outingId) return res.status(404).json({ error: 'Slot not found' })

  const { available } = req.body
  if (typeof available !== 'boolean') return res.status(400).json({ error: 'available must be boolean' })

  const tally = await OutingRepository.voteSlot(slotId, userId, available)
  return res.json(tally)
}

export async function deleteSlot(req: Request, res: Response) {
  const { userId } = req as AuthRequest
  const { id: outingId, slotId } = req.params

  const outing = await OutingRepository.findByIdWithGroup(outingId)
  if (!outing) return res.status(404).json({ error: 'Outing not found' })

  const isMember = outing.group.members.some(m => m.userId === userId)
  if (!isMember) return res.status(403).json({ error: 'Forbidden' })

  const slot = await OutingRepository.findSlot(slotId)
  if (!slot || slot.outingId !== outingId) return res.status(404).json({ error: 'Slot not found' })

  await OutingRepository.deleteSlot(slotId)
  return res.status(204).send()
}

export async function confirmOuting(req: Request, res: Response) {
  const { userId } = req as AuthRequest

  const outing = await OutingRepository.findByIdWithGroup(req.params.id)
  if (!outing) return res.status(404).json({ error: 'Outing not found' })

  const membership = await GroupRepository.findMembership(outing.groupId, userId)
  if (!membership || membership.role !== 'admin') return res.status(403).json({ error: 'Admin only' })

  if (outing.status === 'confirmed') return res.status(409).json({ error: 'Already confirmed' })

  const parsed = ConfirmOutingSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const place = await OutingRepository.findPlace(req.params.id, parsed.data.placeId)
  if (!place) return res.status(404).json({ error: 'Place not found in this outing' })

  const slot = await OutingRepository.findSlot(parsed.data.slotId)
  if (!slot || slot.outingId !== req.params.id) return res.status(404).json({ error: 'Slot not found in this outing' })

  const updated = await OutingRepository.confirmOuting(req.params.id, parsed.data.placeId, parsed.data.slotId)
  return res.json(updated)
}

export async function rsvp(req: Request, res: Response) {
  const { userId } = req as AuthRequest

  const outing = await OutingRepository.findByIdWithGroup(req.params.id)
  if (!outing) return res.status(404).json({ error: 'Outing not found' })

  const isMember = outing.group.members.some(m => m.userId === userId)
  if (!isMember) return res.status(403).json({ error: 'Forbidden' })

  const parsed = RSVPSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const entry = await OutingRepository.upsertRSVP(req.params.id, userId, parsed.data.status)
  return res.json(entry)
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
