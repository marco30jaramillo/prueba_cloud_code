import { useCallback } from 'react';
import { authAPI } from '@/lib/api';
import { useAuthStore, saveAuthToStorage, clearAuthStorage } from '@/lib/auth-store';
import { ApiError } from '@/types';

export const useAuth = () => {
  const { user, token, isLoading, isAuthenticated, setAuth, logout: storeLogout, setLoading } = useAuthStore();

  const handleLogin = useCallback(async (email: string, password: string, rememberMe = false) => {
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

  const handleRegister = useCallback(async (email: string, password: string, name: string, photo?: string) => {
    setLoading(true);
    try {
      const response = await authAPI.register(email, password, name, photo);
      if (response.user && response.token) {
        setAuth(response.user, response.token);
        saveAuthToStorage(response.user, response.token);
        return { success: true, data: response };
      }
      return { success: false, error: 'Respuesta inesperada del servidor' };
    } catch (error: any) {
      const err = error.response?.data as ApiError;
      const errorMsg = err?.message || 'No se pudo completar el registro. Intenta nuevamente.';
      console.error('[Register Error]', errorMsg, err);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [setAuth, setLoading]);

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
