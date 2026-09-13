'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Row, Col, Card, Button, Form, Alert, Modal, Spinner } from 'react-bootstrap';
import { useAuthStore } from '@/lib/auth-store';
import { authAPI } from '@/lib/api';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import styles from './page.module.scss';

function DashboardPageContent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [roles, setRoles] = useState<string[]>(['cliente', 'vendedor', 'administrador', 'superuser']);
  const [formData, setFormData] = useState({ email: '', password: '', name: '', role: 'cliente' });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const canCreateUsers = ['superuser', 'administrador'].includes(user?.role || '');
  const canResetPasswords = ['superuser', 'administrador'].includes(user?.role || '');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await authAPI.createUser(formData.email, formData.password, formData.name, formData.role);
      setMessage({ type: 'success', text: `Usuario ${formData.email} creado exitosamente` });
      setFormData({ email: '', password: '', name: '', role: 'cliente' });
      setShowCreateUser(false);
    } catch (error: any) {
      const err = error.response?.data;
      setMessage({ type: 'error', text: err?.message || 'Error al crear usuario' });
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      superuser: '#f59e0b',
      administrador: '#3b82f6',
      vendedor: '#10b981',
      cliente: '#8b5cf6'
    };
    return colors[role] || '#6b7280';
  };

  if (!user) return <Spinner />;

  return (
    <Container className={styles.dashboard}>
      <Row className="mb-5">
        <Col lg={12}>
          <Card className={styles.profileCard}>
            <Card.Body className={styles.profileBody}>
              <div className={styles.profileInfo}>
                <h2 className={styles.userName}>Bienvenido, {user.name}</h2>
                <p className={styles.userEmail}>{user.email}</p>
                <span className={styles.roleBadge} style={{ backgroundColor: getRoleColor(user.role) }}>
                  {user.role}
                </span>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

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

      <Row className="g-4">
        {canCreateUsers && (
          <Col lg={6} md={12}>
            <Card className={`${styles.actionCard} h-100`}>
              <Card.Body>
                <Card.Title className={styles.cardTitle}>➕ Crear Usuario</Card.Title>
                <Card.Text>Crea nuevos usuarios con roles específicos</Card.Text>
                <Button
                  variant="success"
                  onClick={() => setShowCreateUser(true)}
                  className={styles.actionBtn}
                >
                  Crear Usuario
                </Button>
              </Card.Body>
            </Card>
          </Col>
        )}

        {canResetPasswords && (
          <Col lg={6} md={12}>
            <Card className={`${styles.actionCard} h-100`}>
              <Card.Body>
                <Card.Title className={styles.cardTitle}>🔑 Restablecer Contraseña</Card.Title>
                <Card.Text>Ayuda a usuarios a recuperar sus contraseñas</Card.Text>
                <Button variant="info" className={styles.actionBtn}>
                  Gestionar Contraseñas
                </Button>
              </Card.Body>
            </Card>
          </Col>
        )}

        <Col lg={6} md={12}>
          <Card className={`${styles.actionCard} h-100`}>
            <Card.Body>
              <Card.Title className={styles.cardTitle}>👤 Mi Perfil</Card.Title>
              <Card.Text>Ver y editar información de tu perfil</Card.Text>
              <Button
                variant="secondary"
                className={styles.actionBtn}
                onClick={() => router.push('/dashboard/profile')}
              >
                Ver Perfil
              </Button>
            </Card.Body>
          </Card>
        </Col>

        {(user.role === 'superuser' || user.role === 'administrador') && (
          <Col lg={6} md={12}>
            <Card className={`${styles.actionCard} h-100`}>
              <Card.Body>
                <Card.Title className={styles.cardTitle}>👥 Gestionar Usuarios</Card.Title>
                <Card.Text>Ver y administrar todos los usuarios del sistema</Card.Text>
                <Button
                  variant="secondary"
                  className={styles.actionBtn}
                  onClick={() => router.push('/dashboard/users')}
                >
                  Ver Usuarios
                </Button>
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>

      <Modal show={showCreateUser} onHide={() => setShowCreateUser(false)} centered className={styles.modal}>
        <Modal.Header closeButton>
          <Modal.Title>Crear Nuevo Usuario</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleCreateUser}>
            <Form.Group className="mb-3">
              <Form.Label>Nombre</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Nombre completo"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="email@ejemplo.com"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Contraseña</Form.Label>
              <Form.Control
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Mínimo 8 caracteres"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Rol</Form.Label>
              <Form.Select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
              >
                {user.role === 'superuser' ? (
                  <>
                    <option value="cliente">Cliente</option>
                    <option value="vendedor">Vendedor</option>
                    <option value="administrador">Administrador</option>
                    <option value="superuser">Super Usuario</option>
                  </>
                ) : (
                  <>
                    <option value="cliente">Cliente</option>
                    <option value="vendedor">Vendedor</option>
                  </>
                )}
              </Form.Select>
            </Form.Group>
            <div className="d-flex gap-2">
              <Button variant="success" type="submit" className="flex-grow-1" disabled={isLoading}>
                {isLoading ? 'Creando...' : 'Crear Usuario'}
              </Button>
              <Button variant="secondary" onClick={() => setShowCreateUser(false)}>
                Cancelar
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardPageContent />
    </ProtectedRoute>
  );
}
