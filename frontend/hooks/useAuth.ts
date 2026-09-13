import { useCallback } from 'react';
import { authAPI } from '@/lib/api';
import { useAuthStore, saveAuthToStorage, clearAuthStorage } from '@/lib/auth-store';
import { ApiError } from '@/types';

export const useAuth = () => {
  const { user, token, isLoading, isAuthenticated, setAuth, logout: storeLogout, setLoading } = useAuthStore();

  const handleLogin = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await authAPI.login(email, password);
      if (response.user && response.token) {
        setAuth(response.user, response.token);
        saveAuthToStorage(response.user, response.token);
        return { success: true, data: response };
      }
    } catch (error: any) {
      const err = error.response?.data as ApiError;
      const errorMsg = err?.message || error.message || 'No se pudo iniciar sesión. Intenta nuevamente.';
      console.error('[Login Error]', {
        message: errorMsg,
        status: error.response?.status,
        data: error.response?.data,
        error: error.message
      });
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
