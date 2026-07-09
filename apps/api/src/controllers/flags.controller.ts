import { Request, Response } from 'express'
import { TrackEventSchema } from '@gather/shared'
import { IdentityRequest } from '../middleware/identity'
import { flagDefinitions, isExperimentName } from '../lib/flags'
import { assignVariant } from '../lib/experimentAssignment'
import { EventRepository } from '../repositories/event.repository'
import { Prisma } from '../generated/prisma/client'

export function getFlags(_req: Request, res: Response) {
  const flags = Object.fromEntries(
    Object.values(flagDefinitions).map(flag => [flag.name, flag.enabled])
  )
  res.json({ flags })
}

export async function getExperimentVariant(req: Request, res: Response) {
  const { experimentName } = req.params
  if (!isExperimentName(experimentName)) {
    res.status(404).json({ error: 'Unknown experiment' })
    return
  }

  const { userId, anonymousId } = (req as IdentityRequest).identity
  const variant = await assignVariant(experimentName, { userId, anonymousId })
  res.json({ experimentName, variant })
}

export async function trackEvent(req: Request, res: Response) {
  const parsed = TrackEventSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const { type, experimentName, variant, payload } = parsed.data
  const { userId, anonymousId } = (req as IdentityRequest).identity

  await EventRepository.create({
    type,
    experimentName,
    variant,
    userId,
    anonymousId,
    payload: payload as Prisma.InputJsonValue | undefined,
  })
  res.status(201).json({ ok: true })
}
