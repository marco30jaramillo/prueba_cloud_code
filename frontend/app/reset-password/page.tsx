'use client';

import React, { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Container, Row, Col, Alert } from 'react-bootstrap';
import { AuthForm, AuthFormData } from '@/components/AuthForm';
import { authAPI } from '@/lib/api';
import styles from './page.module.scss';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  if (!token) {
    return (
      <Container className={styles.container}>
        <Row className="justify-content-center">
          <Col lg={5} md={8}>
            <Alert variant="danger">
              Token no proporcionado. Solicita un nuevo enlace de recuperación.
            </Alert>
          </Col>
        </Row>
      </Container>
    );
  }

  const onSubmit = async (data: AuthFormData) => {
    try {
      const result = await authAPI.resetPassword(token, data.newPassword!);
      if (result.status === 'success') {
        router.push('/login?message=Contraseña restablecida');
      }
      return { success: true, data: result };
    } catch (error: any) {
      const err = error.response?.data;
      return { success: false, error: err?.message || 'Error al restablecer' };
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
