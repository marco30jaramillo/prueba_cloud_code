'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { authAPI } from '@/lib/api';
import styles from './page.module.scss';

import { Icon } from '@/components/Icon';
export default function BootstrapPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({ email: '', password: '', name: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: 'primary' | 'error' | 'info'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) newErrors.email = 'El correo es obligatorio';
    if (!formData.password) newErrors.password = 'Contraseña es requerida';
    if (!formData.name) newErrors.name = 'Nombre es requerido';
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Confirmar contraseña es requerida';

    if (formData.email && !formData.email.includes('@')) {
      newErrors.email = 'El correo no es válido';
    }

    if (formData.password && formData.password.length < 8) {
      newErrors.password = 'Mínimo 8 caracteres';
    }

    if (formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await authAPI.bootstrapSuperuser(formData.email, formData.password, formData.name);

      if (response.user) {
        setMessage({
          type: 'primary',
          text: 'Superusuario creado. Te llevamos a iniciar sesión...'
        });
        setFormData({ email: '', password: '', name: '', confirmPassword: '' });

        setTimeout(() => router.push('/login'), 2000);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'No pudimos crear el superusuario';
      setMessage({ type: 'error', text: `${errorMsg}` });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <Container className={styles.container}>
      <Row className="justify-content-center min-vh-100">
        <Col lg={5} md={8}>
          <div className={styles.header}>
            <h1 className={styles.title}><Icon name="candado" /> Crear superusuario</h1>
            <p className={styles.subtitle}>Configuración inicial del sistema</p>
          </div>

          {message && (
            <Alert
              variant={message.type === 'primary' ? 'primary' : message.type === 'error' ? 'danger' : 'info'}
              onClose={() => setMessage(null)}
              dismissible
              className="mb-4 fade-in"
            >
              {message.text}
            </Alert>
          )}

          <Card className={styles.card}>
            <Card.Body>
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Nombre Completo</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Nombre del administrador"
                    disabled={isLoading}
                    isInvalid={!!errors.name}
                  />
                  {errors.name && (
                    <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
                  )}
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Correo Electrónico</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="admin@example.com"
                    disabled={isLoading}
                    isInvalid={!!errors.email}
                  />
                  {errors.email && (
                    <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
                  )}
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Contraseña</Form.Label>
                  <div className={`input-group ${styles.inputGroupWrapper}`}>
                    <Form.Control
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Mínimo 8 caracteres"
                      disabled={isLoading}
                      isInvalid={!!errors.password}
                    />
                    <Button
                      variant="outline-secondary"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                      className={styles.toggleBtn}
                    >
                      <Icon name={showPassword ? 'ocultar' : 'ver'} />
                    </Button>
                  </div>
                  {errors.password && (
                    <Form.Control.Feedback type="invalid" className="d-block">
                      {errors.password}
                    </Form.Control.Feedback>
                  )}
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>Confirmar Contraseña</Form.Label>
                  <div className={`input-group ${styles.inputGroupWrapper}`}>
                    <Form.Control
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Repite tu contraseña"
                      disabled={isLoading}
                      isInvalid={!!errors.confirmPassword}
                    />
                    <Button
                      variant="outline-secondary"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isLoading}
                      className={styles.toggleBtn}
                    >
                      <Icon name={showConfirmPassword ? 'ocultar' : 'ver'} />
                    </Button>
                  </div>
                  {errors.confirmPassword && (
                    <Form.Control.Feedback type="invalid" className="d-block">
                      {errors.confirmPassword}
                    </Form.Control.Feedback>
                  )}
                </Form.Group>

                <Button
                  variant="primary"
                  type="submit"
                  className="w-100 mb-3"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Creando...
                    </>
                  ) : (
                    'Crear superusuario'
                  )}
                </Button>
              </Form>

              <div className={styles.footer}>
                <p className={styles.hint}>
                  <Icon name="informacion" /> Esta página es solo para la configuración inicial. Solo funciona si aún no existe un superusuario.
                </p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
