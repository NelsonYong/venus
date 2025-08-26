import { useMutation, useQueryClient } from '@tanstack/react-query'
import { conversationsAPI } from '@/lib/api/conversations'
import { queryKeys } from '@/lib/query-client'

export function useConversationActions() {
  const queryClient = useQueryClient()

  // Toggle star status
  const toggleStar = useMutation({
    mutationFn: async ({ id, isStarred }: { id: string; isStarred: boolean }) => {
      return conversationsAPI.update(id, { isStarred })
    },
    onSuccess: (data, variables) => {
      // Update the conversation in cache
      queryClient.setQueryData(queryKeys.conversations.detail(variables.id), data)
      // Invalidate conversations list to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list() })
    },
  })

  // Update title
  const updateTitle = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      return conversationsAPI.update(id, { title })
    },
    onSuccess: (data, variables) => {
      // Update the conversation in cache
      queryClient.setQueryData(queryKeys.conversations.detail(variables.id), data)
      // Invalidate conversations list to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list() })
    },
  })

  return {
    toggleStar,
    updateTitle,
    isLoading: toggleStar.isPending || updateTitle.isPending,
  }
}