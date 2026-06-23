import { z } from 'zod'

export const AiSuggestionSchema = z.object({
  suggestions: z
    .array(
      z.object({
        name: z.string(),
        category: z.string(),
        whyItFits: z.string(),
        estimatedCostRange: z.string(),
        googleMapsLink: z.string().url(),
      })
    )
    .length(3),
})

export type AiSuggestion = z.infer<typeof AiSuggestionSchema>
