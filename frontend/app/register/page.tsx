'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Container, Row, Col } from 'react-bootstrap';
import { AuthForm } from '@/components/AuthForm';
import { useAuth } from '@/hooks/useAuth';
import styles from './page.module.scss';

export default function RegisterPage() {
  const router = useRouter();
  const { handleRegister, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) router.push('/dashboard');
  }, [isAuthenticated, router]);

  const onSubmit = async (data: Record<string, string>) => {
    if (data.password !== data.confirmPassword) {
      return { success: false, error: 'Las contraseñas no coinciden' };
    }
    const result = await handleRegister(data.email, data.password, data.name);
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
            <h1 className={styles.title}>Crear Cuenta</h1>
            <p className={styles.subtitle}>Únete a nuestra comunidad</p>
          </div>

          <AuthForm type="register" onSubmit={onSubmit} isLoading={isLoading} />

          <div className={styles.footer}>
            <p>
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className={styles.link}>
                Inicia sesión
              </Link>
            </p>
          </div>
        </Col>
      </Row>
    </Container>
  );
}
