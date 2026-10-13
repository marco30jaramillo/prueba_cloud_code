'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore, saveAuthToStorage } from '@/lib/auth-store';
import { useRouter } from 'next/navigation';
import { ForceChangePasswordModal } from './ForceChangePasswordModal';

export const ChangePasswordGuard: React.FC = () => {
  const { user, token, logout, setAuth, isInitialized } = useAuthStore();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (isInitialized && user && user.mustChangePassword) {
      setShowModal(true);
    }
  }, [user, isInitialized]);

  const handlePasswordChanged = () => {
    // La sesión sigue siendo la misma; solo deja de estar pendiente el cambio.
    if (user && token) {
      const updatedUser = { ...user, mustChangePassword: false };
      setAuth(updatedUser, token);
      saveAuthToStorage(updatedUser, token);
    }
    setShowModal(false);
    router.push('/dashboard');
  };

  const handleCancel = () => {
    logout();
    router.push('/login');
  };

  return (
    <ForceChangePasswordModal
      show={showModal}
      onPasswordChanged={handlePasswordChanged}
      onCancel={handleCancel}
    />
  );
};
