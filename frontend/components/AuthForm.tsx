'use client';

import React, { useState } from 'react';
import { Form, Button, Alert, Spinner } from 'react-bootstrap';
import styles from './AuthForm.module.scss';

interface AuthFormProps {
  type: 'login' | 'register' | 'forgot-password' | 'reset-password';
  onSubmit: (data: Record<string, string>) => Promise<{ success: boolean; error?: string }>;
  isLoading?: boolean;
}

export const AuthForm: React.FC<AuthFormProps> = ({ type, onSubmit, isLoading = false }) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fields = {
    login: ['email', 'password'],
    register: ['email', 'password', 'confirmPassword', 'name'],
    'forgot-password': ['email'],
    'reset-password': ['token', 'newPassword', 'confirmPassword']
  };

  const labels = {
    email: 'Correo Electrónico',
    password: 'Contraseña',
    confirmPassword: 'Confirmar Contraseña',
    name: 'Nombre Completo',
    token: 'Token de Recuperación',
    newPassword: 'Nueva Contraseña'
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.email && !formData.email.includes('@')) {
      newErrors.email = 'Email inválido';
    }

    if (formData.password && formData.password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
    }

    if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const response = await onSubmit(formData);
    if (response.success) {
      setMessage({ type: 'success', text: 'Operación completada con éxito' });
      setFormData({});
    } else {
      setMessage({ type: 'error', text: response.error || 'Error desconocido' });
    }
  };

  return (
    <div className={styles.formContainer}>
      {message && (
        <Alert
          variant={message.type === 'success' ? 'success' : 'danger'}
          onClose={() => setMessage(null)}
          dismissible
          className="mb-4 fade-in"
        >
          {message.text}
        </Alert>
      )}

      <Form onSubmit={handleSubmit} className={styles.form}>
        {fields[type].map(field => (
          <Form.Group key={field} className={`mb-3 ${styles.formGroup}`}>
            <Form.Label className={styles.label}>
              {labels[field as keyof typeof labels] || field}
            </Form.Label>
            <Form.Control
              type={field.includes('password') ? 'password' : field === 'email' ? 'email' : 'text'}
              name={field}
              value={formData[field] || ''}
              onChange={handleChange}
              placeholder={`Ingresa tu ${labels[field as keyof typeof labels] || field}`}
              className={`${styles.input} ${errors[field] ? styles.error : ''}`}
              disabled={isLoading}
              isInvalid={!!errors[field]}
            />
            {errors[field] && (
              <Form.Control.Feedback type="invalid" className={styles.feedback}>
                {errors[field]}
              </Form.Control.Feedback>
            )}
          </Form.Group>
        ))}

        <Button
          variant="success"
          type="submit"
          className={`w-100 ${styles.submitBtn}`}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Procesando...
            </>
          ) : (
            'Continuar'
          )}
        </Button>
      </Form>
    </div>
  );
};
