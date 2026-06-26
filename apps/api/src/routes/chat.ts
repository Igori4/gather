/**
 * @openapi
 * tags:
 *   name: Chat
 *   description: Per-outing chat messages
 */
import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import * as ChatController from '../controllers/chat.controller'

export const chatRouter = Router()

chatRouter.use(requireAuth)

/**
 * @openapi
 * /api/outings/{id}/messages:
 *   get:
 *     tags: [Chat]
 *     summary: List messages (cursor pagination, newest-first)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 30 }
 *     responses:
 *       200:
 *         description: Messages page
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages: { type: array }
 *                 nextCursor: { type: string, nullable: true }
 *       403: { description: Not a group member }
 */
chatRouter.get('/outings/:id/messages', ChatController.listMessages)

/**
 * @openapi
 * /api/outings/{id}/messages:
 *   post:
 *     tags: [Chat]
 *     summary: Send a message (persists to DB + emits socket event)
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
 *             required: [body]
 *             properties:
 *               body: { type: string, maxLength: 2000 }
 *     responses:
 *       201: { description: Message created and emitted }
 *       400: { description: Validation error }
 *       403: { description: Not a group member }
 */
chatRouter.post('/outings/:id/messages', ChatController.sendMessage)

/**
 * @openapi
 * /api/outings/{id}/messages/{messageId}:
 *   patch:
 *     tags: [Chat]
 *     summary: Edit own message
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Updated message }
 *       403: { description: Forbidden — not author }
 *       404: { description: Message not found }
 */
chatRouter.patch('/outings/:id/messages/:messageId', ChatController.editMessage)

/**
 * @openapi
 * /api/outings/{id}/messages/{messageId}:
 *   delete:
 *     tags: [Chat]
 *     summary: Delete own message
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Deleted }
 *       403: { description: Forbidden — not author }
 *       404: { description: Message not found }
 */
chatRouter.delete('/outings/:id/messages/:messageId', ChatController.deleteMessage)
