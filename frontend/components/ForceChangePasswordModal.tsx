'use client';

import React, { useState } from 'react';
import { Modal, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useAuthStore } from '@/lib/auth-store';
import { authAPI } from '@/lib/api';
import styles from './ForceChangePasswordModal.module.scss';

interface ForceChangePasswordModalProps {
  show: boolean;
  onPasswordChanged: () => void;
  onCancel: () => void;
}

export const ForceChangePasswordModal: React.FC<ForceChangePasswordModalProps> = ({
  show,
  onPasswordChanged,
  onCancel
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'Ambos campos son requeridos' });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'La contraseña debe tener al menos 8 caracteres' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas no coinciden' });
      return;
    }

    setIsLoading(true);
    try {
      await authAPI.changePasswordTemporary(newPassword);
      setMessage({ type: 'success', text: '✅ Contraseña actualizada exitosamente' });
      setTimeout(() => {
        onPasswordChanged();
      }, 1000);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Error al cambiar contraseña';
      setMessage({ type: 'error', text: `❌ ${errorMsg}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (confirm('⚠️ Si cancelas, tu sesión se cerrará. ¿Continuar?')) {
      onCancel();
    }
  };

  return (
    <Modal show={show} backdrop="static" keyboard={false} centered className={styles.modal}>
      <Modal.Header className={styles.header}>
        <Modal.Title>🔐 Cambiar Contraseña</Modal.Title>
      </Modal.Header>
      <Modal.Body className={styles.body}>
        <Alert variant="warning" className="mb-4">
          <p className="mb-0">
            <strong>Contraseña Temporal:</strong> Se ha asignado una contraseña temporal a tu cuenta.
            Debes cambiarla ahora para continuar.
          </p>
        </Alert>

        {message && (
          <Alert
            variant={message.type === 'success' ? 'success' : 'danger'}
            className="mb-3"
          >
            {message.text}
          </Alert>
        )}

        <Form.Group className="mb-3">
          <Form.Label>Nueva Contraseña</Form.Label>
          <div className="input-group">
            <Form.Control
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              disabled={isLoading}
            />
            <Button
              variant="outline-secondary"
              onClick={() => setShowNewPassword(!showNewPassword)}
              disabled={isLoading}
            >
              {showNewPassword ? '👁️' : '👁️‍🗨️'}
            </Button>
          </div>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Confirmar Contraseña</Form.Label>
          <div className="input-group">
            <Form.Control
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la contraseña"
              disabled={isLoading}
            />
            <Button
              variant="outline-secondary"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={isLoading}
            >
              {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
            </Button>
          </div>
        </Form.Group>
      </Modal.Body>
      <Modal.Footer className={styles.footer}>
        <Button
          variant="secondary"
          onClick={handleCancel}
          disabled={isLoading}
        >
          ❌ Cancelar (cerrar sesión)
        </Button>
        <Button
          variant="success"
          onClick={handleChangePassword}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Cambiando...
            </>
          ) : (
            '✓ Cambiar Contraseña'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
