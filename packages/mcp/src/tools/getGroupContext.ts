import { z } from 'zod'
import type { MCPTool, ToolContext } from '../types'

const inputSchema = z.object({
  groupId: z.string().describe('The group ID to get context for'),
})

export const getGroupContextTool: MCPTool = {
  name: 'get_group_context',
  description: 'Get context about a group: name, member count, and number of past outings',
  inputSchema,
  async execute({ groupId }, { db }: ToolContext) {
    const group = await db.group.findUnique({
      where: { id: groupId },
      include: {
        _count: { select: { members: true, outings: true } },
      },
    })
    if (!group) throw new Error(`Group ${groupId} not found`)
    return {
      groupName: group.name as string,
      description: (group.description as string | null) ?? null,
      memberCount: (group._count as { members: number; outings: number }).members,
      outingCount: (group._count as { members: number; outings: number }).outings,
    }
  },
}
