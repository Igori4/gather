# Real MCP Server — Design Spec

**Date:** 2026-07-09  
**Goal:** Replace Gemini agent with a real MCP server (stdio transport) + Claude, supporting both AI suggestions and human-in-the-loop outing confirmation.

---

## Decision

**Approach A — Subprocess (stdio transport)**  
MCP server runs as a child process of Express API, communicating via stdin/stdout. Single deployment unit, real MCP protocol, compatible with any MCP-aware LLM client.

Rejected:

- B (HTTP transport) — extra service to deploy on already-constrained EC2 t3.micro
- C (in-process, no protocol) — not a real MCP server

---

## Architecture

```
Express API (port 4000)
    │
    ├─ spawn(node packages/mcp/dist/index.js)
    │
    ▼
MCP Client (inside claude.ts)  ←─stdio─►  MCP Server (packages/mcp/)
                                               ├─ tools/list
                                               ├─ tools/call
                                               └─ Prisma DB
    │
    ▼
Anthropic SDK (claude-sonnet-4-6)
    └─ tool_use loop (multi-turn)
```

**Request flow:**

1. `POST /api/groups/:id/ai-suggestions` → `claude.ts`
2. `claude.ts` spawns MCP server subprocess
3. MCP client calls `listTools()` → gets tool definitions
4. Converts to Claude `tools` format
5. Claude loop: `messages.create()` → tool_use → `mcpClient.callTool()` → result back → repeat
6. `stop_reason === 'end_turn'` → parse JSON → Zod validate → store in DB

---

## MCP Server Structure

```
packages/mcp/
├── src/
│   ├── index.ts                              ← entry point, connects transport
│   ├── server.ts                             ← registers handlers, dispatches tools
│   ├── tools/
│   │   ├── read/
│   │   │   ├── getGroupContext.ts
│   │   │   ├── getOutingPlaces.ts
│   │   │   ├── getPastOutings.ts
│   │   │   ├── getMemberAvailability.ts      ← NEW
│   │   │   └── getPlaceVoteTally.ts          ← NEW
│   │   └── write/
│   │       ├── confirmOuting.ts              ← NEW (phase 2 only)
│   │       └── notifyMembers.ts              ← NEW (phase 2 only)
│   └── lib/
│       └── prisma.ts
```

**server.ts pattern:**

```ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

const server = new Server({ name: 'gather-mcp', version: '1.0.0' })

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [...] }))
server.setRequestHandler(CallToolRequestSchema, async (req) => { /* dispatch */ })

const transport = new StdioServerTransport()
await server.connect(transport)
```

---

## Tools

| Tool                      | Type      | Description                                          |
| ------------------------- | --------- | ---------------------------------------------------- |
| `get_group_context`       | read      | name, member count, outing history                   |
| `get_outing_places`       | read      | places + vote tallies for current outing             |
| `get_past_outings`        | read      | past outings for variety (avoid repeats)             |
| `get_member_availability` | read      | who is available per time slot                       |
| `get_place_vote_tally`    | read      | detailed vote results per place                      |
| `confirm_outing`          | **write** | confirms place + slot (phase 2, human-approved only) |
| `notify_members`          | **write** | sends email via Resend (phase 2)                     |

`search_mapbox_places` removed — confirmation agent works from existing DB data only.

---

## Claude Integration (`apps/api/src/lib/claude.ts`)

**Key differences from gemini.ts:**

|                       | Gemini                                     | Claude                                          |
| --------------------- | ------------------------------------------ | ----------------------------------------------- |
| Tool format           | `functionDeclarations`                     | `tools` with `input_schema`                     |
| Tool call in response | `response.functionCalls()`                 | `content.filter(b => b.type === 'tool_use')`    |
| Stop signal           | `calls.length === 0`                       | `stop_reason === 'end_turn'`                    |
| Conversation history  | automatic (chat session)                   | manual — must push to `messages[]`              |
| Tool result format    | `{ functionResponse: { name, response } }` | `{ type: 'tool_result', tool_use_id, content }` |

**Loop pattern:**

```ts
const messages = [{ role: 'user', content: buildPrompt(groupId, outingId) }]

for (let turn = 0; turn < 5; turn++) {
  const response = await anthropic.messages.create({ model, max_tokens, tools, messages })

  if (response.stop_reason === 'end_turn') break

  const toolUses = response.content.filter(b => b.type === 'tool_use')
  const toolResults = await Promise.all(
    toolUses.map(async tu => {
      const result = await mcpClient.callTool({ name: tu.name, arguments: tu.input })
      return { type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(result) }
    })
  )

  messages.push({ role: 'assistant', content: response.content })
  messages.push({ role: 'user', content: toolResults })
}
```

---

## Human-in-the-Loop (write tools)

Write tools are **not available** in phase 1. Claude only reads and returns a recommendation JSON.

```
Phase 1: POST /api/outings/:id/ai-suggest-confirm
  → Claude reads data → returns recommendation:
  {
    "action": "confirm_outing",
    "recommendation": {
      "placeId": "abc", "placeName": "Escape Room Central",
      "slotId": "xyz", "slotTime": "Saturday 19:00",
      "reasoning": "3/4 members available, highest vote tally"
    }
  }

Phase 2: POST /api/outings/:id/confirm  (existing endpoint)
  → Human approves in UI → API confirms directly (no agent)
```

Write tools (`confirmOuting`, `notifyMembers`) reserved for a future fully-autonomous mode, gated behind explicit admin opt-in.

---

## File Changes

**New:**

- `packages/mcp/src/server.ts`
- `packages/mcp/src/tools/read/getMemberAvailability.ts`
- `packages/mcp/src/tools/read/getPlaceVoteTally.ts`
- `packages/mcp/src/tools/write/confirmOuting.ts`
- `packages/mcp/src/tools/write/notifyMembers.ts`
- `apps/api/src/lib/claude.ts`

**Modified:**

- `packages/mcp/src/index.ts` — MCP server entry point
- `apps/api/src/routes/ai.ts` — call `claude.ts` instead of `gemini.ts`
- `apps/api/package.json` — add `@anthropic-ai/sdk`, `@modelcontextprotocol/sdk`
- `packages/mcp/package.json` — add `@modelcontextprotocol/sdk`

**Deleted:**

- `apps/api/src/lib/gemini.ts`
- `packages/mcp/src/tools/registry.ts` — MCP SDK handles this
- `packages/mcp/src/tools/executor.ts` — MCP SDK handles this
- `packages/mcp/src/types.ts` — replaced by MCP SDK types

---

## Mental Model Summary

```
LLM agent = інструменти + промпт + цикл + валідація + fallback

MCP сервер = два handler-и:
  1. "дай список інструментів" (ListTools)
  2. "виклич інструмент" (CallTool)

LLM = диспетчер (вирішує що викликати)
Твій код = виконавець (реально викликає)

Claude history = ручна — кожен turn додаємо в messages[]
```
