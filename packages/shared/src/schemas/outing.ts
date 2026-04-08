import { z } from 'zod'

export const CreateOutingSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
})

export const AddPlaceSchema = z.object({
  placeId: z.string(),
  name: z.string().min(1),
  address: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  mapboxUrl: z.string().url().optional(),
})

export const CastVoteSchema = z.object({
  vote: z.enum(['up', 'down']),
})

export const RSVPSchema = z.object({
  status: z.enum(['going', 'maybe', 'not_going']),
})

export const ProposeSlotSchema = z.object({
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
})

export type CreateOutingInput = z.infer<typeof CreateOutingSchema>
export type AddPlaceInput = z.infer<typeof AddPlaceSchema>
export type CastVoteInput = z.infer<typeof CastVoteSchema>
export type RSVPInput = z.infer<typeof RSVPSchema>
export type ProposeSlotInput = z.infer<typeof ProposeSlotSchema>
