'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { useRouter } from 'next/navigation';
import { ForceChangePasswordModal } from './ForceChangePasswordModal';

export const ChangePasswordGuard: React.FC = () => {
  const { user, logout, isInitialized } = useAuthStore();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (isInitialized && user && user.mustChangePassword) {
      setShowModal(true);
    }
  }, [user, isInitialized]);

  const handlePasswordChanged = () => {
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
