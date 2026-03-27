/**
 * Resolves the MCP transport configuration for a given MCP server record.
 * Maps database McpMode to @ai-sdk/mcp transport options.
 */
export interface McpServerRecord {
  id: string
  name: string
  mode: 'stdio' | 'sse' | 'streamable'
  command?: string | null
  args: string[]
  url?: string | null
  endpoint?: string | null
  apiKey?: string | null
  env?: Record<string, string> | null
}

export type McpTransportConfig =
  | { type: 'sse'; url: string; headers?: Record<string, string> }
  | { type: 'http'; url: string; headers?: Record<string, string> }

/**
 * Resolve a McpServer database record to a transport config.
 * stdio mode is excluded because it requires process spawning not
 * available in serverless environments.
 */
export function resolveTransport(server: McpServerRecord): McpTransportConfig | null {
  switch (server.mode) {
    case 'sse': {
      if (!server.url) return null
      const headers: Record<string, string> = {}
      if (server.apiKey) {
        headers['Authorization'] = `Bearer ${server.apiKey}`
      }
      return { type: 'sse', url: server.url, headers }
    }

    case 'streamable': {
      if (!server.endpoint) return null
      const headers: Record<string, string> = {}
      if (server.apiKey) {
        headers['Authorization'] = `Bearer ${server.apiKey}`
      }
      return { type: 'http', url: server.endpoint, headers }
    }

    case 'stdio':
      // stdio requires process spawning, skip in serverless
      return null

    default:
      return null
  }
}
