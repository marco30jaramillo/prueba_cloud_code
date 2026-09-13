'use client';

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Modal, Spinner } from 'react-bootstrap';
import { PhotoUpload } from '@/components/PhotoUpload';
import { useAuthStore, saveAuthToStorage } from '@/lib/auth-store';
import { authAPI } from '@/lib/api';
import styles from './page.module.scss';

export default function ProfilePage() {
  const { user, token, setAuth } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const getPhotoUrl = (photo: string | undefined) => {
    if (!photo) return `${process.env.NEXT_PUBLIC_API_URL}/datos/default/default-avatar.svg`;
    if (photo.startsWith('http')) return photo;

    // Manejar rutas con /datos (viejas) y sin /datos (nuevas)
    let photoPath = photo;
    if (!photo.startsWith('/datos') && !photo.startsWith('/uploads')) {
      photoPath = `/datos/${photo}`;
    }

    return `${process.env.NEXT_PUBLIC_API_URL}${photoPath}`;
  };

  const [formData, setFormData] = useState({
    name: user?.name || '',
    photo: user?.photo || '/datos/default/default-avatar.svg'
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    showCurrent: false,
    showNew: false,
    showConfirm: false
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        photo: user.photo || '/datos/default/default-avatar.svg'
      });
    }
  }, [user]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: 'El nombre no puede estar vacío' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await authAPI.updateProfile(formData.name, formData.photo);

      // Actualizar el store y localStorage con los datos retornados
      if (response.user && token) {
        setAuth(response.user, token);
        saveAuthToStorage(response.user, token);
      }

      setMessage({ type: 'success', text: '✅ Perfil actualizado exitosamente' });
      setIsEditing(false);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Error al actualizar perfil';
      setMessage({ type: 'error', text: `⚠️ ${errorMsg}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Todos los campos son requeridos' });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'La nueva contraseña debe tener al menos 8 caracteres' });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas no coinciden' });
      return;
    }

    setIsLoading(true);
    try {
      await authAPI.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword,
        passwordData.confirmPassword
      );
      setMessage({ type: 'success', text: '✅ Contraseña cambiada exitosamente' });
      setIsChangingPassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        showCurrent: false,
        showNew: false,
        showConfirm: false
      });
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Error al cambiar contraseña';
      setMessage({ type: 'error', text: `⚠️ ${errorMsg}` });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <Container className={styles.container}>
        <Spinner animation="border" />
      </Container>
    );
  }

  return (
    <Container className={styles.container}>
      <Row className="justify-content-center">
        <Col lg={6} md={8}>
          <div className={styles.header}>
            <h1 className={styles.title}>👤 Mi Perfil</h1>
            <p className={styles.subtitle}>Gestiona tu información personal</p>
          </div>

          {message && (
            <Alert
              variant={message.type === 'success' ? 'success' : 'danger'}
              onClose={() => setMessage(null)}
              dismissible
              className="mb-4"
            >
              {message.text}
            </Alert>
          )}

          <Card className={styles.card}>
            <Card.Body>
              <div className={styles.photoSection}>
                {isEditing ? (
                  <PhotoUpload
                    currentPhoto={getPhotoUrl(formData.photo)}
                    onPhotoChange={(photoUrl) =>
                      setFormData(prev => ({ ...prev, photo: photoUrl }))
                    }
                    disabled={isLoading}
                  />
                ) : (
                  <img
                    src={getPhotoUrl(formData.photo)}
                    alt="Foto de perfil"
                    className={styles.profilePhoto}
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      if (!img.dataset.fallbackAttempted) {
                        img.dataset.fallbackAttempted = 'true';
                        img.src = `${process.env.NEXT_PUBLIC_API_URL}/datos/default/default-avatar.svg`;
                      }
                    }}
                  />
                )}
              </div>

              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Nombre</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleProfileChange}
                    disabled={!isEditing || isLoading}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={user.email}
                    disabled
                    className={styles.disabled}
                  />
                  <small className="text-muted">El email no puede ser modificado</small>
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>Rol</Form.Label>
                  <Form.Control
                    type="text"
                    value={user.role}
                    disabled
                    className={styles.disabled}
                  />
                </Form.Group>

                {isEditing ? (
                  <div className={styles.buttonGroup}>
                    <Button
                      variant="success"
                      onClick={handleSaveProfile}
                      disabled={isLoading}
                      className="me-2"
                    >
                      {isLoading ? '💾 Guardando...' : '💾 Guardar Cambios'}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setIsEditing(false);
                        setFormData({
                          name: user.name,
                          photo: user.photo || 'https://via.placeholder.com/40?text=👤'
                        });
                      }}
                      disabled={isLoading}
                    >
                      ❌ Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    onClick={() => setIsEditing(true)}
                    className="w-100"
                  >
                    ✏️ Editar Perfil
                  </Button>
                )}
              </Form>
            </Card.Body>
          </Card>

          <Card className={`${styles.card} mt-4`}>
            <Card.Body>
              <h5 className="mb-3">🔐 Seguridad</h5>
              <Button
                variant="warning"
                onClick={() => setIsChangingPassword(true)}
                className="w-100"
              >
                🔑 Cambiar Contraseña
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Modal show={isChangingPassword} onHide={() => setIsChangingPassword(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>🔑 Cambiar Contraseña</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Contraseña Actual</Form.Label>
            <div className="input-group">
              <Form.Control
                type={passwordData.showCurrent ? 'text' : 'password'}
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                placeholder="Ingresa tu contraseña actual"
                disabled={isLoading}
              />
              <Button
                variant="outline-secondary"
                onClick={() =>
                  setPasswordData(prev => ({
                    ...prev,
                    showCurrent: !prev.showCurrent
                  }))
                }
                disabled={isLoading}
              >
                {passwordData.showCurrent ? '👁️' : '👁️‍🗨️'}
              </Button>
            </div>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Nueva Contraseña</Form.Label>
            <div className="input-group">
              <Form.Control
                type={passwordData.showNew ? 'text' : 'password'}
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                placeholder="Mínimo 8 caracteres"
                disabled={isLoading}
              />
              <Button
                variant="outline-secondary"
                onClick={() =>
                  setPasswordData(prev => ({
                    ...prev,
                    showNew: !prev.showNew
                  }))
                }
                disabled={isLoading}
              >
                {passwordData.showNew ? '👁️' : '👁️‍🗨️'}
              </Button>
            </div>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Confirmar Contraseña</Form.Label>
            <div className="input-group">
              <Form.Control
                type={passwordData.showConfirm ? 'text' : 'password'}
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                placeholder="Repite la contraseña"
                disabled={isLoading}
              />
              <Button
                variant="outline-secondary"
                onClick={() =>
                  setPasswordData(prev => ({
                    ...prev,
                    showConfirm: !prev.showConfirm
                  }))
                }
                disabled={isLoading}
              >
                {passwordData.showConfirm ? '👁️' : '👁️‍🗨️'}
              </Button>
            </div>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setIsChangingPassword(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="warning"
            onClick={handleChangePassword}
            disabled={isLoading}
          >
            {isLoading ? '⏳ Cambiando...' : '🔐 Cambiar Contraseña'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
