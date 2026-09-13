import { useEffect } from 'react';
import { loadAuthFromStorage, syncAuthBetweenTabs } from '@/lib/auth-store';

export const useAuthInit = () => {
  useEffect(() => {
    const initializeAuth = async () => {
      await loadAuthFromStorage();
    };

    initializeAuth();

    const unsubscribe = syncAuthBetweenTabs();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);
};
