const mockFindUnique = jest.fn()
const mockCreate = jest.fn()

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    experimentAssignment: {
      findUnique: mockFindUnique,
      create: mockCreate,
    },
  },
}))

// flags.ts defines experiment names — mock it so we don't need DB/env for flag definitions
jest.mock('../../src/lib/flags', () => ({
  experimentDefinitions: {
    'register-cta': { name: 'register-cta', variants: ['control', 'variant-a'] as const },
  },
  isExperimentName: (name: string) => name === 'register-cta',
}))

import { assignVariant } from '../../src/lib/experimentAssignment'

beforeEach(() => jest.clearAllMocks())

const subject = { userId: 'user_test_1' }
const experimentName = 'register-cta'

describe('assignVariant', () => {
  it('returns existing variant without creating a new one', async () => {
    mockFindUnique.mockResolvedValue({ variant: 'control' })

    const variant = await assignVariant(experimentName, subject)

    expect(variant).toBe('control')
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('creates and returns a new variant when none exists', async () => {
    mockFindUnique.mockResolvedValue(null)
    mockCreate.mockResolvedValue({ variant: 'variant-a' })

    const variant = await assignVariant(experimentName, subject)

    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(['control', 'variant-a']).toContain(variant)
  })

  it('handles race condition — reads back on create conflict', async () => {
    mockFindUnique
      .mockResolvedValueOnce(null)           // first lookup: no assignment
      .mockResolvedValueOnce({ variant: 'control' }) // second lookup after conflict
    mockCreate.mockRejectedValue(new Error('Unique constraint violation'))

    const variant = await assignVariant(experimentName, subject)

    expect(variant).toBe('control')
    expect(mockFindUnique).toHaveBeenCalledTimes(2)
  })

  it('throws when neither userId nor anonymousId provided', async () => {
    await expect(assignVariant(experimentName, {})).rejects.toThrow()
  })

  it('works with anonymousId instead of userId', async () => {
    mockFindUnique.mockResolvedValue(null)
    mockCreate.mockResolvedValue({ variant: 'variant-a' })

    const variant = await assignVariant(experimentName, { anonymousId: 'anon_abc' })

    expect(['control', 'variant-a']).toContain(variant)
  })
})
