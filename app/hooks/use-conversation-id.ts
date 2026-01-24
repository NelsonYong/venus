"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useCallback } from "react"

/**
 * Hook for managing conversation ID from URL params.
 * Single source of truth for the current conversation.
 */
export function useConversationId() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const conversationId = searchParams.get("chatId") || undefined

  const setConversationId = useCallback((id: string | undefined) => {
    if (id) {
      router.push(`/chat?chatId=${id}`, { scroll: false })
    } else {
      router.push("/chat", { scroll: false })
    }
  }, [router])

  return { conversationId, setConversationId }
}
