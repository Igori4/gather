import { z } from 'zod'
import type { MCPTool, ToolContext } from '../types'

const inputSchema = z.object({
  groupId: z.string().describe('The group ID to get past outings for'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(5)
    .describe('Max number of past outings to return'),
})

export const getPastOutingsTool: MCPTool = {
  name: 'get_past_outings',
  description:
    'Get recent completed outings for a group to understand what types of venues have already been visited',
  inputSchema,
  async execute({ groupId, limit }, { db }: ToolContext) {
    const outings = await db.outing.findMany({
      where: { groupId, status: 'done' },
      take: limit as number,
      orderBy: { createdAt: 'desc' },
      include: {
        places: { select: { name: true, address: true }, take: 3 },
      },
    })
    return {
      outings: (
        outings as Array<{ title: string; places: { name: string; address: string }[] }>
      ).map(o => ({
        title: o.title,
        places: o.places,
      })),
    }
  },
}
