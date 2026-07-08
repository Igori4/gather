import type { MCPTool, GeminiFunctionDeclaration } from '../types'
import { getGroupContextTool } from './getGroupContext'
import { getOutingPlacesTool } from './getOutingPlaces'
import { getPastOutingsTool } from './getPastOutings'
import { searchMapboxPlacesTool } from './searchMapboxPlaces'
import { z } from 'zod'

export const toolDefinitions: MCPTool[] = [
  getGroupContextTool,
  getOutingPlacesTool,
  getPastOutingsTool,
  searchMapboxPlacesTool,
]

function zodTypeToGeminiType(schema: z.ZodTypeAny): { type: string; description?: string; nullable?: boolean } {
  const description = schema.description

  if (schema instanceof z.ZodString) return { type: 'STRING', description }
  if (schema instanceof z.ZodNumber) return { type: 'NUMBER', description }
  if (schema instanceof z.ZodBoolean) return { type: 'BOOLEAN', description }
  if (schema instanceof z.ZodOptional) {
    return { ...zodTypeToGeminiType(schema.unwrap()), nullable: true }
  }
  if (schema instanceof z.ZodDefault) {
    return zodTypeToGeminiType(schema._def.innerType)
  }
  return { type: 'STRING', description }
}

export function toGeminiFunctionDeclarations(tools: MCPTool[]): GeminiFunctionDeclaration[] {
  return tools.map(tool => {
    const shape = tool.inputSchema.shape
    const properties: Record<string, { type: string; description?: string; nullable?: boolean }> = {}
    const required: string[] = []

    for (const [key, fieldSchema] of Object.entries(shape)) {
      properties[key] = zodTypeToGeminiType(fieldSchema as z.ZodTypeAny)
      const isOptional = fieldSchema instanceof z.ZodOptional || fieldSchema instanceof z.ZodDefault
      if (!isOptional) required.push(key)
    }

    return {
      name: tool.name,
      description: tool.description,
      parameters: { type: 'object' as const, properties, required },
    }
  })
}
