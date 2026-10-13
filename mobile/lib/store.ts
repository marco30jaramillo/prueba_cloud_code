import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { setApiToken, modulesAPI, pick } from './api';
import { accesosDeModulos, accesosPorRol, type Accesos, type ModuloRol } from './modulos';

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
  /** Módulos del rol con su nivel (GET /modules); null mientras no se han cargado. */
  modulos: ModuloRol[] | null;
  cargarModulos: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  token: null,
  user: null,
  isLoaded: false,
  modulos: null,

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
    set({ token: null, user: null, modulos: null });
  },

  setUser: (user) => set({ user }),

  cargarModulos: async () => {
    try {
      const modulos: any[] = pick(await modulesAPI.getMios(), 'modules');
      set({ modulos: modulos.filter((m) => m?.href).map((m) => ({ href: m.href, level: m.level })) });
    } catch {
      // Sin conexión o sesión vencida: se conserva lo último cargado.
    }
  },

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

/** Superusuario y administrador operan en cualquier tienda; el resto, solo en las suyas. */
export const verTodasLasTiendas = (role?: string) => ['superuser', 'administrador'].includes(role ?? '');

export const ROLE_LABEL: Record<string, string> = {
  superuser: 'Superusuario',
  administrador: 'Administrador',
  tendero: 'Tendero',
  vendedor: 'Vendedor',
  cliente: 'Cliente',
};

export const formatCOP = (n: number | string) =>
  `$${Number(n ?? 0).toLocaleString('es-CO')}`;

/** Qué módulos ve la sesión: por permisos si ya cargaron, si no por rol (mientras tanto). */
export const useAccesos = (): Accesos => {
  const modulos = useAuthStore((s) => s.modulos);
  const role = useAuthStore((s) => s.user?.role);
  return modulos ? accesosDeModulos(modulos) : accesosPorRol(role);
};
