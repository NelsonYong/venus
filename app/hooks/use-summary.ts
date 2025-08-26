import { useMutation } from '@tanstack/react-query'
import { UIMessage } from '@ai-sdk/react'

interface SummaryRequest {
  messages: UIMessage[]
}

interface SummaryResponse {
  title: string
  success: boolean
}

// API function to call the summary endpoint
const generateSummary = async (data: SummaryRequest): Promise<SummaryResponse> => {
  const response = await fetch('/api/summary', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(`Failed to generate summary: ${response.statusText}`)
  }

  return response.json()
}

// Hook for generating conversation summary/title
export function useSummary() {
  return useMutation({
    mutationFn: generateSummary,
    onSuccess: (data) => {
      console.log('Summary generated successfully:', data.title)
    },
    onError: (error) => {
      console.error('Failed to generate summary:', error)
    },
  })
}