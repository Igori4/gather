import { z } from 'zod'
import type { MCPTool, ToolContext } from '../types'

const inputSchema = z.object({
  outingId: z.string().describe('The outing ID to get member availability for'),
})

export const getMemberAvailabilityTool: MCPTool = {
  name: 'get_member_availability',
  description:
    'Get time slot vote results for an outing — shows how many members are available for each proposed slot',
  inputSchema,
  async execute({ outingId }, { db }: ToolContext) {
    const [slots, outing] = await Promise.all([
      db.timeSlot.findMany({
        where: { outingId },
        include: { votes: { select: { userId: true, available: true } } },
        orderBy: { startsAt: 'asc' },
      }),
      db.outing.findUnique({ where: { id: outingId }, select: { groupId: true } }),
    ])

    const totalMembers = outing
      ? await db.groupMember.count({ where: { groupId: outing.groupId } })
      : 0

    return {
      slots: (
        slots as Array<{
          id: string
          startsAt: Date
          endsAt: Date
          votes: Array<{ userId: string; available: boolean }>
        }>
      ).map(slot => ({
        slotId: slot.id,
        startsAt: slot.startsAt.toISOString(),
        endsAt: slot.endsAt.toISOString(),
        availableCount: slot.votes.filter(v => v.available).length,
        totalMembers,
        votes: slot.votes,
      })),
    }
  },
}
