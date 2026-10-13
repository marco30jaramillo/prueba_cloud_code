'use client';

import React, { useEffect, useState } from 'react';
import { Form, Button, Alert, Spinner } from 'react-bootstrap';
import { authAPI } from '@/lib/api';

interface ResendActivationProps {
  /** Si se conoce el correo no se pide; si no, se muestra un campo. */
  email?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// El servidor exige 60 s entre envíos al mismo destinatario.
const COOLDOWN_SECONDS = 60;

export const ResendActivation: React.FC<ResendActivationProps> = ({ email: knownEmail }) => {
  const [typedEmail, setTypedEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState<{ type: 'primary' | 'error'; text: string } | null>(null);

  const email = (knownEmail ?? typedEmail).trim();

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!EMAIL_REGEX.test(email)) {
      setMessage({ type: 'error', text: 'Escribe un correo electrónico válido.' });
      return;
    }

    setIsSending(true);
    setMessage(null);
    try {
      await authAPI.resendActivation(email);
      // Respuesta genérica: no confirma si el correo tiene una cuenta pendiente.
      setMessage({
        type: 'primary',
        text: 'Si el correo tiene una cuenta pendiente de activación, te enviamos un nuevo enlace. Revisa también el spam.'
      });
      setCooldown(COOLDOWN_SECONDS);
    } catch (error: any) {
      if (error.response?.status === 429) {
        setMessage({ type: 'error', text: 'Hiciste varias solicitudes seguidas. Espera unos minutos e intenta de nuevo.' });
        setCooldown(COOLDOWN_SECONDS);
      } else {
        setMessage({ type: 'error', text: 'No se pudo reenviar el correo. Intenta de nuevo en unos minutos.' });
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div>
      {message && (
        <Alert
          variant={message.type === 'primary' ? 'primary' : 'danger'}
          onClose={() => setMessage(null)}
          dismissible
          className="mb-3"
        >
          {message.text}
        </Alert>
      )}

      {knownEmail === undefined && (
        <Form.Group className="mb-3">
          <Form.Label>Correo Electrónico</Form.Label>
          <Form.Control
            type="email"
            value={typedEmail}
            onChange={e => setTypedEmail(e.target.value)}
            placeholder="Ingresa tu correo electrónico"
            autoComplete="email"
            disabled={isSending}
          />
        </Form.Group>
      )}

      <Button
        variant="outline-primary"
        className="w-100"
        onClick={handleResend}
        disabled={isSending || cooldown > 0}
      >
        {isSending ? (
          <><Spinner animation="border" size="sm" className="me-2" />Enviando...</>
        ) : cooldown > 0 ? (
          `Reenviar de nuevo en ${cooldown} s`
        ) : (
          'Reenviar correo de activación'
        )}
      </Button>
    </div>
  );
};
