import { useCallback } from 'react';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { userState, tokenState, loadingState, isAuthenticatedState, userRolesState, hasRoleState } from './store';
import type { 
  User, 
  LoginCredentials, 
  RegisterCredentials, 
  ResetPasswordCredentials,
  ForgotPasswordCredentials,
  AuthResponse,
  AuthError 
} from './types';

export const useAuth = () => {
  const [user, setUser] = useRecoilState(userState);
  const [token, setToken] = useRecoilState(tokenState);
  const setLoading = useSetRecoilState(loadingState);
  const isAuthenticated = useRecoilValue(isAuthenticatedState);
  const roles = useRecoilValue(userRolesState);
  const hasRole = useRecoilValue(hasRoleState);

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setLoading(true);
      // TODO: Implement API call
      const response: AuthResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      }).then(res => res.json());

      setUser(response.user);
      setToken(response.token);
      return response;
    } catch (error) {
      throw error as AuthError;
    } finally {
      setLoading(false);
    }
  }, [setUser, setToken, setLoading]);

  const register = useCallback(async (credentials: RegisterCredentials) => {
    try {
      setLoading(true);
      // TODO: Implement API call
      const response: AuthResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      }).then(res => res.json());

      setUser(response.user);
      setToken(response.token);
      return response;
    } catch (error) {
      throw error as AuthError;
    } finally {
      setLoading(false);
    }
  }, [setUser, setToken, setLoading]);

  const logout = useCallback(async () => {
    try {
      setLoading(true);
      // TODO: Implement API call
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      
      setUser(null);
      setToken(null);
    } catch (error) {
      throw error as AuthError;
    } finally {
      setLoading(false);
    }
  }, [token, setUser, setToken, setLoading]);

  const forgotPassword = useCallback(async (credentials: ForgotPasswordCredentials) => {
    try {
      setLoading(true);
      // TODO: Implement API call
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
    } catch (error) {
      throw error as AuthError;
    } finally {
      setLoading(false);
    }
  }, [setLoading]);

  const resetPassword = useCallback(async (credentials: ResetPasswordCredentials) => {
    try {
      setLoading(true);
      // TODO: Implement API call
      await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
    } catch (error) {
      throw error as AuthError;
    } finally {
      setLoading(false);
    }
  }, [setLoading]);

  const updateProfile = useCallback(async (updates: Partial<User>) => {
    try {
      setLoading(true);
      // TODO: Implement API call
      const updatedUser: User = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates),
      }).then(res => res.json());

      setUser(updatedUser);
      return updatedUser;
    } catch (error) {
      throw error as AuthError;
    } finally {
      setLoading(false);
    }
  }, [token, setUser, setLoading]);

  return {
    user,
    isAuthenticated,
    roles,
    hasRole,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    updateProfile,
  };
};