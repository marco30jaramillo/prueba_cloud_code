import axios, { AxiosInstance, AxiosError } from 'axios';
import { AuthResponse } from '@/types';
import { getTokenFromStorage, clearAuthStorage } from './auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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

  login: async (email: string, password: string) => {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', {
      email,
      password
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
  }
};

export default apiClient;
