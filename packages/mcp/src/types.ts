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

export interface GeminiPropertySchema {
  type: string
  description?: string
  nullable?: boolean
}

export interface GeminiFunctionDeclaration {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, GeminiPropertySchema>
    required: string[]
  }
}
