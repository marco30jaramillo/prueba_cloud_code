'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Container, Row, Col, Alert } from 'react-bootstrap';
import { AuthForm, AuthFormData } from '@/components/AuthForm';
import { ResendActivation } from '@/components/ResendActivation';
import { useAuth } from '@/hooks/useAuth';
import styles from './page.module.scss';

export default function RegisterPage() {
  const router = useRouter();
  const { handleRegister, isLoading, isAuthenticated } = useAuth();
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) router.push('/dashboard');
  }, [isAuthenticated, router]);

  const onSubmit = async (data: AuthFormData) => {
    if (data.password !== data.confirmPassword) {
      return { success: false, error: 'Las contraseñas no coinciden' };
    }
    const result = await handleRegister(data.email!, data.password!, data.name!, data.photo);
    if (result.success) {
      // El registro no inicia sesión: la persona debe activar la cuenta desde su correo.
      setRegisteredEmail(data.email!.trim());
    }
    return result;
  };

  if (registeredEmail) {
    return (
      <Container className={styles.container}>
        <Row className="justify-content-center min-vh-50">
          <Col lg={5} md={8}>
            <div className={styles.header}>
              <h1 className={styles.title}>Revisa tu correo</h1>
              <p className={styles.subtitle}>Tu cuenta ya fue creada, falta activarla</p>
            </div>

            <Alert variant="success" className="mb-4">
              <Alert.Heading>📧 Revisa tu correo para activar tu cuenta (mira también el spam)</Alert.Heading>
              Enviamos un enlace de activación a <strong>{registeredEmail}</strong>. Al abrirlo
              entrarás a tu cuenta y te pediremos definir tu contraseña.
            </Alert>

            <p className="text-center text-muted">¿No te llegó? Puedes pedir que te lo enviemos de nuevo.</p>
            <ResendActivation email={registeredEmail} />

            <div className={styles.footer}>
              <p>
                <Link href="/login" className={styles.link}>
                  Ir a iniciar sesión
                </Link>
              </p>
            </div>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <Container className={styles.container}>
      <Row className="justify-content-center min-vh-50">
        <Col lg={5} md={8}>
          <div className={styles.header}>
            <h1 className={styles.title}>Crear cuenta de cliente</h1>
            <p className={styles.subtitle}>Consulta tus vales y saldo en cualquier tienda</p>
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
