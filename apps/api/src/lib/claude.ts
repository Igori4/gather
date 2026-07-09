import Anthropic from '@anthropic-ai/sdk'
import { Client } from '@modelcontextprotocol/sdk/client'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { createGatherMCPServer } from '@gather/mcp'
import { AiSuggestionSchema } from '@gather/shared'
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
    outingId
      ? `The outing ID is: ${outingId}. Avoid suggesting places already added to this outing.`
      : '',
    '',
    'STEP 1: Call get_group_context to understand the group.',
    outingId
      ? 'STEP 2: Call get_outing_places to see what venues are already added — avoid duplicates.'
      : '',
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
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not set — returning static fallback')
    return STATIC_FALLBACK
  }

  const mapboxToken = process.env.MAPBOX_TOKEN ?? process.env.VITE_MAPBOX_TOKEN ?? ''
  const ctx = { db: prisma, mapboxToken }

  try {
    const mcpServer = createGatherMCPServer(ctx)
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await mcpServer.connect(serverTransport)

    const mcpClient = new Client({ name: 'gather-api', version: '1.0.0' })
    await mcpClient.connect(clientTransport)

    const { tools: mcpTools } = await mcpClient.listTools()
    const claudeTools: Anthropic.Tool[] = mcpTools.map(t => ({
      name: t.name,
      description: t.description ?? '',
      input_schema: t.inputSchema as Anthropic.Tool['input_schema'],
    }))

    const anthropic = new Anthropic({ apiKey })
    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: buildSystemPrompt(groupId, outingId) },
    ]

    let lastResponse: Anthropic.Message | null = null

    for (let turn = 0; turn < 5; turn++) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        tools: claudeTools,
        messages,
      })
      lastResponse = response

      if (response.stop_reason === 'end_turn') break

      const toolUses = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
      )
      if (toolUses.length === 0) break

      const toolResults = await Promise.all(
        toolUses.map(async tu => {
          const result = await mcpClient.callTool({
            name: tu.name,
            arguments: tu.input as Record<string, unknown>,
          })
          return {
            type: 'tool_result' as const,
            tool_use_id: tu.id,
            content: JSON.stringify(result.content),
          }
        })
      )

      messages.push({ role: 'assistant', content: response.content })
      messages.push({ role: 'user', content: toolResults })
    }

    await mcpClient.close()

    const textBlock = lastResponse?.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
    const text = textBlock?.text?.trim() ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in Claude response')

    const parsed = JSON.parse(jsonMatch[0])
    return AiSuggestionSchema.parse(parsed)
  } catch (err) {
    console.error('Claude agent failed:', err)
    return STATIC_FALLBACK
  }
}
