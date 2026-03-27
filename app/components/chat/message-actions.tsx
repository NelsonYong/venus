"use client"

import { useState } from "react"
import { Actions, Action } from "@/components/ai-elements/actions"
import { CopyIcon, CheckIcon, RefreshCwIcon } from "lucide-react"
import { useTranslation } from "@/app/contexts/i18n-context"
import { useChatContext } from "@/app/contexts/chat-context"
import type { ChatMessage } from "@/lib/types/chat"

interface MessageActionsProps {
  message: ChatMessage
  isLastAssistantMessage: boolean
}

export function MessageActions({ message, isLastAssistantMessage }: MessageActionsProps) {
  const { t } = useTranslation()
  const { status, actions } = useChatContext()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const textParts = message.parts
      .filter((part) => part.type === "text")
      .map((part) => (part as { text: string }).text)
      .join("\n")

    await navigator.clipboard.writeText(textParts)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isStreaming = status === "streaming"
  const isUser = message.role === "user"
  const isAssistant = message.role === "assistant"
  const showRegenerate = isAssistant && isLastAssistantMessage && !isStreaming

  // Hide during streaming for the active message
  if (isAssistant && isStreaming && isLastAssistantMessage) return null

  if (!isUser && !isAssistant) return null

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mt-2 px-2`}>
      <Actions className={isUser ? "opacity-0 group-hover:opacity-100 transition-opacity" : ""}>
        <Action
          tooltip={copied ? t("chat.actions.copied") : t("chat.actions.copy")}
          onClick={handleCopy}
        >
          {copied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
        </Action>
        {showRegenerate && (
          <Action
            tooltip={t("chat.actions.regenerate")}
            onClick={() => actions.regenerate()}
          >
            <RefreshCwIcon className="w-4 h-4" />
          </Action>
        )}
      </Actions>
    </div>
  )
}
