"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-client"
import { useAuth } from "./use-auth"
import { useConversationId } from "./use-conversation-id"
import { useChatHistory } from "./use-conversations"
import { useConversationActions } from "./use-conversation-actions"
import { defaultModel } from "@/app/constants/models"
import type { UploadedAttachment } from "@/lib/types/chat"

/**
 * Simplified chat session hook.
 * Uses DefaultChatTransport pattern via body params.
 * Removes: setTimeout hacks, manual message mutation, complex ref tracking.
 */
export function useChatSession() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { conversationId, setConversationId } = useConversationId()

  const [modelId, setModelId] = useState<string>(defaultModel)
  const [webSearch, setWebSearch] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const {
    chatHistory,
    isLoading: isHistoryLoading,
    saveChatSession,
    loadChatSession,
    deleteChatSession,
    startNewChat,
    getCurrentChat,
  } = useChatHistory()

  const { toggleStar, updateTitle: updateTitleMutation } = useConversationActions()

  const lastLoadedChatId = useRef<string | null>(null)
  const prevMessageCount = useRef(0)

  // Ref keeps current values accessible inside the static transport closure
  const dynamicBodyRef = useRef({ modelId, webSearch, userId: user?.id, conversationId })
  dynamicBodyRef.current = { modelId, webSearch, userId: user?.id, conversationId }

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => dynamicBodyRef.current,
      }),
    []
  )

  const {
    messages,
    sendMessage,
    status,
    setMessages,
    error,
    stop,
    addToolResult,
    addToolApprovalResponse,
  } = useChat({
    transport,
    sendAutomaticallyWhen: ({ messages: msgs }) => {
      const lastMsg = msgs[msgs.length - 1]
      if (!lastMsg || lastMsg.role !== "assistant") return false
      return lastMsg.parts.some(
        (part: any) => part.state === "approval-responded"
      )
    },
    onError: (error) => {
      console.error("Chat stream error:", error)
    },
  })

  // Invalidate cache when stream completes with new messages
  useEffect(() => {
    if (status === "ready" && conversationId && messages.length > 0) {
      if (messages.length !== prevMessageCount.current) {
        prevMessageCount.current = messages.length
        queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.list(),
        })
        queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.detail(conversationId),
        })
      }
    }
  }, [status, messages.length, conversationId, queryClient])

  // Load conversation when URL changes
  useEffect(() => {
    if (conversationId && !isHistoryLoading) {
      const shouldLoad = lastLoadedChatId.current !== conversationId && status !== "streaming"
      if (shouldLoad) {
        lastLoadedChatId.current = conversationId
        loadChatSession(conversationId).then((chatMessages) => {
          if (chatMessages) {
            prevMessageCount.current = chatMessages.length
            setMessages(chatMessages)
          }
        })
      }
    }
  }, [conversationId, isHistoryLoading, status, loadChatSession, setMessages])

  const handleSubmit = useCallback((message: any, attachments: UploadedAttachment[]) => {
    if (status === "streaming") return

    const messageText = message.text?.trim() || ""
    if (!messageText && attachments.length === 0) return

    if (!conversationId) {
      saveChatSession([], undefined, modelId).then((chatId) => {
        if (chatId) {
          lastLoadedChatId.current = chatId
          setConversationId(chatId)
          dynamicBodyRef.current = { ...dynamicBodyRef.current, conversationId: chatId }

          sendMessage(
            { text: messageText },
            { body: { conversationId: chatId, uploadedAttachments: attachments } }
          )
        }
      })
    } else {
      sendMessage(
        { text: messageText },
        { body: { uploadedAttachments: attachments } }
      )
    }
  }, [status, conversationId, modelId, webSearch, user?.id, saveChatSession, setConversationId, sendMessage])

  const handleNewChat = useCallback(() => {
    prevMessageCount.current = 0
    lastLoadedChatId.current = null
    startNewChat()
    setMessages([])
    setConversationId(undefined)
  }, [startNewChat, setMessages, setConversationId])

  const handleLoadChat = useCallback(async (chatId: string) => {
    try {
      const chatMessages = await loadChatSession(chatId)
      if (chatMessages) {
        prevMessageCount.current = chatMessages.length
        lastLoadedChatId.current = chatId
        setMessages(chatMessages)
        setConversationId(chatId)
      }
    } catch (error) {
      console.error("Failed to load chat:", error)
    }
  }, [loadChatSession, setMessages, setConversationId])

  const handleDeleteChat = useCallback(async (chatId: string) => {
    try {
      await deleteChatSession(chatId)
      if (conversationId === chatId) {
        handleNewChat()
      }
    } catch (error) {
      console.error("Failed to delete chat:", error)
    }
  }, [deleteChatSession, conversationId, handleNewChat])

  const handleTitleUpdate = useCallback((newTitle: string) => {
    if (conversationId) {
      updateTitleMutation.mutate({ id: conversationId, title: newTitle })
    }
  }, [conversationId, updateTitleMutation])

  const handleStarToggle = useCallback(() => {
    const currentChat = getCurrentChat()
    if (conversationId && currentChat) {
      toggleStar.mutate({ id: conversationId, isStarred: !currentChat.isStarred })
    }
  }, [conversationId, getCurrentChat, toggleStar])

  const handleRegenerate = useCallback(async () => {
    if (messages.length === 0) return

    let lastAssistantIdx = -1
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") {
        lastAssistantIdx = i
        break
      }
    }
    if (lastAssistantIdx === -1) return

    let lastUserIdx = -1
    for (let i = lastAssistantIdx - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        lastUserIdx = i
        break
      }
    }
    if (lastUserIdx === -1) return

    const lastUserMessage = messages[lastUserIdx]
    const messagesToDeleteCount = messages.length - lastUserIdx

    // Delete old messages from backend
    if (conversationId) {
      try {
        await fetch(`/api/conversations/${conversationId}/messages?count=${messagesToDeleteCount}`, {
          method: "DELETE",
        })
      } catch (error) {
        console.error("Failed to delete old messages:", error)
      }
    }

    setMessages(messages.slice(0, lastUserIdx))

    const messageText = lastUserMessage.parts
      .filter((part: any) => part.type === "text")
      .map((part: any) => part.text)
      .join("\n")

    const attachments = (lastUserMessage as any).data?.uploadedAttachments
      || (lastUserMessage as any).metadata?.uploadedAttachments
      || []

    if (messageText || attachments.length > 0) {
      sendMessage(
        { text: messageText },
        { body: { uploadedAttachments: attachments } }
      )
    }
  }, [messages, conversationId, setMessages, sendMessage])

  const isLoadingChat = Boolean(conversationId && messages.length === 0 && isHistoryLoading)
  const lastMessage = messages[messages.length - 1]
  const usage = lastMessage?.metadata as any

  return {
    // State
    messages,
    status,
    error,
    modelId,
    webSearch,
    sidebarOpen,
    chatHistory,
    conversationId,
    isLoading: isHistoryLoading,
    isLoadingChat,
    usage,

    // Actions
    setModelId,
    setWebSearch,
    setSidebarOpen,
    handleSubmit,
    handleNewChat,
    handleLoadChat,
    handleDeleteChat,
    handleTitleUpdate,
    handleStarToggle,
    handleRegenerate,
    stop,
    addToolResult,
    addToolApprovalResponse,

    // Computed
    getCurrentChat,
  }
}
