import { Router } from 'express'
import { resolveIdentity } from '../middleware/identity'
import * as FlagsController from '../controllers/flags.controller'

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
flagsRouter.get('/flags', resolveIdentity, FlagsController.getFlags)

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
flagsRouter.get('/experiments/:experimentName/variant', resolveIdentity, FlagsController.getExperimentVariant)

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
flagsRouter.post('/events', resolveIdentity, FlagsController.trackEvent)
