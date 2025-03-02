import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

// API Configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'
const API_TIMEOUT = 15000

// Request configuration
const config: AxiosRequestConfig = {
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
}

// Create Axios instance
const apiClient: AxiosInstance = axios.create(config)

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage in client-side
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token')
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config

    // Handle token refresh
    if (error.response?.status === 401 && originalRequest) {
      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (refreshToken) {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          })
          
          localStorage.setItem('auth_token', data.accessToken)
          
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
          }
          
          return apiClient(originalRequest)
        }
      } catch (refreshError) {
        // Handle refresh token failure
        localStorage.removeItem('auth_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/auth/login'
      }
    }

    return Promise.reject(error)
  }
)

// API response types
export interface ApiResponse<T = any> {
  data: T
  message?: string
  status: number
}

// API error type
export interface ApiError {
  message: string
  status: number
  errors?: Record<string, string[]>
}

// Generic request method
export async function apiRequest<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
  try {
    const response = await apiClient(config)
    return {
      data: response.data,
      message: response.data.message,
      status: response.status,
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw {
        message: error.response?.data?.message || 'An error occurred',
        status: error.response?.status || 500,
        errors: error.response?.data?.errors,
      } as ApiError
    }
    throw error
  }
}

export default apiClient