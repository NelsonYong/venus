import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { conversationsAPI, transformApiMessageToUIMessage, transformUIMessageToApiFormat, type Conversation, type PaginationParams } from '@/lib/api/conversations'
import { queryKeys } from '@/lib/query-client'
import { UIMessage } from '@ai-sdk/react'
import { useState, useCallback } from 'react'



// 轻量级会话列表项（用于侧边栏）
export interface ChatSessionListItem {
  id: string
  title: string
  timestamp: Date
  preview: string
  isStarred: boolean
  isPinned: boolean
  model: string
}

// 完整会话数据（包含消息）- 保留用于兼容性
export interface ChatSession extends ChatSessionListItem {
  messages: UIMessage[]
}

// Hook for fetching lightweight conversation list (sidebar)
// 可选的分页参数：不传参数获取全部，传参数启用分页
export function useConversations(params?: PaginationParams) {
  return useQuery({
    queryKey: params ? queryKeys.conversations.list(params) : queryKeys.conversations.list(),
    queryFn: () => conversationsAPI.getList(params),
    select: (response): ChatSessionListItem[] => {
      // 处理分页响应和普通数组响应
      const conversations = Array.isArray(response) ? response : response.data
      return conversations.map((conv) => ({
        id: conv.id,
        title: conv.title,
        timestamp: new Date(conv.updatedAt),
        preview: conv.preview,
        isStarred: conv.isStarred,
        isPinned: conv.isPinned,
        model: conv.model,
      }))
    },
  })
}

// Hook for fetching a single conversation
export function useConversation(id: string | null) {
  return useQuery({
    queryKey: queryKeys.conversations.detail(id || ''),
    queryFn: () => conversationsAPI.getById(id!),
    enabled: !!id,
    select: (conversation: Conversation): UIMessage[] => {
      return conversation.messages.map(transformApiMessageToUIMessage)
    },
  })
}

// Hook for creating a new conversation
export function useCreateConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: conversationsAPI.create,
    onSuccess: (data) => {
      // Invalidate conversations list to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list() })
      // Set the conversation data in cache
      queryClient.setQueryData(queryKeys.conversations.detail(data.id), data)
    },
  })
}

// Hook for updating an existing conversation
export function useUpdateConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof conversationsAPI.update>[1] }) =>
      conversationsAPI.update(id, data),
    onSuccess: (data, variables) => {
      // Update the conversation in cache
      queryClient.setQueryData(queryKeys.conversations.detail(variables.id), data)
      // Invalidate conversations list to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list() })
    },
  })
}

// Hook for saving conversation (complete chat records)
export function useSaveConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof conversationsAPI.save>[1] }) =>
      conversationsAPI.save(id, data),
    onSuccess: (data, variables) => {
      // Update the conversation in cache
      queryClient.setQueryData(queryKeys.conversations.detail(variables.id), data)
      // Invalidate conversations list to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list() })
    },
  })
}

// Hook for deleting a conversation
export function useDeleteConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: conversationsAPI.delete,
    onSuccess: (_, id) => {
      // Remove conversation from cache
      queryClient.removeQueries({ queryKey: queryKeys.conversations.detail(id) })
      // Invalidate conversations list to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list() })
    },
  })
}

// Main chat history hook that combines all the functionality
export function useChatHistory() {
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const conversationsQuery = useConversations()
  const createMutation = useCreateConversation()
  const updateMutation = useUpdateConversation()
  const deleteMutation = useDeleteConversation()
  const saveMutation = useSaveConversation()

  // Generate chat title from first message
  const generateChatTitle = useCallback((messages: UIMessage[]): string => {
    const firstUserMessage = messages.find(msg => msg.role === "user")
    if (firstUserMessage && firstUserMessage.parts) {
      const textPart = firstUserMessage.parts.find(part => part.type === "text")
      if (textPart && 'text' in textPart) {
        const text = textPart.text || "新的对话"
        return text.slice(0, 30) + (text.length > 30 ? "..." : "")
      }
    }
    return "新的对话"
  }, [])


  const updateChatTitle = useCallback(async (chatId: string, messages: UIMessage[], title: string) => {
    const apiMessages = messages.map(transformUIMessageToApiFormat)
    await updateMutation.mutateAsync({
      id: chatId,
      data: { title, messages: apiMessages }
    })
  }, [updateMutation])

  // Save chat session - creates new or updates existing
  const saveChatSession = useCallback(async (messages: UIMessage[], chatId?: string, modelId?: string) => {
    // if (!chatId) return null

    try {
      const title = generateChatTitle(messages)
      const apiMessages = messages.map(transformUIMessageToApiFormat)

      if (chatId) {
        // Update existing conversation
        const result = await saveMutation.mutateAsync({
          id: chatId,
          data: {
            title,
            messages: apiMessages,
            modelId
          }
        })
        setCurrentChatId(result.id)
        return result.id
      } else {
        // Create new conversation
        const result = await createMutation.mutateAsync({
          title,
          messages: apiMessages,
          modelId
        })
        setCurrentChatId(result.id)
        return result.id
      }
    } catch (error) {
      console.error("Failed to save chat session:", error)
      throw error
    }
  }, [generateChatTitle, saveMutation, createMutation])

  // Load chat session - uses React Query cache to avoid duplicate requests
  const loadChatSession = useCallback(async (chatId: string): Promise<UIMessage[] | null> => {
    try {
      // Use ensureQueryData to leverage cache if available
      // This prevents duplicate API calls if the data is already cached
      const conversation = await queryClient.ensureQueryData({
        queryKey: queryKeys.conversations.detail(chatId),
        queryFn: () => conversationsAPI.getById(chatId),
      })
      setCurrentChatId(chatId)
      return conversation.messages.map(transformApiMessageToUIMessage)
    } catch (error) {
      console.error("Failed to load chat session:", error)
      return null
    }
  }, [queryClient])

  // Delete chat session
  const deleteChatSession = useCallback(async (chatId: string) => {
    try {
      await deleteMutation.mutateAsync(chatId)
      if (currentChatId === chatId) {
        setCurrentChatId(null)
      }
    } catch (error) {
      console.error("Failed to delete chat session:", error)
      throw error
    }
  }, [deleteMutation, currentChatId])

  // Start new chat
  const startNewChat = useCallback(() => {
    setCurrentChatId(null)
  }, [])

  // Get current chat session (lightweight version without messages)
  const getCurrentChat = useCallback((): ChatSessionListItem | null => {
    if (!currentChatId) return null
    const conversations = conversationsQuery.data || []
    return conversations.find(chat => chat.id === currentChatId) || null
  }, [currentChatId, conversationsQuery.data])

  return {
    chatHistory: conversationsQuery.data || [],
    currentChatId,
    isLoading: conversationsQuery.isLoading,
    error: conversationsQuery.error,
    saveChatSession,
    updateChatTitle,
    loadChatSession,
    deleteChatSession,
    startNewChat,
    getCurrentChat,
    // Expose mutation states for UI feedback
    isSaving: createMutation.isPending || updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

