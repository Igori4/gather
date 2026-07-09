import { generateAISuggestions } from '../../src/lib/claude'

jest.mock('@modelcontextprotocol/sdk/client', () => ({
  Client: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    listTools: jest.fn().mockResolvedValue({ tools: [] }),
    callTool: jest.fn(),
    close: jest.fn(),
  })),
}))

jest.mock('@modelcontextprotocol/sdk/inMemory', () => ({
  InMemoryTransport: {
    createLinkedPair: jest.fn().mockReturnValue([{}, {}]),
  },
}))

jest.mock('@gather/mcp', () => ({
  createGatherMCPServer: jest.fn().mockReturnValue({ connect: jest.fn() }),
}))

jest.mock('../../src/lib/prisma', () => ({ prisma: {} }))

const mockCreate = jest.fn()
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}))

const VALID_SUGGESTIONS = {
  suggestions: [
    {
      name: 'Escape Room',
      category: 'Entertainment',
      whyItFits: 'Fun for groups.',
      estimatedCostRange: '$20–$30 per person',
      googleMapsLink: 'https://www.google.com/maps/search/escape+room',
    },
    {
      name: 'Rooftop Bar',
      category: 'Dining & Drinks',
      whyItFits: 'Great views.',
      estimatedCostRange: '$30–$50 per person',
      googleMapsLink: 'https://www.google.com/maps/search/rooftop+bar',
    },
    {
      name: 'Bowling',
      category: 'Sports & Fun',
      whyItFits: 'Casual fun.',
      estimatedCostRange: '$10–$20 per person',
      googleMapsLink: 'https://www.google.com/maps/search/bowling',
    },
  ],
}

describe('generateAISuggestions', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    process.env = { ...OLD_ENV, ANTHROPIC_API_KEY: 'test-key' }
    mockCreate.mockReset()
  })

  afterEach(() => {
    process.env = OLD_ENV
  })

  it('returns static fallback when ANTHROPIC_API_KEY is not set', async () => {
    delete process.env.ANTHROPIC_API_KEY

    const result = await generateAISuggestions('group1')

    expect(result.suggestions).toHaveLength(3)
    expect(result.suggestions[0].name).toBe('Local Escape Room')
  })

  it('returns parsed suggestions when Claude returns valid JSON', async () => {
    mockCreate.mockResolvedValue({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: JSON.stringify(VALID_SUGGESTIONS) }],
    })

    const result = await generateAISuggestions('group1')

    expect(result.suggestions).toHaveLength(3)
    expect(result.suggestions[0].name).toBe('Escape Room')
  })

  it('returns static fallback when Claude response has no JSON', async () => {
    mockCreate.mockResolvedValue({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Sorry, I cannot help.' }],
    })

    const result = await generateAISuggestions('group1')

    expect(result.suggestions[0].name).toBe('Local Escape Room')
  })

  it('returns static fallback when Claude throws', async () => {
    mockCreate.mockRejectedValue(new Error('API error'))

    const result = await generateAISuggestions('group1')

    expect(result.suggestions).toHaveLength(3)
  })

  it('includes outingId in system prompt when provided', async () => {
    mockCreate.mockResolvedValue({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: JSON.stringify(VALID_SUGGESTIONS) }],
    })

    await generateAISuggestions('group1', 'outing42')

    const callArgs = mockCreate.mock.calls[0][0]
    const content = callArgs.messages[0].content as string
    expect(content).toContain('outing42')
  })
})
