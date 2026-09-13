'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Accordion, Badge } from 'react-bootstrap';
import { authAPI } from '@/lib/api';
import styles from './page.module.scss';

export default function BootstrapPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({ email: '', password: '', name: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
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

    if (!formData.email) newErrors.email = 'Email es requerido';
    if (!formData.password) newErrors.password = 'Contraseña es requerida';
    if (!formData.name) newErrors.name = 'Nombre es requerido';
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Confirmar contraseña es requerida';

    if (formData.email && !formData.email.includes('@')) {
      newErrors.email = 'Email inválido';
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
          type: 'success',
          text: '✅ Super Usuario creado exitosamente. Redirigiendo a login...'
        });
        setFormData({ email: '', password: '', name: '', confirmPassword: '' });

        setTimeout(() => router.push('/login'), 2000);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Error al crear super usuario';
      setMessage({ type: 'error', text: `⚠ ${errorMsg}` });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <Container className={styles.container}>
      <Row className="justify-content-center min-vh-100">
        <Col lg={5} md={8}>
          <div className={styles.header}>
            <h1 className={styles.title}>🔐 Crear Super Usuario</h1>
            <p className={styles.subtitle}>Configuración inicial del sistema</p>
          </div>

          {message && (
            <Alert
              variant={message.type === 'success' ? 'success' : message.type === 'error' ? 'danger' : 'info'}
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
                      {showPassword ? '👁️' : '👁️‍🗨️'}
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
                      {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                    </Button>
                  </div>
                  {errors.confirmPassword && (
                    <Form.Control.Feedback type="invalid" className="d-block">
                      {errors.confirmPassword}
                    </Form.Control.Feedback>
                  )}
                </Form.Group>

                <Button
                  variant="success"
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
                    '🔐 Crear Super Usuario'
                  )}
                </Button>
              </Form>

              <div className={styles.footer}>
                <p className={styles.hint}>
                  ℹ️ Esta es una página de configuración inicial. Solo funciona si no existe superusuario.
                </p>
              </div>
            </Card.Body>
          </Card>

          <Card className={`${styles.card} mt-5`}>
            <Card.Header className={styles.resourcesHeader}>
              <Card.Title className="mb-0">📚 Recursos Disponibles (Endpoints)</Card.Title>
            </Card.Header>
            <Card.Body>
              <Accordion defaultActiveKey="auth" flush>
                <Accordion.Item eventKey="auth">
                  <Accordion.Header>🔐 Autenticación</Accordion.Header>
                  <Accordion.Body>
                    <div className={styles.endpoint}>
                      <div className={styles.endpointHeader}>
                        <Badge bg="success">POST</Badge>
                        <code>/auth/register</code>
                      </div>
                      <p>Registrar nuevo cliente (sin token requerido)</p>
                      <small className={styles.endpointDetails}>
                        ✅ No requiere autenticación<br/>
                        ✅ Crea usuario con rol "cliente"<br/>
                        ✅ Retorna JWT token
                      </small>
                    </div>

                    <div className={styles.endpoint}>
                      <div className={styles.endpointHeader}>
                        <Badge bg="success">POST</Badge>
                        <code>/auth/login</code>
                      </div>
                      <p>Iniciar sesión</p>
                      <small className={styles.endpointDetails}>
                        ✅ No requiere autenticación<br/>
                        ✅ Email + Contraseña<br/>
                        ✅ Retorna JWT token + datos usuario
                      </small>
                    </div>

                    <div className={styles.endpoint}>
                      <div className={styles.endpointHeader}>
                        <Badge bg="warning" text="dark">GET</Badge>
                        <code>/auth/validate</code>
                      </div>
                      <p>Validar sesión actual</p>
                      <small className={styles.endpointDetails}>
                        🔒 Requiere token<br/>
                        ✅ Verifica JWT vigente<br/>
                        ✅ Retorna datos usuario + expiración
                      </small>
                    </div>

                    <div className={styles.endpoint}>
                      <div className={styles.endpointHeader}>
                        <Badge bg="danger">POST</Badge>
                        <code>/auth/logout</code>
                      </div>
                      <p>Cerrar sesión actual</p>
                      <small className={styles.endpointDetails}>
                        🔒 Requiere token<br/>
                        ✅ Revoca solo este token<br/>
                        ✅ Otros dispositivos siguen conectados
                      </small>
                    </div>

                    <div className={styles.endpoint}>
                      <div className={styles.endpointHeader}>
                        <Badge bg="danger">POST</Badge>
                        <code>/auth/logout-all</code>
                      </div>
                      <p>Cerrar sesión en todos los dispositivos</p>
                      <small className={styles.endpointDetails}>
                        🔒 Requiere token<br/>
                        ✅ Revoca TODOS los tokens del usuario<br/>
                        ⚠️ Cierra sesión en todos lados
                      </small>
                    </div>
                  </Accordion.Body>
                </Accordion.Item>

                <Accordion.Item eventKey="admin">
                  <Accordion.Header>👥 Administración de Usuarios</Accordion.Header>
                  <Accordion.Body>
                    <div className={styles.endpoint}>
                      <div className={styles.endpointHeader}>
                        <Badge bg="success">POST</Badge>
                        <code>/auth/bootstrap-superuser</code>
                      </div>
                      <p>Crear primer superuser (solo 1 vez)</p>
                      <small className={styles.endpointDetails}>
                        ✅ No requiere autenticación<br/>
                        ✅ Solo funciona si no existe superuser<br/>
                        ⚠️ Falla en 2do intento
                      </small>
                    </div>

                    <div className={styles.endpoint}>
                      <div className={styles.endpointHeader}>
                        <Badge bg="success">POST</Badge>
                        <code>/auth/create-user</code>
                      </div>
                      <p>Crear usuario con rol específico</p>
                      <small className={styles.endpointDetails}>
                        🔒 Requiere token (superuser/admin)<br/>
                        ✅ Superuser: puede crear cualquier rol<br/>
                        ✅ Admin: puede crear cliente/vendedor
                      </small>
                    </div>

                    <div className={styles.endpoint}>
                      <div className={styles.endpointHeader}>
                        <Badge bg="warning" text="dark">GET</Badge>
                        <code>/auth/user-schema/:roleType</code>
                      </div>
                      <p>Obtener esquema de usuario por rol</p>
                      <small className={styles.endpointDetails}>
                        ✅ Roles: superuser, administrador, vendedor, cliente<br/>
                        ✅ Retorna campos requeridos y constrains<br/>
                        ✅ Útil para validaciones dinámicas
                      </small>
                    </div>
                  </Accordion.Body>
                </Accordion.Item>

                <Accordion.Item eventKey="recovery">
                  <Accordion.Header>🔑 Recuperación de Contraseña</Accordion.Header>
                  <Accordion.Body>
                    <div className={styles.endpoint}>
                      <div className={styles.endpointHeader}>
                        <Badge bg="success">POST</Badge>
                        <code>/auth/forgot-password</code>
                      </div>
                      <p>Solicitar recuperación de contraseña</p>
                      <small className={styles.endpointDetails}>
                        ✅ No requiere autenticación<br/>
                        ✅ Envía enlace de reset (simulado en consola)<br/>
                        ✅ Genera token único de 1 uso
                      </small>
                    </div>

                    <div className={styles.endpoint}>
                      <div className={styles.endpointHeader}>
                        <Badge bg="success">POST</Badge>
                        <code>/auth/reset-password</code>
                      </div>
                      <p>Restablecer contraseña con token</p>
                      <small className={styles.endpointDetails}>
                        ✅ No requiere autenticación<br/>
                        ✅ Token de reset + nueva contraseña<br/>
                        ✅ Token solo funciona 1 vez
                      </small>
                    </div>
                  </Accordion.Body>
                </Accordion.Item>

                <Accordion.Item eventKey="system">
                  <Accordion.Header>⚙️ Sistema</Accordion.Header>
                  <Accordion.Body>
                    <div className={styles.endpoint}>
                      <div className={styles.endpointHeader}>
                        <Badge bg="info" text="dark">GET</Badge>
                        <code>/health</code>
                      </div>
                      <p>Estado del servidor</p>
                      <small className={styles.endpointDetails}>
                        ✅ Sin autenticación<br/>
                        ✅ Retorna estado del backend
                      </small>
                    </div>

                    <div className={styles.endpoint}>
                      <div className={styles.endpointHeader}>
                        <Badge bg="info" text="dark">GET</Badge>
                        <code>/tokens/stats</code>
                      </div>
                      <p>Estadísticas de tokens</p>
                      <small className={styles.endpointDetails}>
                        ✅ Sin autenticación<br/>
                        ✅ Tokens activos, revocados, usuarios
                      </small>
                    </div>

                    <div className={styles.endpoint}>
                      <div className={styles.endpointHeader}>
                        <Badge bg="info" text="dark">GET</Badge>
                        <code>/docs</code>
                      </div>
                      <p>Documentación de API</p>
                      <small className={styles.endpointDetails}>
                        ✅ Sin autenticación<br/>
                        ✅ Accede al navegador en /docs
                      </small>
                    </div>
                  </Accordion.Body>
                </Accordion.Item>
              </Accordion>

              <div className={styles.rolesSection}>
                <h5 className="mt-4 mb-3">👥 Roles Disponibles</h5>
                <Row>
                  <Col md={6} className="mb-3">
                    <Card className={styles.roleCard}>
                      <Card.Body>
                        <Card.Title className={styles.roleName}>👑 Superuser</Card.Title>
                        <p className={styles.roleDesc}>Acceso total al sistema</p>
                        <small>
                          ✅ Crear usuarios (cualquier rol)<br/>
                          ✅ Permisos: system:full-access
                        </small>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={6} className="mb-3">
                    <Card className={styles.roleCard}>
                      <Card.Body>
                        <Card.Title className={styles.roleName}>📊 Administrador</Card.Title>
                        <p className={styles.roleDesc}>Gestión de usuarios</p>
                        <small>
                          ✅ Crear: cliente, vendedor<br/>
                          ✅ Ver: todos los perfiles
                        </small>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={6} className="mb-3">
                    <Card className={styles.roleCard}>
                      <Card.Body>
                        <Card.Title className={styles.roleName}>💼 Vendedor</Card.Title>
                        <p className={styles.roleDesc}>Operaciones limitadas</p>
                        <small>
                          ✅ Ver perfil propio<br/>
                          ✅ Ver clientes asignados
                        </small>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={6} className="mb-3">
                    <Card className={styles.roleCard}>
                      <Card.Body>
                        <Card.Title className={styles.roleName}>👤 Cliente</Card.Title>
                        <p className={styles.roleDesc}>Usuario estándar</p>
                        <small>
                          ✅ Ver perfil propio<br/>
                          ✅ Cambiar contraseña
                        </small>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
