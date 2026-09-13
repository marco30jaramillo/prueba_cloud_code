'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Container, Row, Col, Form, Button, Card } from 'react-bootstrap';
import { AuthForm } from '@/components/AuthForm';
import { useAuth } from '@/hooks/useAuth';
import { authAPI } from '@/lib/api';
import styles from './page.module.scss';

export default function LoginPage() {
  const router = useRouter();
  const { handleLogin, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) router.push('/dashboard');
  }, [isAuthenticated, router]);

  const onSubmit = async (data: Record<string, string>) => {
    const result = await handleLogin(data.email, data.password);
    if (result.success) {
      router.push('/dashboard');
    }
    return result;
  };

  return (
    <Container className={styles.container}>
      <Row className="justify-content-center min-vh-50">
        <Col lg={5} md={8}>
          <div className={styles.header}>
            <h1 className={styles.title}>Iniciar Sesión</h1>
            <p className={styles.subtitle}>Accede a tu cuenta</p>
          </div>

          <AuthForm type="login" onSubmit={onSubmit} isLoading={isLoading} />

          <div className={styles.footer}>
            <p>
              ¿Olvidaste tu contraseña?{' '}
              <Link href="/forgot-password" className={styles.link}>
                Recupérala aquí
              </Link>
            </p>
            <p>
              ¿No tienes cuenta?{' '}
              <Link href="/register" className={styles.link}>
                Regístrate
              </Link>
            </p>
          </div>
        </Col>
      </Row>
    </Container>
  );
}
