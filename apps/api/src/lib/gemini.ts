import { GoogleGenerativeAI } from '@google/generative-ai'
import { AiSuggestionSchema } from '@gather/shared'
import { toolDefinitions, toGeminiFunctionDeclarations, executeToolCall } from '@gather/mcp'
import { prisma } from './prisma'
import type { z } from 'zod'

type Suggestions = z.infer<typeof AiSuggestionSchema>

const STATIC_FALLBACK: Suggestions = {
  suggestions: [
    {
      name: 'Local Escape Room',
      category: 'Entertainment',
      whyItFits: 'Great for groups looking for a fun team challenge.',
      estimatedCostRange: '$15–$30 per person',
      googleMapsLink: 'https://www.google.com/maps/search/escape+room',
    },
    {
      name: 'Rooftop Bar & Terrace',
      category: 'Dining & Drinks',
      whyItFits: 'Perfect for socialising with scenic views.',
      estimatedCostRange: '$20–$50 per person',
      googleMapsLink: 'https://www.google.com/maps/search/rooftop+bar',
    },
    {
      name: 'Bowling Alley',
      category: 'Sports & Fun',
      whyItFits: 'Casual and fun for any group size.',
      estimatedCostRange: '$10–$20 per person',
      googleMapsLink: 'https://www.google.com/maps/search/bowling+alley',
    },
  ],
}

function buildSystemPrompt(groupId: string, outingId?: string): string {
  return [
    'You are a social outing assistant for Gather, an app that helps friend groups plan outings.',
    `You are generating venue suggestions for group ID: ${groupId}.`,
    outingId ? `The outing ID is: ${outingId}. Avoid suggesting places already added to this outing.` : '',
    '',
    'STEP 1: Call get_group_context to understand the group.',
    outingId ? 'STEP 2: Call get_outing_places to see what venues are already added — avoid duplicates.' : '',
    'STEP 3: Call get_past_outings to see where they have been before — aim for variety.',
    'STEP 4: Call search_mapbox_places 1-2 times with specific queries to find real local venues.',
    '',
    'After gathering context, respond with a JSON object in EXACTLY this format:',
    '{ "suggestions": [ { "name": "Venue Name", "category": "Category", "whyItFits": "1-2 sentences", "estimatedCostRange": "$X–$Y per person", "googleMapsLink": "https://www.google.com/maps/search/..." }, ... ] }',
    'Return EXACTLY 3 suggestions. Return ONLY the JSON object, no markdown, no extra text.',
  ]
    .filter(Boolean)
    .join('\n')
}

export async function generateAISuggestions(
  groupId: string,
  outingId?: string
): Promise<Suggestions> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('GEMINI_API_KEY not set — returning static fallback')
    return STATIC_FALLBACK
  }

  const mapboxToken = process.env.MAPBOX_TOKEN ?? process.env.VITE_MAPBOX_TOKEN ?? ''
  const ctx = { db: prisma, mapboxToken }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const functionDeclarations = toGeminiFunctionDeclarations(toolDefinitions)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chat = model.startChat({ tools: [{ functionDeclarations }] as any })

    const prompt = buildSystemPrompt(groupId, outingId)
    let result = await chat.sendMessage(prompt)

    for (let turn = 0; turn < 4; turn++) {
      const calls = result.response.functionCalls()
      if (!calls || calls.length === 0) break

      const responses = await Promise.all(
        calls.map(async call => {
          const response = await executeToolCall(
            call.name,
            call.args as Record<string, unknown>,
            ctx
          )
          return { functionResponse: { name: call.name, response: response as object } }
        })
      )

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result = await chat.sendMessage(responses as any)
    }

    const text = result.response.text().trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in Gemini response')

    const parsed = JSON.parse(jsonMatch[0])
    return AiSuggestionSchema.parse(parsed)
  } catch (err) {
    console.error('Gemini agent failed:', err)
    return STATIC_FALLBACK
  }
}
