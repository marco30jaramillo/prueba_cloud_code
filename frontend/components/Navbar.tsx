'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Navbar as BSNavbar, Nav, Container, Dropdown } from 'react-bootstrap';
import { useAuthStore } from '@/lib/auth-store';
import { useAuth } from '@/hooks/useAuth';
import { modulesAPI } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { getImageUrl } from '@/lib/image-url';
import styles from './Navbar.module.scss';

import { Icon } from './Icon';
import { Logo } from './Logo';
import { iconoDeModulo } from '@/lib/icono-modulo';
interface NavModule {
  id: string;
  name: string;
  href: string;
  icon: string;
  showInNav: boolean;
}

export const Navbar: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();
  const mustChangePassword = !!user?.mustChangePassword;
  const { handleLogout, handleLogoutAll } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [navModules, setNavModules] = useState<NavModule[]>([]);

  useEffect(() => {
    const checkMobile = () => setIsNarrow(window.innerWidth < 1400);
    checkMobile();

    const handleScroll = () => {
      const isScrolled = window.scrollY > 60;
      setScrolled(isScrolled);
      if (!isScrolled) setSidebarExpanded(false);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Fetch accessible modules when auth state changes
  useEffect(() => {
    // Con el cambio de contraseña pendiente el servidor solo permite ese cambio: no se piden módulos.
    if (!isAuthenticated || mustChangePassword) { setNavModules([]); return; }
    modulesAPI.getAll()
      .then(res => setNavModules((res.modules || []).filter((m: NavModule) => m.showInNav)))
      .catch(() => {});
  }, [isAuthenticated, mustChangePassword]);

  const useSidebar = isNarrow && scrolled;

  // Add left padding to main content when sidebar is showing
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const main = document.querySelector('main') as HTMLElement | null;
    if (!main) return;
    main.style.transition = 'padding-left 0.35s cubic-bezier(0.4,0,0.2,1)';
    main.style.paddingLeft = useSidebar ? '64px' : '';
    return () => {
      main.style.paddingLeft = '';
    };
  }, [useSidebar]);

  const handleLogoutClick = async () => {
    setIsLoggingOut(true);
    try {
      await handleLogout();
      router.push('/');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleLogoutAllClick = async () => {
    if (!confirm('Esto cerrará tu sesión en TODOS tus dispositivos. ¿Continuar?')) return;
    setIsLoggingOut(true);
    try {
      await handleLogoutAll();
      router.push('/');
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Sidebar nav items: authenticated → modules from API; guest → fixed login/register
  const navItems = isAuthenticated
    ? navModules.map(m => ({ href: m.href, icon: m.icon, label: m.name }))
    : [
        { href: '/login',    icon: 'candado', label: 'Iniciar Sesión' },
        { href: '/register', icon: 'nota', label: 'Registrarse'    },
      ];

  return (
    <>
      {/* ── Top Navbar ── */}
      <BSNavbar
        bg="light"
        expand="xxl"
        className={`${styles.navbar} ${useSidebar ? styles.navbarHidden : ''} shadow-sm`}
      >
        <Container fluid className="px-4">
          <BSNavbar.Brand as={Link} href="/" className={styles.brand}>
            <Logo variante="horizontal" alto={28} />
          </BSNavbar.Brand>

          <BSNavbar.Toggle aria-controls="basic-navbar-nav" />
          <BSNavbar.Collapse id="basic-navbar-nav">
            {isAuthenticated && <div className={styles.navSpacer} />}
            <Nav className={isAuthenticated ? styles.navCenter : 'ms-auto'}>
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
                    <Icon name="panel" /> Panel
                  </Nav.Link>
                  {navModules.filter(mod => mod.href !== '/dashboard/profile').map(mod => (
                    <Nav.Link key={mod.id} as={Link} href={mod.href} className={styles.navLink}>
                      <Icon name={iconoDeModulo(mod.icon, mod.href)} /> {mod.name}
                    </Nav.Link>
                  ))}
                </>
              )}
            </Nav>
            {isAuthenticated && (
              <Nav className={styles.navUser}>
                  <Dropdown className={styles.userDropdown} align="end">
                    <Dropdown.Toggle as="button" id="user-dropdown" className={styles.userInfo} disabled={isLoggingOut}>
                      <img
                        src={getImageUrl(user?.photo)}
                        alt=""
                        className={styles.userPhoto}
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          if (!img.dataset.fallbackAttempted) {
                            img.dataset.fallbackAttempted = 'true';
                            img.src = getImageUrl(undefined);
                          }
                        }}
                      />
                      <span>{user?.name} ({user?.role})</span>
                    </Dropdown.Toggle>
                    <Dropdown.Menu popperConfig={{ strategy: 'fixed' }}>
                      <Dropdown.Item as={Link} href="/dashboard/profile">
                        <Icon name="cliente" /> Mi perfil
                      </Dropdown.Item>
                      <Dropdown.Divider />
                      <Dropdown.Item onClick={handleLogoutClick} disabled={isLoggingOut}>
                        <Icon name="cerrar-sesion" /> Cerrar sesión en este dispositivo
                      </Dropdown.Item>
                      <Dropdown.Item
                        onClick={handleLogoutAllClick}
                        disabled={isLoggingOut}
                        className={styles.logoutAllItem}
                      >
                        <Icon name="cerrar-sesion-todos" /> Cerrar sesión en todos tus dispositivos
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
              </Nav>
            )}
          </BSNavbar.Collapse>
        </Container>
      </BSNavbar>

      {/* ── Mobile Sidebar (appears on scroll) ── */}
      {useSidebar && (
        <>
          {sidebarExpanded && (
            <div
              className={styles.sidebarOverlay}
              onClick={() => setSidebarExpanded(false)}
            />
          )}

          {/* Toggle button — outside sidebar so overflow:hidden no lo recorta */}
          <button
            className={styles.sidebarToggle}
            style={{ left: sidebarExpanded ? '204px' : '44px' }}
            onClick={() => setSidebarExpanded(v => !v)}
            aria-label={sidebarExpanded ? 'Colapsar menú' : 'Expandir menú'}
          >
            <Icon name={sidebarExpanded ? 'cerrar' : 'siguiente'} />
          </button>

          <nav className={`${styles.sidebar} ${sidebarExpanded ? styles.sidebarExpanded : ''}`}>
            {/* Brand */}
            <Link href="/" className={styles.sidebarBrand} onClick={() => setSidebarExpanded(false)}>
              <span className={styles.sidebarIcon}><Logo variante="isotipo" alto={24} decorativo /></span>
              <span className={styles.sidebarLabel}>Mi Valecito</span>
            </Link>

            {/* Nav items */}
            <div className={styles.sidebarItems}>
              {navItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.sidebarItem} ${pathname === item.href ? styles.sidebarItemActive : ''}`}
                  onClick={() => setSidebarExpanded(false)}
                >
                  <span className={styles.sidebarIcon}><Icon name={iconoDeModulo(item.icon, item.href)} /></span>
                  <span className={styles.sidebarLabel}>{item.label}</span>
                </Link>
              ))}
            </div>

            {/* User info + logout */}
            {isAuthenticated && (
              <div className={styles.sidebarBottom}>
                <div className={styles.sidebarUser}>
                  <img
                    src={getImageUrl(user?.photo)}
                    alt={user?.name}
                    className={styles.sidebarPhoto}
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      if (!img.dataset.fallbackAttempted) {
                        img.dataset.fallbackAttempted = 'true';
                        img.src = getImageUrl(undefined);
                      }
                    }}
                  />
                  <div className={styles.sidebarUserText}>
                    <span className={styles.sidebarUserName}>{user?.name}</span>
                    <span className={styles.sidebarUserRole}>{user?.role}</span>
                  </div>
                </div>
                <button
                  className={styles.sidebarLogoutBtn}
                  onClick={handleLogoutClick}
                  disabled={isLoggingOut}
                >
                  <span className={styles.sidebarIcon}><Icon name="cerrar-sesion" /></span>
                  <span className={styles.sidebarLabel}>Salir</span>
                </button>
              </div>
            )}
          </nav>
        </>
      )}
    </>
  );
};
