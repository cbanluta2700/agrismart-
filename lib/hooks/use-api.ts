import { useState, useCallback } from 'react'
import { useRecoilState } from 'recoil'
import { AxiosRequestConfig } from 'axios'
import apiClient, { ApiResponse, ApiError } from '@/lib/api/client'
import { authLoadingState } from '@/lib/store/atoms'

interface UseApiOptions<T> {
  onSuccess?: (data: T) => void
  onError?: (error: ApiError) => void
  initialData?: T
}

interface ApiState<T> {
  data: T | null
  loading: boolean
  error: ApiError | null
}

export function useApi<T = any>(options: UseApiOptions<T> = {}) {
  const [state, setState] = useState<ApiState<T>>({
    data: options.initialData || null,
    loading: false,
    error: null,
  })

  const [isAuthLoading, setAuthLoading] = useRecoilState(authLoadingState)

  const execute = useCallback(
    async (config: AxiosRequestConfig) => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }))
        
        const response = await apiClient(config)
        const data = response.data

        setState((prev) => ({ ...prev, data, loading: false }))
        options.onSuccess?.(data)
        
        return data
      } catch (error) {
        const apiError = error as ApiError
        setState((prev) => ({ ...prev, error: apiError, loading: false }))
        options.onError?.(apiError)
        throw apiError
      }
    },
    [options]
  )

  const get = useCallback(
    <R = T>(url: string, config?: AxiosRequestConfig) =>
      execute({ ...config, method: 'GET', url }),
    [execute]
  )

  const post = useCallback(
    <R = T>(url: string, data?: any, config?: AxiosRequestConfig) =>
      execute({ ...config, method: 'POST', url, data }),
    [execute]
  )

  const put = useCallback(
    <R = T>(url: string, data?: any, config?: AxiosRequestConfig) =>
      execute({ ...config, method: 'PUT', url, data }),
    [execute]
  )

  const patch = useCallback(
    <R = T>(url: string, data?: any, config?: AxiosRequestConfig) =>
      execute({ ...config, method: 'PATCH', url, data }),
    [execute]
  )

  const del = useCallback(
    <R = T>(url: string, config?: AxiosRequestConfig) =>
      execute({ ...config, method: 'DELETE', url }),
    [execute]
  )

  return {
    ...state,
    isAuthLoading,
    get,
    post,
    put,
    patch,
    delete: del,
  }
}

// Utility hook for protected API calls
export function useAuthApi<T = any>(options: UseApiOptions<T> = {}) {
  const api = useApi<T>({
    ...options,
    onError: (error) => {
      if (error.status === 401) {
        // Handle unauthorized access
        window.location.href = '/auth/login'
      }
      options.onError?.(error)
    },
  })

  return api
}

// Hook for handling API mutations
export function useApiMutation<T = any, R = any>(
  url: string,
  options: UseApiOptions<R> & {
    method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  } = {}
) {
  const api = useApi<R>(options)
  const { method = 'POST' } = options

  const mutate = useCallback(
    async (data?: T) => {
      switch (method) {
        case 'POST':
          return api.post(url, data)
        case 'PUT':
          return api.put(url, data)
        case 'PATCH':
          return api.patch(url, data)
        case 'DELETE':
          return api.delete(url)
        default:
          throw new Error(`Unsupported method: ${method}`)
      }
    },
    [api, method, url]
  )

  return {
    ...api,
    mutate,
  }
}