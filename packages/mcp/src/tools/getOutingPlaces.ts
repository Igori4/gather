import { z } from 'zod'
import type { MCPTool, ToolContext } from '../types'

const inputSchema = z.object({
  outingId: z.string().describe('The outing ID to get existing places for'),
})

export const getOutingPlacesTool: MCPTool = {
  name: 'get_outing_places',
  description: 'Get places already added to a specific outing — use this to avoid suggesting duplicates',
  inputSchema,
  async execute({ outingId }, { db }: ToolContext) {
    const places = await db.outingPlace.findMany({
      where: { outingId },
      select: { name: true, address: true },
    })
    return { places: places as { name: string; address: string }[] }
  },
}
