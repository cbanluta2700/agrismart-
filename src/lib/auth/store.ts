import { atom, selector } from 'recoil';
import type { User } from './types';

// Core auth atoms
export const userState = atom<User | null>({
  key: 'auth/user',
  default: null,
});

export const tokenState = atom<string | null>({
  key: 'auth/token',
  default: null,
});

export const loadingState = atom<boolean>({
  key: 'auth/loading',
  default: true,
});

// Derived selectors
export const isAuthenticatedState = selector<boolean>({
  key: 'auth/isAuthenticated',
  get: ({ get }) => {
    const user = get(userState);
    const token = get(tokenState);
    return !!user && !!token;
  },
});

export const userRolesState = selector<string[]>({
  key: 'auth/userRoles',
  get: ({ get }) => {
    const user = get(userState);
    return user?.roles || [];
  },
});

export const hasRoleState = selector({
  key: 'auth/hasRole',
  get: ({ get }) => (role: string) => {
    const roles = get(userRolesState);
    return roles.includes(role);
  },
});