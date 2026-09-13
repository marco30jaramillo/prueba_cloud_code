'use client';

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Alert, Spinner, Modal, Form, Dropdown } from 'react-bootstrap';
import { PhotoUpload } from '@/components/PhotoUpload';
import { useAuthStore } from '@/lib/auth-store';
import { usersAPI, authAPI } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { getImageUrl } from '@/lib/image-url';
import styles from './page.module.scss';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  photo: string;
  isActive: boolean;
  createdAt: string;
}

function UsersPageContent() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({ name: '', photo: '' });

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');

  const [showCreateUser, setShowCreateUser] = useState(false);
  const [creatableRoles, setCreatableRoles] = useState<string[]>(['cliente']);
  const [createFormData, setCreateFormData] = useState({ email: '', password: '', name: '', role: 'cliente' });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadUsers();
    loadCreatableRoles();
  }, []);

  const loadCreatableRoles = async () => {
    try {
      const response = await usersAPI.getManageableRoles();
      const roles: string[] = response.roles || ['cliente'];
      setCreatableRoles(roles);
      setCreateFormData(prev => ({ ...prev, role: roles[roles.length - 1] || 'cliente' }));
    } catch {
      // fallback: keep default ['cliente']
    }
  };

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const response = await usersAPI.getAll();
      setUsers(response.users);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Error al cargar usuarios';
      setMessage({ type: 'error', text: `⚠️ ${errorMsg}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePassword = async (userId: string) => {
    setSelectedUserId(userId);
    setIsGenerating(true);
    try {
      const response = await usersAPI.generatePassword(userId);
      setGeneratedPassword(response.newPassword);
      setShowPasswordModal(true);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Error al generar contraseña';
      setMessage({ type: 'error', text: `⚠️ ${errorMsg}` });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditUser = (selectedUser: User) => {
    setEditingUser(selectedUser);
    setEditFormData({ name: selectedUser.name, photo: selectedUser.photo });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser || !editFormData.name.trim()) {
      setMessage({ type: 'error', text: 'El nombre no puede estar vacío' });
      return;
    }

    try {
      await usersAPI.update(editingUser.id, editFormData);
      setMessage({ type: 'success', text: '✅ Usuario actualizado exitosamente' });
      setShowEditModal(false);
      loadUsers();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Error al actualizar usuario';
      setMessage({ type: 'error', text: `⚠️ ${errorMsg}` });
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await usersAPI.toggleStatus(userId, !currentStatus);
      setMessage({
        type: 'success',
        text: `✅ Usuario ${!currentStatus ? 'habilitado' : 'deshabilitado'} exitosamente`
      });
      loadUsers();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Error al cambiar estado';
      setMessage({ type: 'error', text: `⚠️ ${errorMsg}` });
    }
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(generatedPassword);
    setMessage({ type: 'success', text: '✅ Contraseña copiada al portapapeles' });
  };

  const handleCreateUser = async () => {
    if (!createFormData.email || !createFormData.password || !createFormData.name) {
      setMessage({ type: 'error', text: '⚠️ Completa todos los campos' });
      return;
    }

    if (createFormData.password.length < 8) {
      setMessage({ type: 'error', text: '⚠️ La contraseña debe tener al menos 8 caracteres' });
      return;
    }

    setIsCreating(true);
    try {
      await authAPI.createUser(
        createFormData.email,
        createFormData.password,
        createFormData.name,
        createFormData.role
      );
      setMessage({ type: 'success', text: `✅ Usuario ${createFormData.email} creado exitosamente` });
      setShowCreateUser(false);
      setCreateFormData({ email: '', password: '', name: '', role: 'cliente' });
      loadUsers();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Error al crear usuario';
      setMessage({ type: 'error', text: `⚠️ ${errorMsg}` });
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <Container className={styles.container}>
        <div className={styles.loadingCenter}>
          <Spinner animation="border" />
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className={styles.container}>
      <Row className="mb-4">
        <Col>
          <div className={styles.header}>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h1 className={styles.title}>👥 Gestión de Usuarios</h1>
                <p className={styles.subtitle}>
                  {user?.role === 'superuser'
                    ? 'Administra todos los usuarios del sistema'
                    : 'Administra los usuarios bajo tu gestión'}
                </p>
              </div>
              <Button
                variant="success"
                onClick={() => setShowCreateUser(true)}
                className="me-2"
              >
                ➕ Crear Usuario
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {message && (
        <Row className="mb-4">
          <Col>
            <Alert
              variant={message.type === 'success' ? 'success' : 'danger'}
              onClose={() => setMessage(null)}
              dismissible
            >
              {message.text}
            </Alert>
          </Col>
        </Row>
      )}

      <Row>
        <Col>
          <Card className={styles.card}>
            <Card.Body>
              <div className={styles.tableWrapper}>
                <Table hover responsive className={styles.table}>
                  <thead>
                    <tr>
                      <th>Foto</th>
                      <th>Nombre</th>
                      <th>Email</th>
                      <th>Rol</th>
                      <th>Estado</th>
                      <th>Creado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className={!u.isActive ? styles.inactiveRow : ''}>
                        <td>
                          <img
                            src={getImageUrl(u.photo)}
                            alt={u.name}
                            className={styles.userPhoto}
                            onError={(e) => {
                              const img = e.target as HTMLImageElement;
                              if (!img.dataset.fallbackAttempted) {
                                img.dataset.fallbackAttempted = 'true';
                                img.src = getImageUrl(undefined);
                              }
                            }}
                          />
                        </td>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td>
                          <span className={styles.badge} data-role={u.role}>
                            {u.role}
                          </span>
                        </td>
                        <td>
                          <span className={u.isActive ? styles.active : styles.inactive}>
                            {u.isActive ? '🟢 Activo' : '🔴 Inactivo'}
                          </span>
                        </td>
                        <td className={styles.date}>
                          {new Date(u.createdAt).toLocaleDateString('es-ES')}
                        </td>
                        <td>
                          <Dropdown>
                            <Dropdown.Toggle
                              variant="sm"
                              id={`dropdown-${u.id}`}
                              className={styles.actionBtn}
                            >
                              ⚙️
                            </Dropdown.Toggle>

                            <Dropdown.Menu>
                              <Dropdown.Item
                                onClick={() => handleEditUser(u)}
                                className={styles.editItem}
                              >
                                ✏️ Editar
                              </Dropdown.Item>
                              <Dropdown.Divider />
                              <Dropdown.Item
                                onClick={() => handleGeneratePassword(u.id)}
                                disabled={isGenerating}
                                className={styles.passwordItem}
                              >
                                🔑 Generar Contraseña
                              </Dropdown.Item>
                              <Dropdown.Divider />
                              <Dropdown.Item
                                onClick={() => handleToggleStatus(u.id, u.isActive)}
                                className={u.isActive ? styles.disableItem : styles.enableItem}
                              >
                                {u.isActive ? '🔴 Deshabilitar' : '🟢 Habilitar'}
                              </Dropdown.Item>
                            </Dropdown.Menu>
                          </Dropdown>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              {users.length === 0 && (
                <div className={styles.emptyState}>
                  <p>No hay usuarios registrados</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>✏️ Editar Usuario</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editingUser && (
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Nombre</Form.Label>
                <Form.Control
                  type="text"
                  value={editFormData.name}
                  onChange={(e) =>
                    setEditFormData(prev => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Nombre completo"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  value={editingUser.email}
                  disabled
                  className={styles.disabled}
                />
                <small className="text-muted">El email no puede ser modificado</small>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Foto de Perfil</Form.Label>
                <PhotoUpload
                  currentPhoto={editingUser.photo?.startsWith('http') ? editingUser.photo : `${process.env.NEXT_PUBLIC_API_URL}${editingUser.photo}`}
                  onPhotoChange={(photoUrl) =>
                    setEditFormData(prev => ({ ...prev, photo: photoUrl }))
                  }
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Rol</Form.Label>
                <Form.Control
                  type="text"
                  value={editingUser.role}
                  disabled
                  className={styles.disabled}
                />
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSaveEdit}>
            💾 Guardar
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showPasswordModal} onHide={() => { setShowPasswordModal(false); setGeneratedPassword(''); }} centered>
        <Modal.Header closeButton>
          <Modal.Title>🔑 Contraseña Generada</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info" className="mb-3">
            <p className="mb-0">
              ℹ️ Se generó una contraseña aleatoria. Comparte con el usuario de forma segura.
            </p>
          </Alert>

          <Form.Group>
            <Form.Label>Contraseña</Form.Label>
            <div className="input-group">
              <Form.Control
                type={showPassword ? 'text' : 'password'}
                value={generatedPassword}
                readOnly
                className={styles.passwordDisplay}
              />
              <Button
                variant="outline-secondary"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </Button>
            </div>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="success"
            onClick={handleCopyPassword}
            className="me-2"
          >
            📋 Copiar
          </Button>
          <Button
            variant="secondary"
            onClick={() => { setShowPasswordModal(false); setGeneratedPassword(''); }}
          >
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showCreateUser} onHide={() => setShowCreateUser(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>➕ Crear Nuevo Usuario</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Nombre</Form.Label>
              <Form.Control
                type="text"
                value={createFormData.name}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre completo"
                disabled={isCreating}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={createFormData.email}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="usuario@ejemplo.com"
                disabled={isCreating}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Contraseña</Form.Label>
              <Form.Control
                type="password"
                value={createFormData.password}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Mínimo 8 caracteres"
                disabled={isCreating}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Rol</Form.Label>
              <Form.Select
                value={createFormData.role}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, role: e.target.value }))}
                disabled={isCreating}
              >
                {creatableRoles.map(r => (
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowCreateUser(false)}
            disabled={isCreating}
          >
            Cancelar
          </Button>
          <Button
            variant="success"
            onClick={handleCreateUser}
            disabled={isCreating}
          >
            {isCreating ? '✓ Creando...' : '✓ Crear Usuario'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default function UsersPage() {
  return (
    <ProtectedRoute requiredRole={['superuser', 'administrador']}>
      <UsersPageContent />
    </ProtectedRoute>
  );
}
