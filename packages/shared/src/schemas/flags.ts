import { z } from 'zod'

export const FlagsResponseSchema = z.object({
  flags: z.record(z.string(), z.boolean()),
})
export type FlagsResponse = z.infer<typeof FlagsResponseSchema>

export const VariantResponseSchema = z.object({
  experimentName: z.string(),
  variant: z.string(),
})
export type VariantResponse = z.infer<typeof VariantResponseSchema>

export const TrackEventSchema = z.object({
  type: z.enum(['experiment_exposed', 'experiment_converted']),
  experimentName: z.string().optional(),
  variant: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
})
export type TrackEvent = z.infer<typeof TrackEventSchema>
