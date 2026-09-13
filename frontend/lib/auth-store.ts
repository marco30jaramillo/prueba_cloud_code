import { create } from 'zustand';
import { AuthState, User } from '@/types';

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

export const loadAuthFromStorage = () => {
  if (typeof window === 'undefined') return;

  const token = localStorage.getItem('authToken');
  const userStr = localStorage.getItem('authUser');

  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      useAuthStore.getState().setAuth(user, token);
    } catch (e) {
      console.error('Error loading auth:', e);
    }
  }
};

export const saveAuthToStorage = (user: User, token: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('authToken', token);
  localStorage.setItem('authUser', JSON.stringify(user));
};

export const clearAuthStorage = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('authToken');
  localStorage.removeItem('authUser');
};
