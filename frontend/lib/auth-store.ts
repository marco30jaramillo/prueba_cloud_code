import { create } from 'zustand';
import { AuthState, User } from '@/types';
import { authAPI } from './api';

const STORAGE_KEYS = {
  token: 'authToken',
  user: 'authUser',
  expiresAt: 'authExpiresAt'
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,

  setAuth: (user: User, token: string) =>
    set({
      user,
      token,
      isAuthenticated: true
    }),

  logout: () =>
    set({
      user: null,
      token: null,
      isAuthenticated: false
    }),

  setLoading: (isLoading: boolean) =>
    set({ isLoading })
}));

export const saveAuthToStorage = (user: User, token: string) => {
  if (typeof window === 'undefined') return;

  localStorage.setItem(STORAGE_KEYS.token, token);
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  localStorage.setItem(STORAGE_KEYS.expiresAt, expiresAt);

  setAuthCookie(token);
};

export const clearAuthStorage = () => {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.user);
  localStorage.removeItem(STORAGE_KEYS.expiresAt);

  clearAuthCookie();
};

export const setAuthCookie = (token: string) => {
  if (typeof window === 'undefined') return;

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  document.cookie = `authToken=${token}; path=/; expires=${expiresAt.toUTCString()}; SameSite=Strict`;
};

export const clearAuthCookie = () => {
  if (typeof window === 'undefined') return;

  document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
};

export const isTokenExpired = (): boolean => {
  if (typeof window === 'undefined') return true;

  const expiresAt = localStorage.getItem(STORAGE_KEYS.expiresAt);
  if (!expiresAt) return true;

  return new Date(expiresAt) <= new Date();
};

export const getTokenFromStorage = (): string | null => {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem(STORAGE_KEYS.token);

  if (token && isTokenExpired()) {
    clearAuthStorage();
    return null;
  }

  return token;
};

export const loadAuthFromStorage = async () => {
  if (typeof window === 'undefined') return;

  const token = localStorage.getItem(STORAGE_KEYS.token);
  const userStr = localStorage.getItem(STORAGE_KEYS.user);

  if (!token || !userStr) return;

  if (isTokenExpired()) {
    clearAuthStorage();
    return;
  }

  try {
    const user = JSON.parse(userStr);

    try {
      await authAPI.validate();
      useAuthStore.getState().setAuth(user, token);
    } catch (error) {
      console.warn('[Auth] Token validation failed, clearing storage');
      clearAuthStorage();
    }
  } catch (e) {
    console.error('[Auth] Error loading auth:', e);
    clearAuthStorage();
  }
};

export const syncAuthBetweenTabs = () => {
  if (typeof window === 'undefined') return;

  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === STORAGE_KEYS.token) {
      if (e.newValue === null) {
        useAuthStore.getState().logout();
      } else if (e.newValue) {
        const userStr = localStorage.getItem(STORAGE_KEYS.user);
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            useAuthStore.getState().setAuth(user, e.newValue);
          } catch (error) {
            console.error('[Auth] Error syncing tabs:', error);
          }
        }
      }
    }
  };

  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
};
