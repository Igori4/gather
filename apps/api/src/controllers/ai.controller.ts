import { Request, Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { GroupRepository } from '../repositories/group.repository'
import { AiRepository } from '../repositories/ai.repository'
import { generateAISuggestions } from '../lib/gemini'

export async function getAISuggestions(req: Request, res: Response) {
  const { userId } = req as AuthRequest
  const { groupId } = req.params
  const { outingId } = req.body as { outingId?: string }

  const membership = await GroupRepository.findMembership(groupId, userId)
  if (!membership) return res.status(403).json({ error: 'Forbidden' })

  const todayCount = await AiRepository.countTodayForGroup(groupId)
  if (todayCount >= AiRepository.DAILY_LIMIT) {
    return res.status(429).json({
      error: `Daily limit of ${AiRepository.DAILY_LIMIT} AI requests per group reached. Try again tomorrow.`,
    })
  }

  const suggestions = await generateAISuggestions(groupId, outingId)
  const record = await AiRepository.create(groupId, suggestions)

  return res.status(201).json({ id: record.id, ...suggestions, generatedAt: record.generatedAt })
}

export async function listAISuggestions(req: Request, res: Response) {
  const { userId } = req as AuthRequest
  const { groupId } = req.params

  const membership = await GroupRepository.findMembership(groupId, userId)
  if (!membership) return res.status(403).json({ error: 'Forbidden' })

  const records = await AiRepository.findForGroup(groupId)
  return res.json(records)
}

export async function dismissAISuggestion(req: Request, res: Response) {
  const { userId } = req as AuthRequest
  const { id } = req.params

  const record = await AiRepository.findById(id)
  if (!record) return res.status(404).json({ error: 'Not found' })

  const membership = await GroupRepository.findMembership(record.groupId, userId)
  if (!membership) return res.status(403).json({ error: 'Forbidden' })

  await AiRepository.dismiss(id)
  return res.status(204).send()
}
