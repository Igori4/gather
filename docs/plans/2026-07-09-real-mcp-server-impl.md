# Real MCP Server Implementation Plan

**Goal:** Replace Gemini agent with Claude + real MCP server using `@modelcontextprotocol/sdk`, keeping all AI suggestion endpoints functional.
**Architecture:** In-process MCP server with `InMemoryTransport` (same protocol as stdio, no subprocess complexity — Prisma stays in API process). `createGatherMCPServer(ctx)` in `packages/mcp/`, `claude.ts` replaces `gemini.ts` in `apps/api/src/lib/`.
**Tech Stack:** `@anthropic-ai/sdk`, `@modelcontextprotocol/sdk`, Claude claude-sonnet-4-6, existing Prisma + Zod.
**Execution:** Use the `executing-plans` skill to implement this plan task-by-task.

> **Transport note:** Using `InMemoryTransport` instead of `StdioClientTransport`. Same MCP protocol (ListTools / CallTool), no subprocess Prisma-sharing issues. Change to stdio later by swapping one line in `claude.ts`.

---

## Task 1: Install packages

**Type:** non-TDD — package installation

**Files:**
- Modify: `packages/mcp/package.json`
- Modify: `apps/api/package.json`

**Step 1: Install MCP SDK in packages/mcp**

```bash
npm install @modelcontextprotocol/sdk --workspace=packages/mcp
```

Expected output: `added N packages`

**Step 2: Install Anthropic SDK + MCP SDK in apps/api, remove Gemini**

```bash
npm install @anthropic-ai/sdk @modelcontextprotocol/sdk --workspace=apps/api
npm uninstall @google/generative-ai --workspace=apps/api
```

Expected output: packages added/removed without errors

**Step 3: Verify**

```bash
npm run typecheck --workspace=packages/mcp
```

Expected: no errors (no code changed yet, just new deps)

**Step 4: Commit**

```bash
git add packages/mcp/package.json apps/api/package.json package-lock.json
git commit -m "chore(deps): add @modelcontextprotocol/sdk + @anthropic-ai/sdk, remove gemini"
```

---

## Task 2: Refactor MCP types

**Type:** non-TDD — type cleanup, no behavior change

**Files:**
- Modify: `packages/mcp/src/types.ts`

**Step 1: Replace file content**

```typescript
// packages/mcp/src/types.ts
import { z } from 'zod'

export interface ToolContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any
  mapboxToken: string
}

export interface MCPTool {
  name: string
  description: string
  inputSchema: z.ZodObject<z.ZodRawShape>
  execute: (input: Record<string, unknown>, ctx: ToolContext) => Promise<unknown>
}
```

(Removed `GeminiPropertySchema` and `GeminiFunctionDeclaration` — replaced by MCP SDK types)

**Step 2: Verify**

```bash
npm run typecheck --workspace=packages/mcp
```

Expected: no errors

**Step 3: Commit**

```bash
git add packages/mcp/src/types.ts
git commit -m "refactor(mcp): remove Gemini-specific types from types.ts"
```

---

## Task 3: Add getMemberAvailability tool (TDD)

**Files:**
- Create: `packages/mcp/src/tools/getMemberAvailability.ts`
- Create: `packages/mcp/tests/tools/getMemberAvailability.test.ts`

**Step 1: Write failing test**

Create `packages/mcp/tests/tools/getMemberAvailability.test.ts`:

```typescript
import { getMemberAvailabilityTool } from '../../src/tools/getMemberAvailability'

const mockDb = {
  timeSlot: {
    findMany: jest.fn(),
  },
  outing: {
    findUnique: jest.fn(),
  },
  groupMember: {
    count: jest.fn(),
  },
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

    const result = await getMemberAvailabilityTool.execute(
      { outingId: 'o1' },
      ctx
    ) as { slots: Array<{ slotId: string; availableCount: number; totalMembers: number }> }

    expect(result.slots).toHaveLength(1)
    expect(result.slots[0].slotId).toBe('slot1')
    expect(result.slots[0].availableCount).toBe(2)
    expect(result.slots[0].totalMembers).toBe(3)
  })

  it('returns empty slots when outing has none', async () => {
    mockDb.timeSlot.findMany.mockResolvedValue([])
    mockDb.outing.findUnique.mockResolvedValue({ groupId: 'g1' })
    mockDb.groupMember.count.mockResolvedValue(2)

    const result = await getMemberAvailabilityTool.execute(
      { outingId: 'o1' },
      ctx
    ) as { slots: unknown[] }

    expect(result.slots).toHaveLength(0)
  })
})
```

**Step 2: Run test — verify it fails**

```bash
npm test --workspace=packages/mcp -- --testPathPattern="getMemberAvailability"
```

Expected: FAIL — "Cannot find module"

**Step 3: Implement tool**

Create `packages/mcp/src/tools/getMemberAvailability.ts`:

```typescript
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
      slots: (slots as Array<{
        id: string
        startsAt: Date
        endsAt: Date
        votes: Array<{ userId: string; available: boolean }>
      }>).map(slot => ({
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
```

**Step 4: Add jest config to packages/mcp**

Add to `packages/mcp/package.json`:

```json
"scripts": {
  "test": "jest",
  "typecheck": "tsc --noEmit"
},
"devDependencies": {
  "@types/jest": "^29.5.12",
  "jest": "^29.7.0",
  "ts-jest": "^29.1.2"
},
"jest": {
  "preset": "ts-jest",
  "testEnvironment": "node"
}
```

Then run:
```bash
npm install --workspace=packages/mcp
```

**Step 5: Run test — verify it passes**

```bash
npm test --workspace=packages/mcp -- --testPathPattern="getMemberAvailability"
```

Expected: PASS

**Step 6: Commit**

```bash
git add packages/mcp/src/tools/getMemberAvailability.ts packages/mcp/tests/tools/getMemberAvailability.test.ts packages/mcp/package.json
git commit -m "feat(mcp): add getMemberAvailability tool"
```

---

## Task 4: Add getPlaceVoteTally tool (TDD)

**Files:**
- Create: `packages/mcp/src/tools/getPlaceVoteTally.ts`
- Create: `packages/mcp/tests/tools/getPlaceVoteTally.test.ts`

**Step 1: Write failing test**

Create `packages/mcp/tests/tools/getPlaceVoteTally.test.ts`:

```typescript
import { getPlaceVoteTallyTool } from '../../src/tools/getPlaceVoteTally'

const mockDb = {
  outingPlace: {
    findMany: jest.fn(),
  },
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

    const result = await getPlaceVoteTallyTool.execute(
      { outingId: 'o1' },
      ctx
    ) as { places: Array<{ placeId: string; upVotes: number; downVotes: number; score: number }> }

    expect(result.places).toHaveLength(2)
    expect(result.places[0].placeId).toBe('p2') // score 3 wins
    expect(result.places[0].upVotes).toBe(3)
    expect(result.places[0].score).toBe(3)
    expect(result.places[1].score).toBe(1) // 2 up - 1 down
  })

  it('returns empty when no places', async () => {
    mockDb.outingPlace.findMany.mockResolvedValue([])

    const result = await getPlaceVoteTallyTool.execute(
      { outingId: 'o1' },
      ctx
    ) as { places: unknown[] }

    expect(result.places).toHaveLength(0)
  })
})
```

**Step 2: Run test — verify it fails**

```bash
npm test --workspace=packages/mcp -- --testPathPattern="getPlaceVoteTally"
```

Expected: FAIL — "Cannot find module"

**Step 3: Implement tool**

Create `packages/mcp/src/tools/getPlaceVoteTally.ts`:

```typescript
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
      places: (places as Array<{
        placeId: string
        name: string
        address: string
        votes: Array<{ vote: string }>
      }>)
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
```

**Step 4: Run test — verify it passes**

```bash
npm test --workspace=packages/mcp -- --testPathPattern="getPlaceVoteTally"
```

Expected: PASS

**Step 5: Commit**

```bash
git add packages/mcp/src/tools/getPlaceVoteTally.ts packages/mcp/tests/tools/getPlaceVoteTally.test.ts
git commit -m "feat(mcp): add getPlaceVoteTally tool"
```

---

## Task 5: Create MCP server

**Type:** non-TDD — scaffolding (server wiring, no testable behavior beyond integration)

**Files:**
- Create: `packages/mcp/src/server.ts`

**Step 1: Create server.ts**

```typescript
// packages/mcp/src/server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import type { MCPTool, ToolContext } from './types'
import { getGroupContextTool } from './tools/getGroupContext'
import { getOutingPlacesTool } from './tools/getOutingPlaces'
import { getPastOutingsTool } from './tools/getPastOutings'
import { searchMapboxPlacesTool } from './tools/searchMapboxPlaces'
import { getMemberAvailabilityTool } from './tools/getMemberAvailability'
import { getPlaceVoteTallyTool } from './tools/getPlaceVoteTally'

const ALL_TOOLS: MCPTool[] = [
  getGroupContextTool,
  getOutingPlacesTool,
  getPastOutingsTool,
  searchMapboxPlacesTool,
  getMemberAvailabilityTool,
  getPlaceVoteTallyTool,
]

function zodFieldToJsonSchema(schema: z.ZodTypeAny): { type: string; description?: string; nullable?: boolean } {
  const description = schema.description
  if (schema instanceof z.ZodString) return { type: 'string', description }
  if (schema instanceof z.ZodNumber) return { type: 'number', description }
  if (schema instanceof z.ZodBoolean) return { type: 'boolean', description }
  if (schema instanceof z.ZodOptional) return { ...zodFieldToJsonSchema(schema.unwrap()), nullable: true }
  if (schema instanceof z.ZodDefault) return zodFieldToJsonSchema(schema._def.innerType)
  return { type: 'string', description }
}

function toJsonSchema(tool: MCPTool) {
  const shape = tool.inputSchema.shape
  const properties: Record<string, { type: string; description?: string }> = {}
  const required: string[] = []

  for (const [key, field] of Object.entries(shape)) {
    properties[key] = zodFieldToJsonSchema(field as z.ZodTypeAny)
    const isOptional = field instanceof z.ZodOptional || field instanceof z.ZodDefault
    if (!isOptional) required.push(key)
  }

  return { type: 'object' as const, properties, required }
}

export function createGatherMCPServer(ctx: ToolContext): Server {
  const server = new Server(
    { name: 'gather-mcp', version: '1.0.0' },
    { capabilities: { tools: {} } }
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: ALL_TOOLS.map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: toJsonSchema(t),
    })),
  }))

  server.setRequestHandler(CallToolRequestSchema, async req => {
    const { name, arguments: args } = req.params
    const tool = ALL_TOOLS.find(t => t.name === name)
    if (!tool) {
      return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true }
    }

    try {
      const parsed = tool.inputSchema.parse(args ?? {})
      const result = await tool.execute(parsed, ctx)
      return { content: [{ type: 'text', text: JSON.stringify(result) }] }
    } catch (err) {
      return { content: [{ type: 'text', text: String(err) }], isError: true }
    }
  })

  return server
}
```

**Step 2: Verify typecheck**

```bash
npm run typecheck --workspace=packages/mcp
```

Expected: no errors

**Step 3: Commit**

```bash
git add packages/mcp/src/server.ts
git commit -m "feat(mcp): add real MCP server with ListTools/CallTool handlers"
```

---

## Task 6: Rewrite packages/mcp index.ts

**Type:** non-TDD — re-export, no behavior

**Files:**
- Modify: `packages/mcp/src/index.ts`
- Delete: `packages/mcp/src/tools/registry.ts`
- Delete: `packages/mcp/src/tools/executor.ts`

**Step 1: Replace index.ts**

```typescript
// packages/mcp/src/index.ts
export { createGatherMCPServer } from './server'
export type { MCPTool, ToolContext } from './types'
```

**Step 2: Delete old files**

```bash
rm packages/mcp/src/tools/registry.ts
rm packages/mcp/src/tools/executor.ts
```

**Step 3: Verify**

```bash
npm run typecheck --workspace=packages/mcp
```

Expected: no errors

**Step 4: Commit**

```bash
git add packages/mcp/src/index.ts
git rm packages/mcp/src/tools/registry.ts packages/mcp/src/tools/executor.ts
git commit -m "refactor(mcp): replace registry/executor with real MCP server exports"
```

---

## Task 7: Create claude.ts (TDD)

**Files:**
- Create: `apps/api/src/lib/claude.ts`
- Create: `apps/api/tests/lib/claude.test.ts`

**Step 1: Write failing tests**

Create `apps/api/tests/lib/claude.test.ts`:

```typescript
import { generateAISuggestions } from '../../src/lib/claude'

// Mock MCP SDK
jest.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    listTools: jest.fn().mockResolvedValue({ tools: [] }),
    callTool: jest.fn(),
    close: jest.fn(),
  })),
}))

jest.mock('@modelcontextprotocol/sdk/inMemory.js', () => ({
  InMemoryTransport: {
    createLinkedPair: jest.fn().mockReturnValue([{}, {}]),
  },
}))

jest.mock('@gather/mcp', () => ({
  createGatherMCPServer: jest.fn().mockReturnValue({
    connect: jest.fn(),
  }),
}))

jest.mock('../../src/lib/prisma', () => ({ prisma: {} }))

const mockCreate = jest.fn()
jest.mock('@anthropic-ai/sdk', () => ({
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
    jest.resetModules()
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
      content: [
        {
          type: 'text',
          text: JSON.stringify(VALID_SUGGESTIONS),
        },
      ],
    })

    const result = await generateAISuggestions('group1')

    expect(result.suggestions).toHaveLength(3)
    expect(result.suggestions[0].name).toBe('Escape Room')
  })

  it('returns static fallback when Claude response has no JSON', async () => {
    mockCreate.mockResolvedValue({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Sorry, I cannot help with that.' }],
    })

    const result = await generateAISuggestions('group1')

    expect(result.suggestions).toHaveLength(3)
    expect(result.suggestions[0].name).toBe('Local Escape Room')
  })

  it('returns static fallback when Claude throws', async () => {
    mockCreate.mockRejectedValue(new Error('API error'))

    const result = await generateAISuggestions('group1')

    expect(result.suggestions).toHaveLength(3)
  })

  it('passes outingId in system prompt context', async () => {
    mockCreate.mockResolvedValue({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: JSON.stringify(VALID_SUGGESTIONS) }],
    })

    await generateAISuggestions('group1', 'outing42')

    const callArgs = mockCreate.mock.calls[0][0]
    const userMessage = callArgs.messages[0].content as string
    expect(userMessage).toContain('outing42')
  })
})
```

**Step 2: Run test — verify it fails**

```bash
npm test --workspace=apps/api -- --testPathPattern="tests/lib/claude"
```

Expected: FAIL — "Cannot find module '../../src/lib/claude'"

**Step 3: Implement claude.ts**

Create `apps/api/src/lib/claude.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
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
    outingId ? `The outing ID is: ${outingId}. Avoid suggesting places already added to this outing.` : '',
    '',
    'STEP 1: Call get_group_context to understand the group.',
    outingId ? 'STEP 2: Call get_outing_places to see what venues are already added — avoid duplicates.' : '',
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

    const textBlock = lastResponse?.content.find(
      (b): b is Anthropic.TextBlock => b.type === 'text'
    )
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
```

**Step 4: Run tests — verify they pass**

```bash
npm test --workspace=apps/api -- --testPathPattern="tests/lib/claude"
```

Expected: PASS (5 tests)

**Step 5: Commit**

```bash
git add apps/api/src/lib/claude.ts apps/api/tests/lib/claude.test.ts
git commit -m "feat(api): add Claude + MCP agent replacing Gemini in claude.ts"
```

---

## Task 8: AI route tests (TDD)

**Files:**
- Create: `apps/api/tests/routes/ai.test.ts`

**Step 1: Write failing tests**

Create `apps/api/tests/routes/ai.test.ts`:

```typescript
import request from 'supertest'
import { app } from '../../src/app'
import { prisma } from '../../src/lib/prisma'

jest.mock('../../src/lib/claude', () => ({
  generateAISuggestions: jest.fn().mockResolvedValue({
    suggestions: [
      {
        name: 'Escape Room',
        category: 'Entertainment',
        whyItFits: 'Fun.',
        estimatedCostRange: '$20–$30 per person',
        googleMapsLink: 'https://www.google.com/maps/search/escape+room',
      },
      {
        name: 'Rooftop Bar',
        category: 'Dining',
        whyItFits: 'Nice views.',
        estimatedCostRange: '$30–$50 per person',
        googleMapsLink: 'https://www.google.com/maps/search/rooftop',
      },
      {
        name: 'Bowling',
        category: 'Sports',
        whyItFits: 'Casual.',
        estimatedCostRange: '$10–$20 per person',
        googleMapsLink: 'https://www.google.com/maps/search/bowling',
      },
    ],
  }),
}))

const DOMAIN = '@gather-ai-test.com'
const uid = () => Math.random().toString(36).slice(2, 10)
const email = (label: string) => `test-ai-${label}-${uid()}${DOMAIN}`

async function createTestUser(label: string) {
  const e = email(label)
  const res = await request(app)
    .post('/auth/register')
    .send({ email: e, password: 'Password123!', name: `User ${label}` })
  return { userId: res.body.user.id as string, token: res.body.accessToken as string }
}

async function createTestGroup(token: string) {
  const res = await request(app)
    .post('/api/groups')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'AI Test Group' })
  return res.body.id as string
}

afterAll(async () => {
  const users = await prisma.user.findMany({
    where: { email: { contains: DOMAIN } },
    select: { id: true },
  })
  const ids = users.map(u => u.id)
  await prisma.group.deleteMany({ where: { createdBy: { in: ids } } })
  await prisma.user.deleteMany({ where: { id: { in: ids } } })
  await prisma.$disconnect()
})

describe('POST /api/groups/:groupId/ai-suggestions', () => {
  it('201 — generates suggestions for group member', async () => {
    const { token } = await createTestUser('member')
    const groupId = await createTestGroup(token)

    const res = await request(app)
      .post(`/api/groups/${groupId}/ai-suggestions`)
      .set('Authorization', `Bearer ${token}`)
      .send({})

    expect(res.status).toBe(201)
    expect(res.body.suggestions).toHaveLength(3)
    expect(res.body.suggestions[0].name).toBe('Escape Room')
  })

  it('401 — no auth', async () => {
    const res = await request(app)
      .post('/api/groups/fake-id/ai-suggestions')
      .send({})

    expect(res.status).toBe(401)
  })

  it('403 — non-member cannot generate suggestions', async () => {
    const { token: adminToken } = await createTestUser('admin2')
    const groupId = await createTestGroup(adminToken)
    const { token: outsiderToken } = await createTestUser('outsider2')

    const res = await request(app)
      .post(`/api/groups/${groupId}/ai-suggestions`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({})

    expect(res.status).toBe(403)
  })
})

describe('GET /api/groups/:groupId/ai-suggestions', () => {
  it('200 — returns suggestion list for member', async () => {
    const { token } = await createTestUser('list')
    const groupId = await createTestGroup(token)

    await request(app)
      .post(`/api/groups/${groupId}/ai-suggestions`)
      .set('Authorization', `Bearer ${token}`)
      .send({})

    const res = await request(app)
      .get(`/api/groups/${groupId}/ai-suggestions`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThanOrEqual(1)
  })

  it('401 — no auth', async () => {
    const res = await request(app).get('/api/groups/fake/ai-suggestions')
    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/ai-suggestions/:id', () => {
  it('204 — dismisses own suggestion', async () => {
    const { token } = await createTestUser('dismiss')
    const groupId = await createTestGroup(token)

    const createRes = await request(app)
      .post(`/api/groups/${groupId}/ai-suggestions`)
      .set('Authorization', `Bearer ${token}`)
      .send({})

    const suggestionId = createRes.body.id as string

    const res = await request(app)
      .delete(`/api/ai-suggestions/${suggestionId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(204)
  })

  it('404 — non-existent suggestion', async () => {
    const { token } = await createTestUser('del404')
    const res = await request(app)
      .delete('/api/ai-suggestions/non-existent-id')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
  })
})
```

**Step 2: Run tests — verify they fail**

```bash
npm test --workspace=apps/api -- --testPathPattern="tests/routes/ai"
```

Expected: FAIL — controller still imports from `gemini` (which also still exists), but mock points to `claude`

**Step 3: Update controller import**

In `apps/api/src/controllers/ai.controller.ts`, change line 5:

```typescript
// Before:
import { generateAISuggestions } from '../lib/gemini'

// After:
import { generateAISuggestions } from '../lib/claude'
```

**Step 4: Run tests — verify they pass**

```bash
npm test --workspace=apps/api -- --testPathPattern="tests/routes/ai"
```

Expected: PASS (6 tests)

**Step 5: Commit**

```bash
git add apps/api/tests/routes/ai.test.ts apps/api/src/controllers/ai.controller.ts
git commit -m "feat(api): wire AI route to Claude agent, add route tests"
```

---

## Task 9: Delete Gemini and update OpenAPI docs

**Type:** non-TDD — deletion + doc update

**Files:**
- Delete: `apps/api/src/lib/gemini.ts`
- Modify: `apps/api/src/routes/ai.ts` (update OpenAPI tag description)

**Step 1: Delete gemini.ts**

```bash
git rm apps/api/src/lib/gemini.ts
```

**Step 2: Update route OpenAPI comment**

In `apps/api/src/routes/ai.ts`, change line 4:

```typescript
// Before:
 *   description: Gemini-powered venue suggestions via MCP tool calling

// After:
 *   description: Claude-powered venue suggestions via MCP tool calling
```

**Step 3: Run full test suite**

```bash
npm test --workspace=apps/api
```

Expected: all existing tests pass, no references to gemini remain

**Step 4: Typecheck both workspaces**

```bash
npm run typecheck --workspace=packages/mcp && npm run typecheck --workspace=apps/api
```

Expected: no errors

**Step 5: Commit**

```bash
git add apps/api/src/routes/ai.ts
git rm apps/api/src/lib/gemini.ts
git commit -m "chore(api): delete gemini.ts, update OpenAPI description to Claude"
```

---

## Task Dependencies

- Task 1: no dependencies
- Task 2: depends on Task 1
- Task 3: depends on Task 2
- Task 4: depends on Task 2
- Task 5: depends on Task 3, Task 4
- Task 6: depends on Task 5
- Task 7: depends on Task 6
- Task 8: depends on Task 7
- Task 9: depends on Task 8

Independent groups (can run in parallel):
- **Group A:** Task 1
- **Group B:** Task 2 (after Group A)
- **Group C:** Tasks 3, 4 (after Group B — independent of each other)
- **Group D:** Tasks 5, 6 (after Group C)
- **Group E:** Tasks 7, 8 (after Group D — sequential)
- **Group F:** Task 9 (after Group E)

---

## Environment Variable Change

Add to `.env.local` (and EC2 `.env.production`):
```
ANTHROPIC_API_KEY=your-key-here
```

Remove (no longer needed):
```
GEMINI_API_KEY=...
```
