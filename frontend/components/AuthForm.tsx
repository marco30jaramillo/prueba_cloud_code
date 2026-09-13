'use client';

import React, { useState } from 'react';
import { Form, Button, Alert, Spinner, InputGroup } from 'react-bootstrap';
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const fields = {
    login: ['email', 'password'],
    register: ['email', 'password', 'confirmPassword', 'name', 'photo'],
    'forgot-password': ['email'],
    'reset-password': ['token', 'newPassword', 'confirmPassword']
  };

  const labels = {
    email: 'Correo Electrónico',
    password: 'Contraseña',
    confirmPassword: 'Confirmar Contraseña',
    name: 'Nombre Completo',
    photo: 'Foto de Perfil (URL)',
    token: 'Token de Recuperación',
    newPassword: 'Nueva Contraseña'
  };

  const requiredFields = {
    login: ['email', 'password'],
    register: ['email', 'password', 'confirmPassword', 'name'],
    'forgot-password': ['email'],
    'reset-password': ['token', 'newPassword', 'confirmPassword']
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
    const currentFields = fields[type];

    // Validar campos requeridos
    currentFields.forEach(field => {
      if (!formData[field] || formData[field].trim() === '') {
        newErrors[field] = `${labels[field as keyof typeof labels]} es requerido`;
      }
    });

    // Email validation
    if (formData.email && !formData.email.includes('@')) {
      newErrors.email = 'Email inválido. Debe contener @';
    }

    // Password validation
    if (formData.password && formData.password.length < 8) {
      newErrors.password = 'Mínimo 8 caracteres';
    }

    if (formData.newPassword && formData.newPassword.length < 8) {
      newErrors.newPassword = 'Mínimo 8 caracteres';
    }

    // Confirm password validation
    if (formData.confirmPassword && formData.password && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    if (formData.confirmPassword && formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setMessage(null);
    const response = await onSubmit(formData);
    if (response.success) {
      setMessage({ type: 'success', text: 'Operación completada con éxito' });
      setFormData({});
      setShowPassword(false);
      setShowConfirmPassword(false);
    } else {
      setMessage({ type: 'error', text: response.error || 'Error desconocido. Intenta nuevamente.' });
    }
  };

  const isPasswordField = (field: string) => field === 'password' || field === 'newPassword';
  const isConfirmPasswordField = (field: string) => field === 'confirmPassword';

  return (
    <div className={styles.formContainer}>
      {message && (
        <Alert
          variant={message.type === 'success' ? 'success' : 'danger'}
          onClose={message.type === 'success' ? () => setMessage(null) : undefined}
          dismissible={message.type === 'success'}
          className={`mb-4 ${message.type === 'error' ? 'fade-in' : ''}`}
        >
          <strong>{message.type === 'success' ? '✓ Éxito' : '❌ Error'}:</strong> {message.text}
        </Alert>
      )}

      <Form onSubmit={handleSubmit} className={styles.form}>
        {fields[type].map(field => {
          const isPassword = isPasswordField(field);
          const isConfirmPass = isConfirmPasswordField(field);
          const inputType = isPassword ? (showPassword ? 'text' : 'password') :
                           isConfirmPass ? (showConfirmPassword ? 'text' : 'password') :
                           field === 'email' ? 'email' : 'text';

          return (
            <Form.Group key={field} className={`mb-3 ${styles.formGroup}`}>
              <Form.Label className={styles.label}>
                {labels[field as keyof typeof labels] || field}
              </Form.Label>

              {isPassword || isConfirmPass ? (
                <InputGroup>
                  <Form.Control
                    type={inputType}
                    name={field}
                    value={formData[field] || ''}
                    onChange={handleChange}
                    placeholder={`Ingresa tu ${labels[field as keyof typeof labels] || field}`}
                    className={`${styles.input} ${errors[field] ? styles.error : ''}`}
                    disabled={isLoading}
                    isInvalid={!!errors[field]}
                  />
                  <Button
                    variant="outline-secondary"
                    onClick={() => {
                      if (isPassword) setShowPassword(!showPassword);
                      if (isConfirmPass) setShowConfirmPassword(!showConfirmPassword);
                    }}
                    className={styles.toggleBtn}
                    disabled={isLoading}
                  >
                    {isPassword && (showPassword ? '👁️' : '👁️‍🗨️')}
                    {isConfirmPass && (showConfirmPassword ? '👁️' : '👁️‍🗨️')}
                  </Button>
                </InputGroup>
              ) : (
                <Form.Control
                  type={inputType}
                  name={field}
                  value={formData[field] || ''}
                  onChange={handleChange}
                  placeholder={`Ingresa tu ${labels[field as keyof typeof labels] || field}`}
                  className={`${styles.input} ${errors[field] ? styles.error : ''}`}
                  disabled={isLoading}
                  isInvalid={!!errors[field]}
                />
              )}

              {errors[field] && (
                <Form.Control.Feedback type="invalid" className={styles.feedback}>
                  {errors[field]}
                </Form.Control.Feedback>
              )}
            </Form.Group>
          );
        })}

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
