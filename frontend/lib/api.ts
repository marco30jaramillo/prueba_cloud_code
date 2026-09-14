import axios, { AxiosInstance, AxiosError } from 'axios';
import { AuthResponse } from '@/types';
import { getTokenFromStorage, clearAuthStorage } from './auth-store';

const getAPIUrl = () => {
  // Lado del servidor (Node.js)
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  }

  // Lado del cliente (Navegador)
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL;

  // PRODUCCIÓN: Si está configurada una URL específica y no es localhost, usarla
  if (configuredUrl && !configuredUrl.includes('localhost')) {
    console.debug('[API] Usando URL configurada:', configuredUrl);
    return configuredUrl;
  }

  // DESARROLLO: Detectar automáticamente la IP/hostname del servidor
  const backendPort = '3001';
  const autoUrl = `http://${window.location.hostname}:${backendPort}`;
  console.debug('[API] Detectado automáticamente:', autoUrl);
  return autoUrl;
};

const API_URL = getAPIUrl();

const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

apiClient.interceptors.request.use((config) => {
  const token = getTokenFromStorage();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const isLoginPage = typeof window !== 'undefined' && window.location.pathname === '/login';
      const isForgotPasswordPage = typeof window !== 'undefined' && window.location.pathname === '/forgot-password';
      const isResetPasswordPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/reset-password');
      const isRegisterPage = typeof window !== 'undefined' && window.location.pathname === '/register';

      if (!isLoginPage && !isForgotPasswordPage && !isResetPasswordPage && !isRegisterPage) {
        console.warn('[API] Token inválido o expirado (401)');
        clearAuthStorage();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: async (email: string, password: string, name: string, photo?: string) => {
    const { data } = await apiClient.post<AuthResponse>('/auth/register', {
      email,
      password,
      name,
      ...(photo && { photo })
    });
    return data;
  },

  login: async (email: string, password: string, rememberMe = false) => {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', {
      email,
      password,
      rememberMe
    });
    return data;
  },

  validate: async () => {
    const { data } = await apiClient.get<AuthResponse>('/auth/validate');
    return data;
  },

  logout: async () => {
    const { data } = await apiClient.post<AuthResponse>('/auth/logout');
    return data;
  },

  logoutAll: async () => {
    const { data } = await apiClient.post<any>('/auth/logout-all');
    return data;
  },

  forgotPassword: async (email: string) => {
    const { data } = await apiClient.post<AuthResponse>('/auth/forgot-password', { email });
    return data;
  },

  resetPassword: async (token: string, newPassword: string) => {
    const { data } = await apiClient.post<AuthResponse>('/auth/reset-password', {
      token,
      newPassword
    });
    return data;
  },

  bootstrapSuperuser: async (email: string, password: string, name: string) => {
    const { data } = await apiClient.post<AuthResponse>('/auth/bootstrap-superuser', {
      email,
      password,
      name
    });
    return data;
  },

  createUser: async (email: string, password: string, name: string, role: string) => {
    const { data } = await apiClient.post<AuthResponse>('/auth/create-user', {
      email,
      password,
      name,
      role
    });
    return data;
  },

  getUserSchema: async (roleType: string) => {
    const { data } = await apiClient.get(`/auth/user-schema/${roleType}`);
    return data;
  },

  changePassword: async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    const { data } = await apiClient.patch('/auth/change-password', {
      currentPassword,
      newPassword,
      confirmPassword
    });
    return data;
  },

  updateProfile: async (name: string, photo?: string) => {
    const { data } = await apiClient.patch('/auth/profile', {
      name,
      ...(photo && { photo })
    });
    return data;
  },

  changeUserPassword: async (userId: string, newPassword: string) => {
    const { data } = await apiClient.patch(`/auth/password/${userId}`, {
      newPassword
    });
    return data;
  },

  changePasswordTemporary: async (newPassword: string) => {
    const { data } = await apiClient.patch('/auth/change-password-temporary', {
      newPassword
    });
    return data;
  }
};

export const modulesAPI = {
  getAll: async () => {
    const { data } = await apiClient.get('/modules');
    return data;
  }
};

export const rolesConfigAPI = {
  get: async () => {
    const { data } = await apiClient.get('/roles-config');
    return data;
  },
  create: async (payload: { name: string; description: string; moduleAccess?: { id: string; level: string }[]; directPermissions?: string[] }) => {
    const { data } = await apiClient.post('/roles-config', payload);
    return data;
  },
  updateRole: async (roleId: string, payload: { moduleAccess?: { id: string; level: string }[]; directPermissions?: string[] }) => {
    const { data } = await apiClient.patch(`/roles-config/${roleId}`, payload);
    return data;
  }
};

export const usersAPI = {
  getAll: async () => {
    const { data } = await apiClient.get('/users');
    return data;
  },

  getById: async (userId: string) => {
    const { data } = await apiClient.get(`/users/${userId}`);
    return data;
  },

  update: async (userId: string, updates: { name?: string; photo?: string }) => {
    const { data } = await apiClient.patch(`/users/${userId}`, updates);
    return data;
  },

  toggleStatus: async (userId: string, isActive: boolean) => {
    const { data } = await apiClient.patch(`/users/${userId}/status`, { isActive });
    return data;
  },

  generatePassword: async (userId: string) => {
    const { data } = await apiClient.post(`/users/${userId}/generate-password`, {});
    return data;
  },

  getManageableRoles: async () => {
    const { data } = await apiClient.get('/users/manageable-roles');
    return data;
  }
};

export const tiendasAPI = {
  getMisTiendas: async () => {
    const { data } = await apiClient.get('/tiendas/mis-tiendas');
    return data;
  },
  getAll: async () => {
    const { data } = await apiClient.get('/tiendas');
    return data;
  },
  create: async (body: Record<string, unknown>) => {
    const { data } = await apiClient.post('/tiendas', body);
    return data;
  },
  toggleStatus: async (id: string) => {
    const { data } = await apiClient.patch(`/tiendas/${id}/status`);
    return data;
  },
  getById: async (id: string) => {
    const { data } = await apiClient.get(`/tiendas/${id}`);
    return data;
  },
  update: async (id: string, body: Record<string, unknown>) => {
    const { data } = await apiClient.patch(`/tiendas/${id}`, body);
    return data;
  },
  getUsuarios: async (id: string) => {
    const { data } = await apiClient.get(`/tiendas/${id}/usuarios`);
    return data;
  },
  addUsuario: async (id: string, userId: string, esPropietario: boolean) => {
    const { data } = await apiClient.post(`/tiendas/${id}/usuarios`, { userId, esPropietario });
    return data;
  },
  removeUsuario: async (id: string, userId: string) => {
    const { data } = await apiClient.delete(`/tiendas/${id}/usuarios/${userId}`);
    return data;
  }
};

export const valesAPI = {
  crear: async (body: { tiendaId: string; clienteId: string; descripcion: string; montoTotal: number; fechaVencimiento?: string; notas?: string }) => {
    const { data } = await apiClient.post('/vales', body);
    return data;
  },
  getMisVales: async () => {
    const { data } = await apiClient.get('/vales/mis-vales');
    return data;
  },
  getByUsuario: async (userId: string) => {
    const { data } = await apiClient.get(`/vales/usuario/${userId}`);
    return data;
  },
  getCartera: async (tiendaId: string, estado?: string) => {
    const { data } = await apiClient.get(`/vales/tienda/${tiendaId}`, { params: estado ? { estado } : {} });
    return data;
  },
  getById: async (id: string) => {
    const { data } = await apiClient.get(`/vales/${id}`);
    return data;
  },
  anular: async (id: string) => {
    const { data } = await apiClient.patch(`/vales/${id}/anular`);
    return data;
  },
  registrarAbono: async (valeId: string, monto: number, notas?: string) => {
    const { data } = await apiClient.post(`/vales/${valeId}/abonos`, { monto, notas });
    return data;
  },
  getAbonos: async (valeId: string) => {
    const { data } = await apiClient.get(`/vales/${valeId}/abonos`);
    return data;
  },
  anularAbono: async (valeId: string, abonoId: string) => {
    const { data } = await apiClient.patch(`/vales/${valeId}/abonos/${abonoId}/anular`);
    return data;
  }
};

export default apiClient;
