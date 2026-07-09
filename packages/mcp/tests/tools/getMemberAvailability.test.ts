import { getMemberAvailabilityTool } from '../../src/tools/getMemberAvailability'

const mockDb = {
  timeSlot: { findMany: jest.fn() },
  outing: { findUnique: jest.fn() },
  groupMember: { count: jest.fn() },
}

const ctx = { db: mockDb, mapboxToken: '' }

beforeEach(() => jest.clearAllMocks())

describe('getMemberAvailabilityTool', () => {
  it('returns slots with availability counts', async () => {
    mockDb.timeSlot.findMany.mockResolvedValue([
      {
        id: 'slot1',
        startsAt: new Date('2026-08-01T18:00:00Z'),
        endsAt: new Date('2026-08-01T21:00:00Z'),
        votes: [
          { userId: 'u1', available: true },
          { userId: 'u2', available: false },
          { userId: 'u3', available: true },
        ],
      },
    ])
    mockDb.outing.findUnique.mockResolvedValue({ groupId: 'g1' })
    mockDb.groupMember.count.mockResolvedValue(3)

    const result = (await getMemberAvailabilityTool.execute({ outingId: 'o1' }, ctx)) as {
      slots: Array<{ slotId: string; availableCount: number; totalMembers: number }>
    }

    expect(result.slots).toHaveLength(1)
    expect(result.slots[0].slotId).toBe('slot1')
    expect(result.slots[0].availableCount).toBe(2)
    expect(result.slots[0].totalMembers).toBe(3)
  })

  it('returns empty slots when outing has none', async () => {
    mockDb.timeSlot.findMany.mockResolvedValue([])
    mockDb.outing.findUnique.mockResolvedValue({ groupId: 'g1' })
    mockDb.groupMember.count.mockResolvedValue(2)

    const result = (await getMemberAvailabilityTool.execute({ outingId: 'o1' }, ctx)) as {
      slots: unknown[]
    }

    expect(result.slots).toHaveLength(0)
  })

  it('totalMembers is 0 when outing not found', async () => {
    mockDb.timeSlot.findMany.mockResolvedValue([])
    mockDb.outing.findUnique.mockResolvedValue(null)

    const result = (await getMemberAvailabilityTool.execute({ outingId: 'missing' }, ctx)) as {
      slots: unknown[]
    }

    expect(result.slots).toHaveLength(0)
    expect(mockDb.groupMember.count).not.toHaveBeenCalled()
  })
})
