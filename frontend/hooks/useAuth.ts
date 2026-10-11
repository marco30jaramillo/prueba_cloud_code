import { useCallback } from 'react';
import { authAPI } from '@/lib/api';
import { useAuthStore, saveAuthToStorage, clearAuthStorage } from '@/lib/auth-store';
import { ApiError, AuthResponse } from '@/types';

export interface AuthResult {
  success: boolean;
  error?: string;
  code?: string;
  data?: AuthResponse;
}

export const useAuth = () => {
  const { user, token, isLoading, isAuthenticated, setAuth, logout: storeLogout, setLoading } = useAuthStore();

  const handleLogin = useCallback(async (email: string, password: string, rememberMe = false): Promise<AuthResult> => {
    setLoading(true);
    try {
      const response = await authAPI.login(email, password, rememberMe);
      if (response.user && response.token) {
        setAuth(response.user, response.token);
        saveAuthToStorage(response.user, response.token);
        return { success: true, data: response };
      }
      return { success: false, error: 'Respuesta inesperada del servidor' };
    } catch (error: any) {
      const status = error.response?.status;
      const data = error.response?.data;

      // Cuenta deshabilitada — error específico del backend
      if (status === 403 && data?.code === 'ACCOUNT_DISABLED') {
        return { success: false, error: '🔒 Tu cuenta está deshabilitada. Contacta al administrador.' };
      }

      // Cuenta creada pero sin activar: la contraseña es correcta, falta el enlace del correo
      if (status === 403 && data?.code === 'ACCOUNT_PENDING_ACTIVATION') {
        return {
          success: false,
          code: 'ACCOUNT_PENDING_ACTIVATION',
          error: '📧 Tu cuenta está pendiente de activación. Revisa tu correo y abre el enlace de activación (mira también el spam), o pide que te lo reenviemos.'
        };
      }

      // Rate limit
      if (status === 429) {
        const secs = data?.retryAfterSec || 900;
        const mins = Math.ceil(secs / 60);
        return { success: false, error: `⏱️ Demasiados intentos fallidos. Intenta nuevamente en ${mins} minutos.` };
      }

      const errorMsg = data?.message || error.message || 'No se pudo iniciar sesión. Intenta nuevamente.';
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [setAuth, setLoading]);

  const handleRegister = useCallback(async (email: string, password: string, name: string, photo?: string): Promise<AuthResult> => {
    setLoading(true);
    try {
      const response = await authAPI.register(email, password, name, photo);
      // El registro ya no inicia sesión: la cuenta queda pendiente hasta abrir el enlace del correo.
      return { success: true, data: response };
    } catch (error: any) {
      const err = error.response?.data as ApiError;
      const errorMsg = err?.message || 'No se pudo completar el registro. Intenta nuevamente.';
      console.error('[Register Error]', errorMsg, err);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [setLoading]);

  const handleLogout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      storeLogout();
      clearAuthStorage();
    }
  }, [storeLogout]);

  const handleLogoutAll = useCallback(async () => {
    try {
      await authAPI.logoutAll();
    } catch (error) {
      console.error('Logout all error:', error);
    } finally {
      storeLogout();
      clearAuthStorage();
    }
  }, [storeLogout]);

  return {
    user,
    token,
    isLoading,
    isAuthenticated,
    handleLogin,
    handleRegister,
    handleLogout,
    handleLogoutAll
  };
};
