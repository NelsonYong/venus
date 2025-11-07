import { httpClient } from '@/lib/http-client'

export interface McpServer {
  id: string
  name: string
  command: string
  args: string[]
  env: Record<string, string>
  enabled: boolean
  createdAt?: string
  updatedAt?: string
}

export interface CreateMcpServerRequest {
  name: string
  command: string
  args?: string[]
  env?: Record<string, string>
  enabled?: boolean
}

export interface UpdateMcpServerRequest {
  name?: string
  command?: string
  args?: string[]
  env?: Record<string, string>
  enabled?: boolean
}

export const mcpAPI = {
  async getAll(): Promise<McpServer[]> {
    const response = await httpClient.get<{ success: boolean; servers: McpServer[] }>('/api/mcp/servers')
    if (response.status !== 200 || !response.data?.success) {
      throw new Error(response.error || 'Failed to fetch MCP servers')
    }
    return response.data.servers
  },

  async create(data: CreateMcpServerRequest): Promise<McpServer> {
    const response = await httpClient.post<{ success: boolean; server: McpServer; message: string }>(
      '/api/mcp/servers',
      data
    )
    if (response.status !== 201 || !response.data?.success) {
      throw new Error(response.error || 'Failed to create MCP server')
    }
    return response.data.server
  },

  async update(id: string, data: UpdateMcpServerRequest): Promise<McpServer> {
    const response = await httpClient.put<{ success: boolean; server: McpServer; message: string }>(
      `/api/mcp/servers/${id}`,
      data
    )
    if (response.status !== 200 || !response.data?.success) {
      throw new Error(response.error || 'Failed to update MCP server')
    }
    return response.data.server
  },

  async delete(id: string): Promise<{ success: boolean; message: string }> {
    const response = await httpClient.delete<{ success: boolean; message: string }>(`/api/mcp/servers/${id}`)
    if (response.status !== 200 || !response.data?.success) {
      throw new Error(response.error || 'Failed to delete MCP server')
    }
    return response.data
  },
}
