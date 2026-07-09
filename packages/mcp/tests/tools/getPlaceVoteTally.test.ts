import { getPlaceVoteTallyTool } from '../../src/tools/getPlaceVoteTally'

const mockDb = {
  outingPlace: { findMany: jest.fn() },
}

const ctx = { db: mockDb, mapboxToken: '' }

beforeEach(() => jest.clearAllMocks())

describe('getPlaceVoteTallyTool', () => {
  it('returns places sorted by score descending', async () => {
    mockDb.outingPlace.findMany.mockResolvedValue([
      {
        placeId: 'p1',
        name: 'Escape Room',
        address: '1 Main St',
        votes: [{ vote: 'up' }, { vote: 'up' }, { vote: 'down' }],
      },
      {
        placeId: 'p2',
        name: 'Bowling Alley',
        address: '2 Side St',
        votes: [{ vote: 'up' }, { vote: 'up' }, { vote: 'up' }],
      },
    ])

    const result = (await getPlaceVoteTallyTool.execute({ outingId: 'o1' }, ctx)) as {
      places: Array<{ placeId: string; upVotes: number; downVotes: number; score: number }>
    }

    expect(result.places).toHaveLength(2)
    expect(result.places[0].placeId).toBe('p2')
    expect(result.places[0].upVotes).toBe(3)
    expect(result.places[0].score).toBe(3)
    expect(result.places[1].score).toBe(1)
  })

  it('returns empty when no places', async () => {
    mockDb.outingPlace.findMany.mockResolvedValue([])

    const result = (await getPlaceVoteTallyTool.execute({ outingId: 'o1' }, ctx)) as {
      places: unknown[]
    }

    expect(result.places).toHaveLength(0)
  })

  it('score is negative when more downvotes', async () => {
    mockDb.outingPlace.findMany.mockResolvedValue([
      {
        placeId: 'p1',
        name: 'Bad Place',
        address: '3 St',
        votes: [{ vote: 'down' }, { vote: 'down' }, { vote: 'up' }],
      },
    ])

    const result = (await getPlaceVoteTallyTool.execute({ outingId: 'o1' }, ctx)) as {
      places: Array<{ score: number }>
    }

    expect(result.places[0].score).toBe(-1)
  })
})
