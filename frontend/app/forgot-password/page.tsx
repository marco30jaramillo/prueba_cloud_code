'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Container, Row, Col, Alert } from 'react-bootstrap';
import { AuthForm, AuthFormData } from '@/components/AuthForm';
import { authAPI } from '@/lib/api';
import styles from './page.module.scss';

export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);

  const onSubmit = async (data: AuthFormData) => {
    try {
      const result = await authAPI.forgotPassword(data.email!);
      setSentTo(data.email!.trim());
      return { success: true, data: result };
    } catch (error: any) {
      const err = error.response?.data;
      return { success: false, error: err?.message || 'Error al procesar solicitud' };
    }
  };

  return (
    <Container className={styles.container}>
      <Row className="justify-content-center min-vh-50">
        <Col lg={5} md={8}>
          <div className={styles.header}>
            <h1 className={styles.title}>Recuperar Contraseña</h1>
            <p className={styles.subtitle}>Ingresa tu correo para recibir un enlace de recuperación</p>
          </div>

          {sentTo ? (
            <Alert variant="success" className="mb-4">
              <Alert.Heading>📧 Revisa tu correo</Alert.Heading>
              Si <strong>{sentTo}</strong> pertenece a una cuenta, te enviamos un enlace para crear
              una nueva contraseña. El enlace sirve una sola vez y vence en una hora. Mira también
              la carpeta de spam.
            </Alert>
          ) : (
            <>
              <Alert variant="info" className="mb-4">
                <Alert.Heading>¿Olvidaste tu contraseña?</Alert.Heading>
                Ingresa tu correo electrónico y te enviaremos un enlace seguro para que puedas crear una nueva contraseña.
              </Alert>

              <AuthForm type="forgot-password" onSubmit={onSubmit} />
            </>
          )}

          <div className={styles.footer}>
            <Link href="/login" className={styles.link}>
              ← Volver a iniciar sesión
            </Link>
          </div>
        </Col>
      </Row>
    </Container>
  );
}
