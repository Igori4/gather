import type { ToolContext } from '../types'
import { toolDefinitions } from './registry'

export async function executeToolCall(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<unknown> {
  const tool = toolDefinitions.find(t => t.name === name)
  if (!tool) throw new Error(`Unknown MCP tool: ${name}`)

  const parsed = tool.inputSchema.parse(args)
  return tool.execute(parsed, ctx)
}
