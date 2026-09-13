'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar as BSNavbar, Nav, Container, Button, Dropdown } from 'react-bootstrap';
import { useAuthStore } from '@/lib/auth-store';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { getImageUrl } from '@/lib/image-url';
import styles from './Navbar.module.scss';

export const Navbar: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();
  const { handleLogout, handleLogoutAll } = useAuth();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoggingOut(false);
    }
  }, [isAuthenticated]);

  const handleLogoutClick = async () => {
    setIsLoggingOut(true);
    try {
      await handleLogout();
      router.push('/');
    } catch (error) {
      console.error('Error during logout:', error);
      setIsLoggingOut(false);
    }
  };

  const handleLogoutAllClick = async () => {
    setIsLoggingOut(true);
    if (confirm('⚠️ Esto cerrará tu sesión en TODOS tus dispositivos. ¿Continuar?')) {
      try {
        await handleLogoutAll();
        router.push('/');
      } catch (error) {
        console.error('Error during logout-all:', error);
        setIsLoggingOut(false);
      }
    } else {
      setIsLoggingOut(false);
    }
  };

  return (
    <BSNavbar bg="light" expand="lg" className={`${styles.navbar} shadow-sm`}>
      <Container>
        <BSNavbar.Brand as={Link} href="/" className={styles.brand}>
          <span className={styles.logo}>🔐</span>
          Auth System
        </BSNavbar.Brand>
        <BSNavbar.Toggle aria-controls="basic-navbar-nav" />
        <BSNavbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto">
            {!isAuthenticated ? (
              <>
                <Nav.Link as={Link} href="/login" className={styles.navLink}>
                  Iniciar Sesión
                </Nav.Link>
                <Nav.Link as={Link} href="/register" className={styles.navLink}>
                  Registrarse
                </Nav.Link>
              </>
            ) : (
              <>
                <Nav.Link as={Link} href="/dashboard" className={styles.navLink}>
                  Panel
                </Nav.Link>
                <Nav.Link as={Link} href="/dashboard/profile" className={styles.navLink}>
                  👤 Perfil
                </Nav.Link>
                {(user?.role === 'superuser' || user?.role === 'administrador') && (
                  <Nav.Link as={Link} href="/dashboard/users" className={styles.navLink}>
                    👥 Usuarios
                  </Nav.Link>
                )}
                {user?.role === 'superuser' && (
                  <Nav.Link as={Link} href="/dashboard/audit" className={styles.navLink}>
                    📋 Auditoría
                  </Nav.Link>
                )}
                <div className={styles.userInfo}>
                  <img
                    src={getImageUrl(user?.photo)}
                    alt={user?.name}
                    className={styles.userPhoto}
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      if (!img.dataset.fallbackAttempted) {
                        img.dataset.fallbackAttempted = 'true';
                        img.src = getImageUrl(undefined);
                      }
                    }}
                  />
                  <span>
                    {user?.name} ({user?.role})
                  </span>
                </div>
                <Dropdown className={styles.logoutDropdown}>
                  <Dropdown.Toggle
                    variant="outline-danger"
                    size="sm"
                    id="logout-dropdown"
                    disabled={isLoggingOut}
                  >
                    Logout
                  </Dropdown.Toggle>

                  <Dropdown.Menu align="end">
                    <Dropdown.Item
                      onClick={handleLogoutClick}
                      disabled={isLoggingOut}
                    >
                      🚪 Logout en este dispositivo
                    </Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item
                      onClick={handleLogoutAllClick}
                      disabled={isLoggingOut}
                      className={styles.logoutAllItem}
                    >
                      🌍 Logout en todos los dispositivos
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </>
            )}
          </Nav>
        </BSNavbar.Collapse>
      </Container>
    </BSNavbar>
  );
};
