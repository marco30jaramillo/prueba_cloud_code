import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { setApiToken, modulesAPI, pick } from './api';
import { accesosDeModulos, accesosPorRol, tienePermiso, type Accesos, type ModuloRol } from './modulos';

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
  /** Permisos efectivos del rol (GET /modules); null mientras no se han cargado. */
  permisos: string[] | null;
  cargarModulos: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  token: null,
  user: null,
  isLoaded: false,
  modulos: null,
  permisos: null,

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
    set({ token: null, user: null, modulos: null, permisos: null });
  },

  setUser: (user) => set({ user }),

  cargarModulos: async () => {
    try {
      const res = await modulesAPI.getMios();
      const modulos: any[] = pick(res, 'modules');
      const permisos: string[] = pick(res, 'permissions');
      set({
        modulos: modulos.filter((m) => m?.href).map((m) => ({ href: m.href, level: m.level })),
        permisos: permisos.filter((p) => typeof p === 'string'),
      });
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
  encargado: 'Encargado',
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

/** ¿La sesión puede hacer esto? Según los permisos efectivos del rol (lib/modulos.ts). */
export const usePermiso = (permiso: string): boolean => {
  const permisos = useAuthStore((s) => s.permisos);
  return tienePermiso(permisos, permiso);
};

/**
 * ¿Opera en cualquier tienda? (tienda:administrar). Mientras no cargan los permisos, por rol,
 * para no dejar la lista de tiendas vacía al abrir la app.
 */
export const useTodasLasTiendas = (): boolean => {
  const permisos = useAuthStore((s) => s.permisos);
  const role = useAuthStore((s) => s.user?.role);
  return permisos ? tienePermiso(permisos, 'tienda:administrar') : verTodasLasTiendas(role);
};
