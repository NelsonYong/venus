import { prisma } from '@/lib/prisma'
import { resolveTransport, type McpServerRecord } from './transport'

/**
 * MCP Client Bridge - connects user's configured MCP servers
 * to the chat agent's tool registry at runtime.
 *
 * Dynamically loads MCP tools from all enabled servers for a user,
 * making them available alongside built-in tools in the agent's
 * tool loop.
 */

// Cache MCP clients per-request to avoid reconnecting within the same call
const clientCache = new Map<string, any>()

async function createClient(transport: ReturnType<typeof resolveTransport>) {
  if (!transport) return null

  try {
    const { createMCPClient } = await import('@ai-sdk/mcp')
    return await createMCPClient({ transport })
  } catch (error) {
    console.error('Failed to create MCP client:', error)
    return null
  }
}

/**
 * Fetch and merge tools from all enabled MCP servers for a user.
 * Returns a flat tool map compatible with AI SDK's tool system.
 */
export async function getMCPTools(userId: string): Promise<Record<string, any>> {
  const servers = await prisma.mcpServer.findMany({
    where: { userId, enabled: true },
  })

  if (servers.length === 0) return {}

  const allTools: Record<string, any> = {}

  await Promise.all(
    servers.map(async (server) => {
      const record: McpServerRecord = {
        id: server.id,
        name: server.name,
        mode: server.mode,
        command: server.command,
        args: server.args,
        url: server.url,
        endpoint: server.endpoint,
        apiKey: server.apiKey,
        env: server.env as Record<string, string> | null,
      }

      const transport = resolveTransport(record)
      if (!transport) return

      const cacheKey = `${server.id}-${server.updatedAt.getTime()}`
      let client = clientCache.get(cacheKey)

      if (!client) {
        client = await createClient(transport)
        if (client) {
          clientCache.set(cacheKey, client)
        }
      }

      if (!client) return

      try {
        const tools = await client.tools()
        const prefixed: Record<string, any> = {}
        for (const [name, tool] of Object.entries(tools)) {
          prefixed[`mcp_${server.name}_${name}`] = tool
        }
        Object.assign(allTools, prefixed)
      } catch (error) {
        console.error(`Failed to load tools from MCP server "${server.name}":`, error)
      }
    })
  )

  return allTools
}

/**
 * Clean up cached MCP clients (call on server shutdown or periodically).
 */
export function clearMCPClientCache() {
  clientCache.clear()
}
