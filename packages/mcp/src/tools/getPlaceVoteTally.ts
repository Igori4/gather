import { z } from 'zod'
import type { MCPTool, ToolContext } from '../types'

const inputSchema = z.object({
  outingId: z.string().describe('The outing ID to get vote tallies for'),
})

export const getPlaceVoteTallyTool: MCPTool = {
  name: 'get_place_vote_tally',
  description:
    'Get detailed vote tallies for all places in an outing, sorted by score (upvotes minus downvotes)',
  inputSchema,
  async execute({ outingId }, { db }: ToolContext) {
    const places = await db.outingPlace.findMany({
      where: { outingId },
      include: { votes: { select: { vote: true } } },
    })

    return {
      places: (
        places as Array<{
          placeId: string
          name: string
          address: string
          votes: Array<{ vote: string }>
        }>
      )
        .map(place => {
          const upVotes = place.votes.filter(v => v.vote === 'up').length
          const downVotes = place.votes.filter(v => v.vote === 'down').length
          return {
            placeId: place.placeId,
            name: place.name,
            address: place.address,
            upVotes,
            downVotes,
            score: upVotes - downVotes,
          }
        })
        .sort((a, b) => b.score - a.score),
    }
  },
}
