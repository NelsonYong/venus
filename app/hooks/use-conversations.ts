import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { conversationsAPI, transformApiMessageToUIMessage, transformUIMessageToApiFormat, type Conversation, type ConversationMessage } from '@/lib/api/conversations'
import { queryKeys } from '@/lib/query-client'
import { UIMessage } from '@ai-sdk/react'
import { useState, useCallback } from 'react'

export interface ChatSession {
  id: string
  title: string
  timestamp: Date
  preview: string
  messages: UIMessage[]
  isStarred?: boolean
}

// Hook for fetching all conversations
export function useConversations() {
  return useQuery({
    queryKey: queryKeys.conversations.list(),
    queryFn: conversationsAPI.getAll,
    select: (conversations: Conversation[]): ChatSession[] => {
      return conversations.map((conv) => ({
        id: conv.id,
        title: conv.title,
        timestamp: new Date(conv.updatedAt),
        preview: generatePreviewFromApiMessages(conv.messages),
        messages: conv.messages.map(transformApiMessageToUIMessage),
        isStarred: conv.isStarred || false,
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
  const saveChatSession = useCallback(async (messages: UIMessage[], chatId?: string) => {
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
            model: 'openai/gpt-4o'
          }
        })
        setCurrentChatId(result.id)
        return result.id
      } else {
        // Create new conversation
        const result = await createMutation.mutateAsync({
          title,
          messages: apiMessages,
          model: 'openai/gpt-4o'
        })
        setCurrentChatId(result.id)
        return result.id
      }
    } catch (error) {
      console.error("Failed to save chat session:", error)
      throw error
    }
  }, [generateChatTitle, saveMutation, createMutation])

  // Load chat session from cache
  const loadChatSession = useCallback(async (chatId: string): Promise<UIMessage[] | null> => {
    const conversations = conversationsQuery.data || []
    const session = conversations.find(chat => chat.id === chatId)
    if (session) {
      setCurrentChatId(chatId)
      return session.messages
    }
    return null
  }, [conversationsQuery.data])

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

  // Get current chat session
  const getCurrentChat = useCallback((): ChatSession | null => {
    if (!currentChatId) return null
    const conversations = conversationsQuery.data || []
    return conversations.find(chat => chat.id === currentChatId) || null
  }, [currentChatId, conversationsQuery.data])

  // Fetch chat details (for URL-based loading)
  const fetchChatDetails = useCallback(async (chatId: string): Promise<UIMessage[] | null> => {
    try {
      const conversation = await conversationsAPI.getById(chatId)
      setCurrentChatId(chatId)
      return conversation.messages.map(transformApiMessageToUIMessage)
    } catch (error) {
      console.error("Failed to fetch chat details:", error)
      return null
    }
  }, [])

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
    fetchChatDetails,
    // Expose mutation states for UI feedback
    isSaving: createMutation.isPending || updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

// Helper function to generate preview from API messages
function generatePreviewFromApiMessages(apiMessages: ConversationMessage[]): string {
  if (apiMessages.length === 0) return "暂无消息"

  const lastMessage = apiMessages[apiMessages.length - 1]
  if (lastMessage) {
    try {
      const content = JSON.parse(lastMessage.content)
      if (Array.isArray(content)) {
        const textPart = content.find((part: { type?: string; text?: string }) => part.type === "text")
        if (textPart && textPart.text) {
          const text = textPart.text
          return text.slice(0, 50) + (text.length > 50 ? "..." : "")
        }
      }
      // Fallback for simple string content
      const text = content?.toString() || lastMessage.content || "..."
      return text.slice(0, 50) + (text.length > 50 ? "..." : "")
    } catch {
      // Fallback for non-JSON content
      const text = lastMessage.content?.slice(0, 50) || "..."
      return text + (lastMessage.content?.length > 50 ? "..." : "")
    }
  }
  return "暂无消息"
}