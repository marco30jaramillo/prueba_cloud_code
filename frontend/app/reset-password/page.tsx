'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Container, Row, Col, Alert } from 'react-bootstrap';
import { AuthForm, AuthFormData } from '@/components/AuthForm';
import { authAPI } from '@/lib/api';
import styles from './page.module.scss';

function ResetPasswordContent() {
  const router = useRouter();
  // El token viaja en el fragmento (#token=...), que el servidor nunca recibe.
  // La query (?token=...) se acepta solo como respaldo de enlaces ya enviados.
  // Se guarda en memoria y se quita de la barra de direcciones de inmediato.
  const [token, setToken] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token');
    const found = fromHash || new URLSearchParams(window.location.search).get('token');
    if (found) {
      window.history.replaceState(null, '', window.location.pathname);
      setToken(found);
    }
    setChecked(true);
  }, []);

  if (!checked) return null;

  if (!token) {
    return (
      <Container className={styles.container}>
        <Row className="justify-content-center">
          <Col lg={5} md={8}>
            <Alert variant="danger">
              El enlace de recuperación no es válido. Solicita uno nuevo desde{' '}
              <Link href="/forgot-password">recuperar contraseña</Link>.
            </Alert>
          </Col>
        </Row>
      </Container>
    );
  }

  const onSubmit = async (data: AuthFormData) => {
    try {
      const result = await authAPI.resetPassword(token, data.newPassword!);
      if (result.status === 'primary') {
        router.push('/login?reset=1');
      }
      return { success: true, data: result };
    } catch (error: any) {
      const err = error.response?.data;
      return {
        success: false,
        error: err?.message || 'El enlace no es válido o ya venció. Solicita uno nuevo desde "Recuperar contraseña".'
      };
    }
  };

  return (
    <Container className={styles.container}>
      <Row className="justify-content-center min-vh-50">
        <Col lg={5} md={8}>
          <div className={styles.header}>
            <h1 className={styles.title}>Restablecer Contraseña</h1>
            <p className={styles.subtitle}>Crea una nueva contraseña segura</p>
          </div>

          <AuthForm type="reset-password" onSubmit={onSubmit} />
        </Col>
      </Row>
    </Container>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}
