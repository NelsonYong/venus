import { useSession } from 'next-auth/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { profileAPI, settingsAPI } from '@/lib/http-client'

export interface User {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  createdAt?: string
  language?: string
  theme?: string
}

export interface AuthContextType {
  user: User | null
  loading: boolean
  updateProfile: (data: { name?: string; avatar?: string }) => Promise<{ success: boolean; message: string }>
  updateSettings: (data: { theme?: 'system' | 'light' | 'dark'; language?: string }) => Promise<{ success: boolean; message: string }>
}

// Mutation for updating profile
export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: profileAPI.updateProfile,
    onSuccess: (response) => {
      if (response.status === 200 && response.data?.user) {
        // Invalidate session to refetch updated user data
        queryClient.invalidateQueries({ queryKey: ['session'] })
      }
    },
  })
}

// Mutation for updating settings
export function useUpdateSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: settingsAPI.updateSettings,
    onSuccess: (response) => {
      if (response.status === 200 && response.data?.user) {
        // Invalidate session to refetch updated user data
        queryClient.invalidateQueries({ queryKey: ['session'] })
      }
    },
  })
}

// Main auth hook that provides auth functionality using NextAuth
export function useAuth(): AuthContextType {
  const { data: session, status } = useSession()
  const updateProfileMutation = useUpdateProfile()
  const updateSettingsMutation = useUpdateSettings()

  const updateProfile = async (data: { name?: string; avatar?: string }): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await updateProfileMutation.mutateAsync(data)
      if (response.status === 200) {
        return { success: true, message: response.data?.message || 'Profile updated successfully' }
      }
      return { success: false, message: response.error || 'Failed to update profile' }
    } catch (error) {
      console.error('Update profile error:', error)
      return { success: false, message: 'Network error' }
    }
  }

  const updateSettings = async (data: { theme?: 'system' | 'light' | 'dark'; language?: string }): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await updateSettingsMutation.mutateAsync(data)
      if (response.status === 200) {
        return { success: true, message: response.data?.message || 'Settings updated successfully' }
      }
      return { success: false, message: response.error || 'Failed to update settings' }
    } catch (error) {
      console.error('Update settings error:', error)
      return { success: false, message: 'Network error' }
    }
  }

  const user: User | null = session?.user ? {
    id: session.user.id || '',
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
    // @ts-expect-error - createdAt is added in session callback
    createdAt: session.user.createdAt,
  } : null

  return {
    user,
    loading: status === 'loading',
    updateProfile,
    updateSettings,
  }
}
