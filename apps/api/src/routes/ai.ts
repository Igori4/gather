/**
 * @openapi
 * tags:
 *   name: AI
 *   description: Claude-powered venue suggestions via real MCP server (InMemoryTransport)
 */
import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import * as AiController from '../controllers/ai.controller'

export const aiRouter = Router()

aiRouter.use(requireAuth)

/**
 * @openapi
 * /api/groups/{groupId}/ai-suggestions:
 *   post:
 *     tags: [AI]
 *     summary: Generate AI venue suggestions for a group (max 5/day per group)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               outingId: { type: string, description: Outing context to avoid duplicate places }
 *     responses:
 *       201: { description: Suggestions generated and stored }
 *       403: { description: Not a group member }
 *       429: { description: Daily limit reached }
 */
aiRouter.post('/groups/:groupId/ai-suggestions', AiController.getAISuggestions)

/**
 * @openapi
 * /api/groups/{groupId}/ai-suggestions:
 *   get:
 *     tags: [AI]
 *     summary: List non-dismissed AI suggestions for a group
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of AI suggestion records }
 */
aiRouter.get('/groups/:groupId/ai-suggestions', AiController.listAISuggestions)

/**
 * @openapi
 * /api/ai-suggestions/{id}:
 *   delete:
 *     tags: [AI]
 *     summary: Dismiss an AI suggestion
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Suggestion dismissed }
 *       404: { description: Not found }
 */
aiRouter.delete('/ai-suggestions/:id', AiController.dismissAISuggestion)
