'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Container, Row, Col, Alert } from 'react-bootstrap';
import { AuthForm, AuthFormData } from '@/components/AuthForm';
import { ResendActivation } from '@/components/ResendActivation';
import { useAuth } from '@/hooks/useAuth';
import styles from './page.module.scss';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { handleLogin, isLoading, isAuthenticated } = useAuth();
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const passwordReset = searchParams.get('reset') === '1';

  useEffect(() => {
    if (isAuthenticated) {
      const returnUrl = searchParams.get('returnUrl') || '/dashboard';
      router.push(returnUrl);
    }
  }, [isAuthenticated, router, searchParams]);

  const onSubmit = async (data: AuthFormData) => {
    setPendingEmail(null);
    const result = await handleLogin(
      data.email!,
      data.password!,
      data.rememberMe ?? false
    );
    if (result?.success) {
      const returnUrl = searchParams.get('returnUrl') || '/dashboard';
      router.push(returnUrl);
    }
    if (result?.code === 'ACCOUNT_PENDING_ACTIVATION') {
      setPendingEmail(data.email!.trim());
    }
    return result || { success: false, error: 'Error inesperado' };
  };

  return (
    <Container className={styles.container}>
      <Row className="justify-content-center">
        <Col lg={5} md={8}>
          <div className={styles.header}>
            <h1 className={styles.title}>Iniciar Sesión</h1>
            <p className={styles.subtitle}>Accede a tu cuenta</p>
          </div>

          {passwordReset && (
            <Alert variant="success" className="mb-4">
              ✅ Tu contraseña fue restablecida. Inicia sesión con la nueva contraseña.
            </Alert>
          )}

          <AuthForm type="login" onSubmit={onSubmit} isLoading={isLoading} />

          {pendingEmail && (
            <div className="mt-4">
              <ResendActivation email={pendingEmail} />
            </div>
          )}

          <div className={styles.footer}>
            <p>
              ¿Olvidaste tu contraseña?{' '}
              <Link href="/forgot-password" className={styles.link}>Recupérala aquí</Link>
            </p>
            <p>
              ¿No tienes cuenta?{' '}
              <Link href="/register" className={styles.link}>Regístrate</Link>
            </p>
          </div>
        </Col>
      </Row>
    </Container>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
