import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authAPI, profileAPI, settingsAPI } from '@/lib/http-client'
import { queryKeys } from '@/lib/query-client'

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  createdAt: string
  language: string
  theme: string
}

export interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; message: string }>
  logout: () => Promise<void>
  refreshAuth: () => void
  updateProfile: (data: { name?: string; avatar?: string }) => Promise<{ success: boolean; message: string }>
  updateSettings: (data: { theme?: 'system' | 'light' | 'dark'; language?: string }) => Promise<{ success: boolean; message: string }>
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>
  deleteAccount: (password: string) => Promise<{ success: boolean; message: string }>
}

// Query for current user
export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.auth.user,
    queryFn: async () => {
      const response = await authAPI.refresh()
      if (response.status === 200 && response.data?.user) {
        return response.data.user as User
      }
      return null
    },
    retry: false, // Don't retry auth failures
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Mutation for login
export function useLogin() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const response = await authAPI.login(email, password)
      return response
    },
    onSuccess: (response) => {
      if (response.status === 200 && response.data?.user) {
        // Set user data in cache
        queryClient.setQueryData(queryKeys.auth.user, response.data.user)
      }
    },
  })
}

// Mutation for registration
export function useRegister() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ name, email, password }: { name: string; email: string; password: string }) => {
      const response = await authAPI.register(name, email, password)
      return response
    },
    onSuccess: (response) => {
      if (response.status === 201 && response.data?.user) {
        // Set user data in cache
        queryClient.setQueryData(queryKeys.auth.user, response.data.user)
      }
    },
  })
}

// Mutation for logout
export function useLogout() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: authAPI.logout,
    onSuccess: () => {
      // Clear all queries
      queryClient.clear()
      // Redirect to login
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname
        if (!currentPath.includes('/login')) {
          window.location.href = '/login'
        }
      }
    },
  })
}

// Mutation for updating profile
export function useUpdateProfile() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: profileAPI.updateProfile,
    onSuccess: (response) => {
      if (response.status === 200 && response.data?.user) {
        // Update user data in cache
        queryClient.setQueryData(queryKeys.auth.user, response.data.user)
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
        // Update user data in cache
        queryClient.setQueryData(queryKeys.auth.user, response.data.user)
      }
    },
  })
}

// Mutation for changing password
export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      authAPI.changePassword(currentPassword, newPassword),
  })
}

// Mutation for deleting account
export function useDeleteAccount() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ password }: { password: string }) => authAPI.deleteAccount(password),
    onSuccess: () => {
      // Clear all queries and redirect
      queryClient.clear()
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    },
  })
}

// Main auth hook that provides all auth functionality
export function useAuth(): AuthContextType {
  const userQuery = useCurrentUser()
  const loginMutation = useLogin()
  const registerMutation = useRegister()
  const logoutMutation = useLogout()
  const updateProfileMutation = useUpdateProfile()
  const updateSettingsMutation = useUpdateSettings()
  const changePasswordMutation = useChangePassword()
  const deleteAccountMutation = useDeleteAccount()
  
  const login = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await loginMutation.mutateAsync({ email, password })
      
      if (response.status === 200 && response.data?.user) {
        return { 
          success: true, 
          message: response.data.message || 'Login successful' 
        }
      } else {
        return { 
          success: false, 
          message: response.message || response.error || 'Login failed' 
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, message: 'Network error' }
    }
  }
  
  const register = async (name: string, email: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await registerMutation.mutateAsync({ name, email, password })
      
      if (response.status === 201 && response.data?.user) {
        return { 
          success: true, 
          message: response.data.message || 'Registration successful' 
        }
      } else {
        return { 
          success: false, 
          message: response.message || response.error || 'Registration failed' 
        }
      }
    } catch (error) {
      console.error('Registration error:', error)
      return { success: false, message: 'Network error' }
    }
  }
  
  const logout = async (): Promise<void> => {
    try {
      await logoutMutation.mutateAsync()
    } catch (error) {
      console.error('Logout error:', error)
      // Even if logout fails on server, clear client state
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname
        if (!currentPath.includes('/login')) {
          window.location.href = '/login'
        }
      }
    }
  }
  
  const refreshAuth = () => {
    userQuery.refetch()
  }
  
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
  
  const changePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await changePasswordMutation.mutateAsync({ currentPassword, newPassword })
      if (response.status === 200) {
        return { success: true, message: response.data?.message || 'Password changed successfully' }
      }
      return { success: false, message: response.error || 'Failed to change password' }
    } catch (error) {
      console.error('Change password error:', error)
      return { success: false, message: 'Network error' }
    }
  }
  
  const deleteAccount = async (password: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await deleteAccountMutation.mutateAsync({ password })
      if (response.status === 200) {
        return { success: true, message: response.data?.message || 'Account deleted successfully' }
      }
      return { success: false, message: response.error || 'Failed to delete account' }
    } catch (error) {
      console.error('Delete account error:', error)
      return { success: false, message: 'Network error' }
    }
  }
  
  return {
    user: userQuery.data || null,
    loading: userQuery.isLoading,
    login,
    register,
    logout,
    refreshAuth,
    updateProfile,
    updateSettings,
    changePassword,
    deleteAccount,
  }
}