'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner, Container } from 'react-bootstrap';
import { useAuthStore } from '@/lib/auth-store';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const router = useRouter();
  const { isAuthenticated, isInitialized, user } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (requiredRole && user && !requiredRole.includes(user.role)) {
      router.push('/dashboard');
    }
  }, [isInitialized, isAuthenticated, user, requiredRole, router]);

  if (!isInitialized || !isAuthenticated) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <Spinner animation="border" />
      </Container>
    );
  }

  return <>{children}</>;
};
