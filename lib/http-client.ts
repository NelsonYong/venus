class HTTPClient {
  private baseURL: string;

  constructor(baseURL: string = '') {
    this.baseURL = baseURL;
  }

  private async request<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<{
    data?: T;
    error?: string;
    message?: string;
    status: number;
  }> {
    const fullURL = `${this.baseURL}${url}`;

    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(fullURL, {
        credentials: 'include',
        ...options,
        headers: defaultHeaders,
      });

      const responseData = await response.json().catch(() => null);

      if (response.status === 401) {
        this.handleUnauthorized();
        return {
          error: 'Unauthorized',
          message: 'Please login again',
          status: 401,
        };
      }

      if (!response.ok) {
        return {
          error: responseData?.error || 'Request failed',
          message: responseData?.message || `HTTP ${response.status}`,
          status: response.status,
        };
      }

      return {
        data: responseData,
        status: response.status,
      };
    } catch (error) {
      console.error('HTTP Client Error:', error);
      return {
        error: 'Network error',
        message: 'Failed to connect to server',
        status: 0,
      };
    }
  }

  private handleUnauthorized() {
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/auth/signin')) {
        // 触发全局认证失败事件
        window.dispatchEvent(new CustomEvent('auth-unauthorized'));

        const loginUrl = new URL('/auth/signin', window.location.origin);
        if (currentPath !== '/') {
          loginUrl.searchParams.set('callbackUrl', currentPath);
        }

        // 使用 setTimeout 来避免阻塞当前的 Promise 链
        setTimeout(() => {
          window.location.href = loginUrl.toString();
        }, 100);
      }
    }
  }

  async get<T>(url: string, options: Omit<RequestInit, 'method'> = {}) {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  async post<T>(
    url: string,
    data?: any,
    options: Omit<RequestInit, 'method' | 'body'> = {}
  ) {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(
    url: string,
    data?: any,
    options: Omit<RequestInit, 'method' | 'body'> = {}
  ) {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(
    url: string,
    data?: any,
    options: Omit<RequestInit, 'method' | 'body'> = {}
  ) {
    return this.request<T>(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(url: string, options: Omit<RequestInit, 'method'> = {}) {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  }
}

export const httpClient = new HTTPClient();

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    createdAt: string;
    language: string;
    theme: string;
  };
}

export interface AuthError {
  error: string;
  message: string;
}

// OAuth authentication is now handled by NextAuth
// Use signIn() and signOut() from next-auth/react instead

export const profileAPI = {
  async updateProfile(data: { name?: string; avatar?: string }) {
    return httpClient.put<AuthResponse>('/api/profile/update', data);
  },
};

export const settingsAPI = {
  async updateSettings(data: { theme?: 'system' | 'light' | 'dark'; language?: string }) {
    return httpClient.put<AuthResponse>('/api/settings/update', data);
  },
};