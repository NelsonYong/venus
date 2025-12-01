import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (previously cacheTime)
      refetchOnWindowFocus: false,
      retry: (failureCount, error: unknown) => {
        // Don't retry on 401/403 errors
        if (typeof error === 'object' && error !== null && 'status' in error) {
          const errorWithStatus = error as { status: number }
          if (errorWithStatus.status === 401 || errorWithStatus.status === 403) {
            return false
          }
        }
        // Retry up to 3 times for other errors
        return failureCount < 3
      },
    },
    mutations: {
      retry: (failureCount, error: unknown) => {
        // Don't retry mutations on client errors
        if (typeof error === 'object' && error !== null && 'status' in error) {
          const errorWithStatus = error as { status: number }
          if (errorWithStatus.status >= 400 && errorWithStatus.status < 500) {
            return false
          }
        }
        // Retry once for server errors
        return failureCount < 1
      },
    },
  },
})

// Query Keys
export const queryKeys = {
  // Auth
  auth: {
    user: ['auth', 'user'] as const,
  },
  
  // Conversations
  conversations: {
    all: ['conversations'] as const,
    list: (params?: { offset?: number; limit?: number }) =>
      params
        ? [...queryKeys.conversations.all, 'list', params] as const
        : [...queryKeys.conversations.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.conversations.all, 'detail', id] as const,
  },
  
  // Profile
  profile: {
    all: ['profile'] as const,
    details: () => [...queryKeys.profile.all, 'details'] as const,
  },
  
  // Settings
  settings: {
    all: ['settings'] as const,
    details: () => [...queryKeys.settings.all, 'details'] as const,
  },
} as const