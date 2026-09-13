'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar as BSNavbar, Nav, Container, Button } from 'react-bootstrap';
import { useAuthStore } from '@/lib/auth-store';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import styles from './Navbar.module.scss';

export const Navbar: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();
  const { handleLogout } = useAuth();
  const router = useRouter();

  const handleLogoutClick = async () => {
    await handleLogout();
    router.push('/');
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
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={handleLogoutClick}
                  className={styles.logoutBtn}
                >
                  Logout
                </Button>
              </>
            )}
          </Nav>
        </BSNavbar.Collapse>
      </Container>
    </BSNavbar>
  );
};
