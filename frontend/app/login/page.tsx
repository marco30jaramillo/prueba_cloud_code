'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Container, Row, Col } from 'react-bootstrap';
import { AuthForm } from '@/components/AuthForm';
import { useAuth } from '@/hooks/useAuth';
import styles from './page.module.scss';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { handleLogin, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      const returnUrl = searchParams.get('returnUrl') || '/dashboard';
      router.push(returnUrl);
    }
  }, [isAuthenticated, router, searchParams]);

  const onSubmit = async (data: Record<string, string | boolean>) => {
    const result = await handleLogin(
      data.email as string,
      data.password as string,
      data.rememberMe as boolean
    );
    if (result?.success) {
      const returnUrl = searchParams.get('returnUrl') || '/dashboard';
      router.push(returnUrl);
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

          <AuthForm type="login" onSubmit={onSubmit} isLoading={isLoading} />

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
