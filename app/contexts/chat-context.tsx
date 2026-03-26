"use client"

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react"
import type { LanguageModelUsage } from "ai"
import type {
  ChatMessage,
  ChatStatus,
  ArtifactPanelState,
  UploadedAttachment,
} from "@/lib/types/chat"
import type { Artifact } from "@/lib/types/artifact"
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input"

// ---------------------------------------------------------------------------
// Context value type
// ---------------------------------------------------------------------------

interface ChatActions {
  send: (message: PromptInputMessage, attachments: UploadedAttachment[]) => void
  stop: () => void
  regenerate: () => void
  addToolApprovalResponse: (params: { id: string; approved: boolean; reason?: string }) => void
}

interface ChatModelState {
  modelId: string
  setModelId: (id: string) => void
  webSearch: boolean
  setWebSearch: (enabled: boolean) => void
}

interface ChatUIState {
  artifactPanel: ArtifactPanelState | null
  openArtifact: (artifact: Artifact, previewUrl: string) => void
  closeArtifact: () => void
  hasAutoOpenedArtifact: boolean
  markAutoOpened: () => void
}

export interface ChatContextValue {
  /** All messages in the current conversation */
  messages: ChatMessage[]
  /** Current stream status */
  status: ChatStatus
  /** Stream error, if any */
  error: Error | undefined
  /** Token usage from last assistant message */
  usage: (LanguageModelUsage & { maxTokens?: number }) | undefined
  /** Chat actions (send, stop, regenerate) */
  actions: ChatActions
  /** Model and web search settings */
  model: ChatModelState
  /** Artifact sidebar UI state */
  ui: ChatUIState
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ChatContext = createContext<ChatContextValue | null>(null)

/**
 * Access chat context. Must be used within ChatProvider.
 */
export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext)
  if (!ctx) {
    throw new Error("useChatContext must be used within a ChatProvider")
  }
  return ctx
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface ChatProviderProps {
  children: ReactNode
  messages: ChatMessage[]
  status: ChatStatus
  error: Error | undefined
  usage: (LanguageModelUsage & { maxTokens?: number }) | undefined
  modelId: string
  onModelChange: (id: string) => void
  webSearch: boolean
  onWebSearchChange: (enabled: boolean) => void
  onSend: (message: PromptInputMessage, attachments: UploadedAttachment[]) => void
  onStop: () => void
  onRegenerate: () => void
  onToolApprovalResponse: (params: { id: string; approved: boolean; reason?: string }) => void
}

export function ChatProvider({
  children,
  messages,
  status,
  error,
  usage,
  modelId,
  onModelChange,
  webSearch,
  onWebSearchChange,
  onSend,
  onStop,
  onRegenerate,
  onToolApprovalResponse,
}: ChatProviderProps) {
  // Artifact panel state
  const [artifactPanel, setArtifactPanel] = useState<ArtifactPanelState | null>(null)
  const hasAutoOpenedRef = useRef(false)

  const openArtifact = useCallback((artifact: Artifact, previewUrl: string) => {
    setArtifactPanel({ artifact, previewUrl, isOpen: true })
  }, [])

  const closeArtifact = useCallback(() => {
    setArtifactPanel(null)
  }, [])

  const markAutoOpened = useCallback(() => {
    hasAutoOpenedRef.current = true
  }, [])

  // Reset auto-open flag on new conversation
  if (messages.length === 0) {
    hasAutoOpenedRef.current = false
  }

  const value: ChatContextValue = {
    messages,
    status: status as ChatStatus,
    error,
    usage,
    actions: {
      send: onSend,
      stop: onStop,
      regenerate: onRegenerate,
      addToolApprovalResponse: onToolApprovalResponse,
    },
    model: {
      modelId,
      setModelId: onModelChange,
      webSearch,
      setWebSearch: onWebSearchChange,
    },
    ui: {
      artifactPanel,
      openArtifact,
      closeArtifact,
      hasAutoOpenedArtifact: hasAutoOpenedRef.current,
      markAutoOpened,
    },
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}
