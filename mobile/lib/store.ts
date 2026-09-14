import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { setApiToken } from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  photo?: string;
}

interface AuthStore {
  token: string | null;
  user: User | null;
  isLoaded: boolean;
  setAuth: (token: string, user: User) => Promise<void>;
  clearAuth: () => Promise<void>;
  setUser: (user: User) => void;
  init: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  token: null,
  user: null,
  isLoaded: false,

  setAuth: async (token, user) => {
    await SecureStore.setItemAsync('mv_token', token);
    await SecureStore.setItemAsync('mv_user', JSON.stringify(user));
    setApiToken(token);
    set({ token, user });
  },

  clearAuth: async () => {
    await SecureStore.deleteItemAsync('mv_token').catch(() => {});
    await SecureStore.deleteItemAsync('mv_user').catch(() => {});
    setApiToken(null);
    set({ token: null, user: null });
  },

  setUser: (user) => set({ user }),

  init: async () => {
    try {
      const token = await SecureStore.getItemAsync('mv_token');
      const userStr = await SecureStore.getItemAsync('mv_user');
      if (token && userStr) {
        const user = JSON.parse(userStr) as User;
        setApiToken(token);
        set({ token, user });
      }
    } catch {
      // storage error — start unauthenticated
    } finally {
      set({ isLoaded: true });
    }
  },
}));

export const isAdminRole = (role?: string) =>
  ['superuser', 'administrador', 'tendero'].includes(role ?? '');

export const ROLE_LABEL: Record<string, string> = {
  superuser: 'Super Usuario',
  administrador: 'Administrador',
  tendero: 'Tendero',
  vendedor: 'Vendedor',
  cliente: 'Cliente',
};

export const formatCOP = (n: number | string) =>
  `$${Number(n ?? 0).toLocaleString('es-CO')}`;
