/**
 * @openapi
 * tags:
 *   name: Outings
 *   description: Outing planning within a group
 */
import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import * as OutingsController from '../controllers/outings.controller'

export const outingsRouter = Router()

outingsRouter.use(requireAuth)

/**
 * @openapi
 * /api/groups/{groupId}/outings:
 *   post:
 *     tags: [Outings]
 *     summary: Create a new outing in a group (members only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *     responses:
 *       201: { description: Outing created }
 *       400: { description: Validation error }
 *       403: { description: Not a group member }
 */
outingsRouter.post('/groups/:groupId/outings', OutingsController.createOuting)

/**
 * @openapi
 * /api/groups/{groupId}/outings:
 *   get:
 *     tags: [Outings]
 *     summary: List outings for a group (members only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Array of outings }
 *       403: { description: Not a group member }
 */
outingsRouter.get('/groups/:groupId/outings', OutingsController.listOutings)

/**
 * @openapi
 * /api/outings/{id}:
 *   get:
 *     tags: [Outings]
 *     summary: Get outing detail (members only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Outing detail }
 *       403: { description: Not a group member }
 *       404: { description: Outing not found }
 */
outingsRouter.get('/outings/:id', OutingsController.getOuting)

/**
 * @openapi
 * /api/outings/{id}/places:
 *   post:
 *     tags: [Outings]
 *     summary: Add a place to an outing (members only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [placeId, name, address, lat, lng]
 *             properties:
 *               placeId: { type: string }
 *               name: { type: string }
 *               address: { type: string }
 *               lat: { type: number }
 *               lng: { type: number }
 *               mapboxUrl: { type: string }
 *     responses:
 *       201: { description: Place added }
 *       400: { description: Validation error }
 *       403: { description: Not a group member }
 *       404: { description: Outing not found }
 *       409: { description: Place already added }
 */
outingsRouter.post('/outings/:id/places', OutingsController.addPlace)

/**
 * @openapi
 * /api/outings/{id}/places/{placeId}:
 *   delete:
 *     tags: [Outings]
 *     summary: Remove a place from an outing (members only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: placeId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Place removed }
 *       403: { description: Not a group member }
 *       404: { description: Outing or place not found }
 */
outingsRouter.delete('/outings/:id/places/:placeId', OutingsController.removePlace)
