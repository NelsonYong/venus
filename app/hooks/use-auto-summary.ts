import { useRef, useEffect } from 'react'
import { UIMessage } from '@ai-sdk/react'
import { useSummary } from './use-summary'

interface UseAutoSummaryProps {
  messages: UIMessage[]
  currentChatId: string | null
  status: string
  isNewChat: boolean
  updateChatTitle: (chatId: string, messages: UIMessage[], title: string) => Promise<void>
}

export function useAutoSummary({
  messages,
  currentChatId,
  status,
  isNewChat,
  updateChatTitle
}: UseAutoSummaryProps) {
  const hasSummarized = useRef(false)
  const summaryMutation = useSummary()

  // Reset summarization status when starting a new chat
  const resetSummaryStatus = () => {
    hasSummarized.current = false
  }

  // Effect for generating summary when conversation reaches 2 messages
  useEffect(() => {
    const shouldSummarize = 
      status === "ready" && 
      currentChatId && 
      messages.length === 2 && 
      isNewChat && 
      !hasSummarized.current &&
      !summaryMutation.isPending

    if (shouldSummarize) {
      console.log("Generating summary for messages:", messages)
      hasSummarized.current = true
      
      summaryMutation.mutate(
        { messages },
        {
          onSuccess: async (data) => {
            console.log("Generated title:", data.title)
            try {
              await updateChatTitle(currentChatId, messages, data.title)
            } catch (error) {
              console.error("Failed to update chat title:", error)
            }
          },
          onError: (error) => {
            console.error("Failed to generate summary:", error)
            // Reset the flag on error to allow retry
            hasSummarized.current = false
          }
        }
      )
    }
  }, [status, messages.length, currentChatId, isNewChat, messages, summaryMutation, updateChatTitle])

  return {
    isGeneratingSummary: summaryMutation.isPending,
    summaryError: summaryMutation.error,
    resetSummaryStatus
  }
}