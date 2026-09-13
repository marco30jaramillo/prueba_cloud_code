'use client';

import React, { useState } from 'react';
import { Form, Button, Alert, Spinner, InputGroup } from 'react-bootstrap';
import styles from './AuthForm.module.scss';

export interface AuthFormData {
  email?: string;
  password?: string;
  confirmPassword?: string;
  name?: string;
  photo?: string;
  token?: string;
  newPassword?: string;
  rememberMe?: boolean;
}

interface AuthFormProps {
  type: 'login' | 'register' | 'forgot-password' | 'reset-password';
  onSubmit: (data: AuthFormData) => Promise<{ success: boolean; error?: string }>;
  isLoading?: boolean;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const FIELD_CONFIG: Record<string, string[]> = {
  login:            ['email', 'password'],
  register:         ['email', 'password', 'confirmPassword', 'name', 'photo'],
  'forgot-password':['email'],
  'reset-password': ['token', 'newPassword', 'confirmPassword']
};

const LABELS: Record<string, string> = {
  email:           'Correo Electrónico',
  password:        'Contraseña',
  confirmPassword: 'Confirmar Contraseña',
  name:            'Nombre Completo',
  photo:           'Foto de Perfil (URL)',
  token:           'Token de Recuperación',
  newPassword:     'Nueva Contraseña'
};

const SUBMIT_LABEL: Record<string, string> = {
  login:             'Iniciar Sesión',
  register:          'Crear Cuenta',
  'forgot-password': 'Enviar Enlace',
  'reset-password':  'Restablecer Contraseña'
};

const REQUIRED: Record<string, string[]> = {
  login:             ['email', 'password'],
  register:          ['email', 'password', 'confirmPassword', 'name'],
  'forgot-password': ['email'],
  'reset-password':  ['token', 'newPassword', 'confirmPassword']
};

export const AuthForm: React.FC<AuthFormProps> = ({ type, onSubmit, isLoading = false }) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    const fields = FIELD_CONFIG[type];

    REQUIRED[type].forEach(field => {
      if (!formData[field]?.trim()) {
        newErrors[field] = `${LABELS[field] || field} es requerido`;
      }
    });

    if (formData.email && !EMAIL_REGEX.test(formData.email)) {
      newErrors.email = 'El formato del email no es válido (ej: usuario@dominio.com)';
    }

    if (formData.password && formData.password.length < 8) {
      newErrors.password = 'Mínimo 8 caracteres';
    }
    if (formData.newPassword && formData.newPassword.length < 8) {
      newErrors.newPassword = 'Mínimo 8 caracteres';
    }

    if (formData.confirmPassword) {
      const base = formData.password || formData.newPassword;
      if (base && base !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Las contraseñas no coinciden';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setMessage(null);

    const payload: AuthFormData = { ...formData };
    if (type === 'login') payload.rememberMe = rememberMe;

    const response = await onSubmit(payload);
    if (!response.success) {
      setMessage({ type: 'error', text: response.error || 'Error desconocido. Intenta nuevamente.' });
    }
    // On success the parent handles navigation; no "success" message needed here
  };

  const isPasswordField    = (f: string) => f === 'password' || f === 'newPassword';
  const isConfirmPassField = (f: string) => f === 'confirmPassword';

  return (
    <div className={styles.formContainer}>
      {message && (
        <Alert
          variant={message.type === 'success' ? 'success' : 'danger'}
          onClose={() => setMessage(null)}
          dismissible
          className="mb-4"
        >
          <strong>{message.type === 'success' ? '✓ Éxito' : '❌ Error'}:</strong> {message.text}
        </Alert>
      )}

      <Form onSubmit={handleSubmit} className={styles.form}>
        {FIELD_CONFIG[type].map(field => {
          const isPwd    = isPasswordField(field);
          const isConf   = isConfirmPassField(field);
          const inputType =
            isPwd  ? (showPassword        ? 'text' : 'password') :
            isConf ? (showConfirmPassword ? 'text' : 'password') :
            field === 'email' ? 'email' : 'text';

          return (
            <Form.Group key={field} className={`mb-3 ${styles.formGroup}`}>
              <Form.Label className={styles.label}>
                {LABELS[field] || field}
                {REQUIRED[type].includes(field) && <span className={styles.required}> *</span>}
              </Form.Label>

              {isPwd || isConf ? (
                <InputGroup>
                  <Form.Control
                    type={inputType}
                    name={field}
                    value={formData[field] || ''}
                    onChange={handleChange}
                    placeholder={`Ingresa tu ${LABELS[field] || field}`}
                    className={`${styles.input} ${errors[field] ? styles.error : ''}`}
                    disabled={isLoading}
                    isInvalid={!!errors[field]}
                    autoComplete={isPwd ? (type === 'login' ? 'current-password' : 'new-password') : 'new-password'}
                  />
                  <Button
                    variant="outline-secondary"
                    type="button"
                    onClick={() => isPwd ? setShowPassword(v => !v) : setShowConfirmPassword(v => !v)}
                    className={styles.toggleBtn}
                    disabled={isLoading}
                    tabIndex={-1}
                  >
                    {(isPwd ? showPassword : showConfirmPassword) ? '👁️' : '👁️‍🗨️'}
                  </Button>
                  <Form.Control.Feedback type="invalid">{errors[field]}</Form.Control.Feedback>
                </InputGroup>
              ) : (
                <>
                  <Form.Control
                    type={inputType}
                    name={field}
                    value={formData[field] || ''}
                    onChange={handleChange}
                    placeholder={field === 'photo' ? 'https://... (opcional)' : `Ingresa tu ${LABELS[field] || field}`}
                    className={`${styles.input} ${errors[field] ? styles.error : ''}`}
                    disabled={isLoading}
                    isInvalid={!!errors[field]}
                    autoComplete={field === 'email' ? 'email' : 'off'}
                  />
                  <Form.Control.Feedback type="invalid">{errors[field]}</Form.Control.Feedback>
                </>
              )}
            </Form.Group>
          );
        })}

        {type === 'login' && (
          <Form.Group className={`mb-3 ${styles.rememberRow}`}>
            <Form.Check
              type="checkbox"
              id="rememberMe"
              label="Recordarme por 7 días"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              disabled={isLoading}
              className={styles.rememberCheck}
            />
          </Form.Group>
        )}

        <Button
          variant="success"
          type="submit"
          className={`w-100 ${styles.submitBtn}`}
          disabled={isLoading}
        >
          {isLoading ? (
            <><Spinner animation="border" size="sm" className="me-2" />Procesando...</>
          ) : (
            SUBMIT_LABEL[type]
          )}
        </Button>
      </Form>
    </div>
  );
};
