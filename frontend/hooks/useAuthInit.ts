import { useEffect } from 'react';
import { loadAuthFromStorage, syncAuthBetweenTabs } from '@/lib/auth-store';
import { useAuthStore } from '@/lib/auth-store';

export const useAuthInit = () => {
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await loadAuthFromStorage();
      } finally {
        useAuthStore.getState().setInitialized(true);
      }
    };

    initializeAuth();

    const unsubscribe = syncAuthBetweenTabs();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);
};
