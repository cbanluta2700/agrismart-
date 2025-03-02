import { useCallback } from 'react'
import { useRecoilState } from 'recoil'
import { useRouter } from 'next/navigation'
import { userState, authLoadingState } from '@/lib/store/atoms'
import { useApi } from './use-api'
import { User } from '@/types/store.types'
import { Permission, RBAC } from '@/lib/auth/rbac'
import { AuthUtils, TokenResponse } from '@/lib/auth/jwt'

interface LoginCredentials {
  email: string
  password: string
}

interface RegisterData extends LoginCredentials {
  name: string
}

export function useAuth() {
  const router = useRouter()
  const [user, setUser] = useRecoilState(userState)
  const [isLoading, setLoading] = useRecoilState(authLoadingState)
  const api = useApi()

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setLoading(true)
      const response = await api.post<TokenResponse>('/auth/login', credentials)
      
      // Store tokens
      localStorage.setItem('auth_token', response.data.accessToken)
      localStorage.setItem('refresh_token', response.data.refreshToken)
      
      // Fetch user data
      const userData = await api.get<User>('/auth/me')
      setUser(userData.data)
      
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }, [api, router, setUser, setLoading])

  const register = useCallback(async (data: RegisterData) => {
    try {
      setLoading(true)
      await api.post('/auth/register', data)
      router.push('/auth/login')
    } finally {
      setLoading(false)
    }
  }, [api, router, setLoading])

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
    setUser(null)
    router.push('/auth/login')
  }, [router, setUser])

  const checkAuth = useCallback(async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('auth_token')
      
      if (!token) {
        setUser(null)
        return false
      }

      if (AuthUtils.isTokenExpired(token)) {
        const refreshToken = localStorage.getItem('refresh_token')
        if (!refreshToken) {
          logout()
          return false
        }

        // Try to refresh the token
        const response = await api.post<TokenResponse>('/auth/refresh', {
          refreshToken
        })

        localStorage.setItem('auth_token', response.data.accessToken)
      }

      const userData = await api.get<User>('/auth/me')
      setUser(userData.data)
      return true
    } catch (error) {
      logout()
      return false
    } finally {
      setLoading(false)
    }
  }, [api, logout, setUser, setLoading])

  const hasPermission = useCallback((permission: Permission) => {
    return RBAC.hasPermission(user, permission)
  }, [user])

  const hasRole = useCallback((role: string) => {
    return user?.role === role
  }, [user])

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    checkAuth,
    hasPermission,
    hasRole
  }
}

// Custom hook for protected routes
export function useProtectedRoute(permission?: Permission) {
  const router = useRouter()
  const { user, isLoading, checkAuth, hasPermission } = useAuth()

  const validateAccess = useCallback(async () => {
    const isAuthenticated = await checkAuth()
    
    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }

    if (permission && !hasPermission(permission)) {
      router.push('/403')
    }
  }, [checkAuth, hasPermission, permission, router])

  return {
    user,
    isLoading,
    validateAccess
  }
}