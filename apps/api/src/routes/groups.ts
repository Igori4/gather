/**
 * @openapi
 * tags:
 *   name: Groups
 *   description: Group management — create, list, invite members
 */

import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import * as GroupsController from '../controllers/groups.controller'

export const groupsRouter = Router()

groupsRouter.use(requireAuth)

/**
 * @openapi
 * /api/groups:
 *   post:
 *     tags: [Groups]
 *     summary: Create a new group (creator becomes admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:        { type: string }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: Group created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Group'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
groupsRouter.post('/', GroupsController.createGroup)

/**
 * @openapi
 * /api/groups:
 *   get:
 *     tags: [Groups]
 *     summary: List all groups the current user belongs to
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of groups with member count
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Group'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
groupsRouter.get('/', GroupsController.listGroups)

/**
 * @openapi
 * /api/groups/accept-invite:
 *   post:
 *     tags: [Groups]
 *     summary: Accept an invitation token and join the group
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string }
 *     responses:
 *       200:
 *         description: Joined successfully — returns the group
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Group'
 *       400:
 *         description: Missing, invalid, or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Already a member of this group
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Must be declared before /:id to avoid "accept-invite" matching :id
groupsRouter.post('/accept-invite', GroupsController.acceptInvite)

/**
 * @openapi
 * /api/groups/{id}:
 *   get:
 *     tags: [Groups]
 *     summary: Get a single group with its members (members only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Group with members
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Group'
 *       403:
 *         description: Not a member of this group
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Group not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
groupsRouter.get('/:id', GroupsController.getGroup)

/**
 * @openapi
 * /api/groups/{id}/invite:
 *   post:
 *     tags: [Groups]
 *     summary: Generate an invitation token (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, role]
 *             properties:
 *               email: { type: string, format: email }
 *               role:
 *                 type: string
 *                 enum: [admin, member]
 *     responses:
 *       201:
 *         description: Invitation created — returns token and email
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *                 email: { type: string }
 *       403:
 *         description: Only admins can invite members
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
groupsRouter.post('/:id/invite', GroupsController.inviteMember)
