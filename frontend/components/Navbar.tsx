'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar as BSNavbar, Nav, Container, Button, Dropdown } from 'react-bootstrap';
import { useAuthStore } from '@/lib/auth-store';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import styles from './Navbar.module.scss';

export const Navbar: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();
  const { handleLogout, handleLogoutAll } = useAuth();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogoutClick = async () => {
    setIsLoggingOut(true);
    await handleLogout();
    router.push('/');
  };

  const handleLogoutAllClick = async () => {
    setIsLoggingOut(true);
    if (confirm('⚠️ Esto cerrará tu sesión en TODOS tus dispositivos. ¿Continuar?')) {
      await handleLogoutAll();
      router.push('/');
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
                <span className={styles.userInfo}>
                  {user?.name} ({user?.role})
                </span>
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
