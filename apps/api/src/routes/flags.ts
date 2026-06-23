import { Router } from 'express'
import { TrackEventSchema } from '@gather/shared'
import { resolveIdentity, IdentityRequest } from '../middleware/identity'
import { flagDefinitions, isExperimentName } from '../lib/flags'
import { assignVariant } from '../lib/experimentAssignment'
import { prisma } from '../lib/prisma'
import { Prisma } from '../generated/prisma/client'

export const flagsRouter = Router()

/**
 * @openapi
 * /api/flags:
 *   get:
 *     summary: Get all feature flag values
 *     tags: [Flags]
 *     responses:
 *       200:
 *         description: Map of flag name to boolean
 */
flagsRouter.get('/flags', resolveIdentity, (_req, res) => {
  const flags = Object.fromEntries(
    Object.values(flagDefinitions).map((flag) => [flag.name, flag.enabled])
  )
  res.json({ flags })
})

/**
 * @openapi
 * /api/experiments/{experimentName}/variant:
 *   get:
 *     summary: Get (or deterministically assign) this visitor's variant for an experiment
 *     tags: [Flags]
 *     parameters:
 *       - in: path
 *         name: experimentName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Assigned variant
 *       404:
 *         description: Unknown experiment
 */
flagsRouter.get('/experiments/:experimentName/variant', resolveIdentity, async (req, res) => {
  const { experimentName } = req.params
  if (!isExperimentName(experimentName)) {
    res.status(404).json({ error: 'Unknown experiment' })
    return
  }

  const { userId, anonymousId } = (req as IdentityRequest).identity
  const variant = await assignVariant(experimentName, { userId, anonymousId })
  res.json({ experimentName, variant })
})

/**
 * @openapi
 * /api/events:
 *   post:
 *     summary: Record an analytics event (e.g. experiment exposure or conversion)
 *     tags: [Flags]
 *     responses:
 *       201:
 *         description: Event recorded
 */
flagsRouter.post('/events', resolveIdentity, async (req, res) => {
  const parsed = TrackEventSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const { type, experimentName, variant, payload } = parsed.data
  const { userId, anonymousId } = (req as IdentityRequest).identity

  await prisma.event.create({
    data: {
      type,
      experimentName,
      variant,
      userId,
      anonymousId,
      payload: payload as Prisma.InputJsonValue | undefined,
    },
  })
  res.status(201).json({ ok: true })
})
