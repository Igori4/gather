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

/**
 * @openapi
 * /api/outings/{id}/places/{placeId}/vote:
 *   post:
 *     tags: [Outings]
 *     summary: Cast or toggle a vote (up/down) on a place (members only)
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [vote]
 *             properties:
 *               vote: { type: string, enum: [up, down] }
 *     responses:
 *       200: { description: "Vote tally: { up, down, userVote }" }
 *       400: { description: Validation error }
 *       403: { description: Not a group member }
 *       404: { description: Outing or place not found }
 */
outingsRouter.post('/outings/:id/places/:placeId/vote', OutingsController.castVote)

/**
 * @openapi
 * /api/outings/{id}/slots:
 *   post:
 *     tags: [Outings]
 *     summary: Propose a time slot (members only)
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
 *             required: [startsAt, endsAt]
 *             properties:
 *               startsAt: { type: string, format: date-time }
 *               endsAt: { type: string, format: date-time }
 *     responses:
 *       201: { description: Slot created }
 *       400: { description: Validation error or endsAt <= startsAt }
 *       403: { description: Not a group member }
 *       404: { description: Outing not found }
 */
outingsRouter.post('/outings/:id/slots', OutingsController.proposeSlot)

/**
 * @openapi
 * /api/outings/{id}/slots/{slotId}/vote:
 *   post:
 *     tags: [Outings]
 *     summary: Vote availability for a time slot (members only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: slotId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [available]
 *             properties:
 *               available: { type: boolean }
 *     responses:
 *       200: { description: "Tally: { available, unavailable, userVote }" }
 *       400: { description: available must be boolean }
 *       403: { description: Not a group member }
 *       404: { description: Outing or slot not found }
 */
outingsRouter.post('/outings/:id/slots/:slotId/vote', OutingsController.voteSlot)

/**
 * @openapi
 * /api/outings/{id}/slots/{slotId}:
 *   delete:
 *     tags: [Outings]
 *     summary: Delete a time slot (any member)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: slotId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Slot deleted }
 *       403: { description: Not a group member }
 *       404: { description: Outing or slot not found }
 */
outingsRouter.delete('/outings/:id/slots/:slotId', OutingsController.deleteSlot)
