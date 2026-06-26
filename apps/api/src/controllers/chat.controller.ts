import { Request, Response } from 'express'
import { SendMessageSchema, EditMessageSchema } from '@gather/shared'
import { AuthRequest } from '../middleware/auth'
import { ChatRepository } from '../repositories/chat.repository'
import { OutingRepository } from '../repositories/outing.repository'

const DEFAULT_LIMIT = 30

async function assertMembership(userId: string, outingId: string, res: Response) {
  const outing = await OutingRepository.findByIdWithGroup(outingId)
  if (!outing) {
    res.status(404).json({ error: 'Outing not found' })
    return null
  }
  const isMember = outing.group.members.some(m => m.userId === userId)
  if (!isMember) {
    res.status(403).json({ error: 'Forbidden' })
    return null
  }
  return outing
}

export async function listMessages(req: Request, res: Response) {
  const { userId } = req as AuthRequest
  const { id: outingId } = req.params
  const cursor = req.query.cursor as string | undefined
  const limit = Math.min(Number(req.query.limit ?? DEFAULT_LIMIT), 100)

  const outing = await assertMembership(userId, outingId, res)
  if (!outing) return

  const messages = await ChatRepository.listMessages(outingId, limit + 1, cursor)
  const hasMore = messages.length > limit
  const page = hasMore ? messages.slice(0, limit) : messages
  const nextCursor = hasMore ? page[page.length - 1].id : null

  return res.json({ messages: page, nextCursor })
}

export async function sendMessage(req: Request, res: Response) {
  const { userId } = req as AuthRequest
  const { id: outingId } = req.params

  const outing = await assertMembership(userId, outingId, res)
  if (!outing) return

  const parsed = SendMessageSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const message = await ChatRepository.createMessage(outingId, userId, parsed.data.body)

  try {
    const { getIo } = await import('../socket/index')
    getIo().to(`outing:${outingId}`).emit('chat:message', message)
  } catch {
    // Socket not initialized in test environment
  }

  return res.status(201).json(message)
}

export async function editMessage(req: Request, res: Response) {
  const { userId } = req as AuthRequest
  const { id: outingId, messageId } = req.params

  const outing = await assertMembership(userId, outingId, res)
  if (!outing) return

  const existing = await ChatRepository.findById(messageId)
  if (!existing) return res.status(404).json({ error: 'Message not found' })
  if (existing.userId !== userId) return res.status(403).json({ error: 'Forbidden' })

  const parsed = EditMessageSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const message = await ChatRepository.editMessage(messageId, parsed.data.body)

  try {
    const { getIo } = await import('../socket/index')
    getIo().to(`outing:${outingId}`).emit('chat:message:edited', {
      messageId,
      newBody: message.body,
      editedAt: message.editedAt,
    })
  } catch {
    // Socket not initialized in test environment
  }

  return res.json(message)
}

export async function deleteMessage(req: Request, res: Response) {
  const { userId } = req as AuthRequest
  const { id: outingId, messageId } = req.params

  const outing = await assertMembership(userId, outingId, res)
  if (!outing) return

  const existing = await ChatRepository.findById(messageId)
  if (!existing) return res.status(404).json({ error: 'Message not found' })
  if (existing.userId !== userId) return res.status(403).json({ error: 'Forbidden' })

  await ChatRepository.deleteMessage(messageId)
  return res.status(204).send()
}
