import { Server } from '@modelcontextprotocol/sdk/server'
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  type CallToolRequest,
} from '@modelcontextprotocol/sdk/types'
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

function zodFieldToJsonSchema(
  schema: z.ZodTypeAny
): { type: string; description?: string; nullable?: boolean } {
  const description = schema.description
  if (schema instanceof z.ZodString) return { type: 'string', description }
  if (schema instanceof z.ZodNumber) return { type: 'number', description }
  if (schema instanceof z.ZodBoolean) return { type: 'boolean', description }
  if (schema instanceof z.ZodOptional)
    return { ...zodFieldToJsonSchema(schema.unwrap()), nullable: true }
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

  server.setRequestHandler(CallToolRequestSchema, async (req: CallToolRequest) => {
    const { name, arguments: args } = req.params
    const tool = ALL_TOOLS.find(t => t.name === name)
    if (!tool) {
      return { content: [{ type: 'text' as const, text: `Unknown tool: ${name}` }], isError: true }
    }

    try {
      const parsed = tool.inputSchema.parse(args ?? {})
      const result = await tool.execute(parsed, ctx)
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] }
    } catch (err) {
      return { content: [{ type: 'text' as const, text: String(err) }], isError: true }
    }
  })

  return server
}
