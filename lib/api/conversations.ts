import { httpClient } from '@/lib/http-client'
import { UIMessage } from '@ai-sdk/react'

// 轻量级列表数据 - 用于侧边栏
export interface ConversationListItem {
  id: string
  title: string
  model: string
  createdAt: string
  updatedAt: string
  isStarred: boolean
  isPinned: boolean
  preview: string
}

// 分页参数
export interface PaginationParams {
  offset?: number
  limit?: number
}

// 分页响应
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    total: number
    offset: number
    limit: number
    hasMore: boolean
  }
}

// 完整对话数据 - 用于对话详情
export interface Conversation {
  id: string
  title: string
  model: string
  createdAt: string
  updatedAt: string
  userId: string
  isDeleted: boolean
  isStarred?: boolean
  isPinned?: boolean
  messages: ConversationMessage[]
}

export interface ConversationMessage {
  id: string
  conversationId: string
  userId: string
  role: string
  content: string
  createdAt: string
  isDeleted: boolean
}

export interface CreateConversationRequest {
  title: string
  messages: {
    role: string
    parts?: unknown
    content?: unknown
    createdAt?: Date | string
  }[]
  model?: string
  modelId?: string
}

export interface UpdateConversationRequest {
  title?: string
  messages?: {
    role: string
    parts?: unknown
    content?: unknown
    createdAt?: Date | string
  }[]
  model?: string
  isStarred?: boolean
}

export const conversationsAPI = {
  // 获取轻量级对话列表（用于侧边栏）
  // 不传参数时获取全部数据，传参数时启用分页
  async getList(params?: PaginationParams): Promise<ConversationListItem[] | PaginatedResponse<ConversationListItem>> {
    const queryParams = new URLSearchParams()
    if (params?.offset !== undefined) {
      queryParams.append('offset', params.offset.toString())
    }
    if (params?.limit !== undefined) {
      queryParams.append('limit', params.limit.toString())
    }

    const url = `/api/conversations${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    const response = await httpClient.get<ConversationListItem[] | PaginatedResponse<ConversationListItem>>(url)

    if (response.status !== 200 || !response.data) {
      throw new Error(response.error || 'Failed to fetch conversations')
    }
    return response.data
  },

  // 保持向后兼容（后续可以移除）
  async getAll(params?: PaginationParams): Promise<ConversationListItem[] | PaginatedResponse<ConversationListItem>> {
    return this.getList(params)
  },

  async getById(id: string): Promise<Conversation> {
    const response = await httpClient.get<Conversation>(`/api/conversations/${id}`)
    if (response.status !== 200 || !response.data) {
      throw new Error(response.error || 'Failed to fetch conversation')
    }
    return response.data
  },

  async create(data: CreateConversationRequest): Promise<Conversation> {
    const response = await httpClient.post<Conversation>('/api/conversations', data)
    if (response.status !== 200 || !response.data) {
      throw new Error(response.error || 'Failed to create conversation')
    }
    return response.data
  },

  async update(id: string, data: UpdateConversationRequest): Promise<Conversation> {
    const response = await httpClient.patch<Conversation>(`/api/conversations/${id}/update`, data)
    if (response.status !== 200 || !response.data) {
      throw new Error(response.error || 'Failed to update conversation')
    }
    return response.data
  },

  async delete(id: string): Promise<{ success: boolean }> {
    const response = await httpClient.delete<{ success: boolean }>(`/api/conversations/${id}`)
    if (response.status !== 200 || !response.data) {
      throw new Error(response.error || 'Failed to delete conversation')
    }
    return response.data
  },

  async save(id: string, data: { title?: string; messages: any[]; model?: string; modelId?: string }): Promise<Conversation> {
    const response = await httpClient.put<Conversation>(`/api/conversations/${id}`, data)
    if (response.status !== 200 || !response.data) {
      throw new Error(response.error || 'Failed to save conversation')
    }
    return response.data
  },

  async deleteAll(): Promise<{ success: boolean; message?: string }> {
    const response = await httpClient.delete<{ success: boolean; message?: string }>('/api/conversations')
    if (response.status !== 200 || !response.data) {
      throw new Error(response.error || 'Failed to delete all conversations')
    }
    return response.data
  },
}

// Transform API message to UI message format
export function transformApiMessageToUIMessage(apiMessage: ConversationMessage): UIMessage {
  try {
    const parts = JSON.parse(apiMessage.content)
    return {
      id: apiMessage.id,
      role: apiMessage.role as 'user' | 'assistant' | 'system',
      parts: Array.isArray(parts) ? parts : [{ type: 'text', text: parts }],
      createdAt: new Date(apiMessage.createdAt),
    }
  } catch {
    // Fallback for simple text content
    return {
      id: apiMessage.id,
      role: apiMessage.role as 'user' | 'assistant' | 'system',
      parts: [{ type: 'text', text: apiMessage.content }],
      createdAt: new Date(apiMessage.createdAt),
    }
  }
}

// Transform UI message to API format
export function transformUIMessageToApiFormat(uiMessage: UIMessage) {
  return {
    role: uiMessage.role,
    parts: uiMessage.parts,
    createdAt: uiMessage.createdAt || new Date(),
  }
}