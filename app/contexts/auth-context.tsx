"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authAPI, type AuthResponse } from "@/lib/http-client";

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
  language: string;
  theme: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    try {
      console.log('Attempting to refresh auth...');
      const response = await authAPI.refresh();
      console.log('Auth refresh response:', response);
      
      if (response.status === 200 && response.data?.user) {
        console.log('Auth refresh successful, user:', response.data.user);
        setUser(response.data.user);
      } else {
        console.log('Auth refresh failed or no user data:', response.status, response.error);
        setUser(null);
      }
    } catch (error) {
      console.error('Auth refresh error:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password);
      
      if (response.status === 200 && response.data?.user) {
        setUser(response.data.user);
        return { 
          success: true, 
          message: response.data.message || 'Login successful' 
        };
      } else {
        return { 
          success: false, 
          message: response.message || response.error || 'Login failed' 
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Network error' };
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await authAPI.register(name, email, password);
      
      if (response.status === 201 && response.data?.user) {
        setUser(response.data.user);
        return { 
          success: true, 
          message: response.data.message || 'Registration successful' 
        };
      } else {
        return { 
          success: false, 
          message: response.message || response.error || 'Registration failed' 
        };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Network error' };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      if (typeof window !== 'undefined') {
        // 触发其他标签页的登出
        localStorage.setItem('auth-logout', Date.now().toString());
        localStorage.removeItem('auth-logout');
        
        const currentPath = window.location.pathname;
        if (!currentPath.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    refreshAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}