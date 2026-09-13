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
      return { success: false, error: err?.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  }, [setAuth, setLoading]);

  const handleRegister = useCallback(async (email: string, password: string, name: string) => {
    setLoading(true);
    try {
      const response = await authAPI.register(email, password, name);
      if (response.user && response.token) {
        setAuth(response.user, response.token);
        saveAuthToStorage(response.user, response.token);
        return { success: true, data: response };
      }
    } catch (error: any) {
      const err = error.response?.data as ApiError;
      return { success: false, error: err?.message || 'Registration failed' };
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

  return {
    user,
    token,
    isLoading,
    isAuthenticated,
    handleLogin,
    handleRegister,
    handleLogout
  };
};
