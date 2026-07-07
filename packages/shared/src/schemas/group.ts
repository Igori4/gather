import { z } from 'zod'

export const CreateGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
})

export const InviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member']).default('member'),
})

export const UpdateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
})

export type CreateGroupInput = z.infer<typeof CreateGroupSchema>
export type InviteMemberInput = z.infer<typeof InviteMemberSchema>
export type UpdateGroupInput = z.infer<typeof UpdateGroupSchema>
