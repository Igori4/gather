import { z } from 'zod'

export const SendMessageSchema = z.object({
  body: z.string().min(1).max(2000),
})

export const EditMessageSchema = z.object({
  body: z.string().min(1).max(2000),
})

export type SendMessageInput = z.infer<typeof SendMessageSchema>
export type EditMessageInput = z.infer<typeof EditMessageSchema>
