'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Container, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { authAPI } from '@/lib/api';
import { useAuthStore, saveAuthToStorage } from '@/lib/auth-store';
import { ResendActivation } from '@/components/ResendActivation';
import { AuthResponse } from '@/types';
import styles from './page.module.scss';

import { Icon } from '@/components/Icon';
type Status = 'activating' | 'primary' | 'error';

export default function ActivarPage() {
  const router = useRouter();
  const setAuth = useAuthStore(state => state.setAuth);
  const [status, setStatus] = useState<Status>('activating');
  const [reason, setReason] = useState('');
  // El token es de un solo uso en autorregistro: evita doble llamada por el modo estricto de React.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // El token viaja en el fragmento (#token=...), que el servidor nunca recibe.
    // La query (?token=...) se acepta solo como respaldo de enlaces ya enviados.
    const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token');
    const token = fromHash || new URLSearchParams(window.location.search).get('token');

    // Quita el token de la barra de direcciones y del historial antes de cualquier otra cosa.
    window.history.replaceState(null, '', window.location.pathname);

    if (!token) {
      setReason('El enlace de activación está incompleto. Abre el enlace tal como llegó a tu correo o pide uno nuevo.');
      setStatus('error');
      return;
    }

    const activate = async () => {
      try {
        const response = await authAPI.activate(token);
        // El cuerpo es el mismo del inicio de sesión; se tolera también anidado en `data`.
        const body: AuthResponse = (response as any)?.data?.token ? (response as any).data : response;

        if (body.user && body.token) {
          setAuth(body.user, body.token);
          saveAuthToStorage(body.user, body.token);
          setStatus('primary');
          // Si la cuenta exige cambiar la contraseña, el panel muestra solo ese paso.
          router.replace('/dashboard');
          return;
        }
        setReason('Algo salió mal. Abre el enlace de nuevo o pide uno nuevo.');
        setStatus('error');
      } catch (error: any) {
        const httpStatus = error.response?.status;
        const message = error.response?.data?.message;

        if (httpStatus === 429) {
          setReason('Hubo demasiados intentos con este enlace. Espera unos minutos e inténtalo de nuevo, o pide uno nuevo.');
        } else if (httpStatus === 403 && error.response?.data?.code === 'ACCOUNT_DISABLED') {
          setReason('Tu cuenta está deshabilitada. Contacta al administrador.');
        } else if (httpStatus && httpStatus < 500 && message) {
          setReason(message);
        } else if (httpStatus && httpStatus < 500) {
          setReason('El enlace de activación no es válido o ya venció.');
        } else {
          setReason('No pudimos conectarnos. Revisa tu internet e intenta de nuevo en unos minutos.');
        }
        setStatus('error');
      }
    };

    activate();
  }, [router, setAuth]);

  return (
    <Container className={styles.container}>
      <Row className="justify-content-center min-vh-50">
        <Col lg={5} md={8}>
          <div className={styles.header}>
            <h1 className={styles.title}>Activar cuenta</h1>
            <p className={styles.subtitle}>
              {status === 'error' ? 'No pudimos activar tu cuenta' : 'Estamos activando tu cuenta'}
            </p>
          </div>

          {status !== 'error' && (
            <div className={styles.loading}>
              <Spinner animation="border" role="status" />
              <p className="mt-3 text-muted">
                {status === 'primary' ? 'Cuenta activada. Llevándote al panel...' : 'Validando tu enlace...'}
              </p>
            </div>
          )}

          {status === 'error' && (
            <>
              <Alert variant="danger" className="mb-4">
                <Alert.Heading><Icon name="error" /> Enlace no válido</Alert.Heading>
                {reason}
              </Alert>

              <p className="text-center text-muted">
                Si tu cuenta sigue pendiente, pide que te enviemos un enlace nuevo.
              </p>
              <ResendActivation />

              <div className={styles.footer}>
                <p>
                  <Link href="/login" className={styles.link}>
                    Ir a iniciar sesión
                  </Link>
                </p>
              </div>
            </>
          )}
        </Col>
      </Row>
    </Container>
  );
}
