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

import { Icon, type NombreIcono } from './Icon';
import { Logo } from './Logo';
import { ICONOS } from '@/lib/marca-datos';
interface NavModule {
  id: string;
  name: string;
  href: string;
  icon: string;
  showInNav: boolean;
}

const ICONO_POR_RUTA: Record<string, NombreIcono> = {
  '/dashboard': 'grafica',
  '/dashboard/cartera': 'cartera',
  '/dashboard/mis-vales': 'vale',
  '/dashboard/vale-nuevo': 'agregar',
  '/dashboard/tienda': 'tienda',
  '/dashboard/users': 'equipo',
  '/dashboard/roles': 'escudo',
  '/dashboard/audit': 'nota',
  '/dashboard/profile': 'cliente',
};

/** El módulo trae su icono del servidor: si no es un nombre del set de marca, se usa uno por ruta. */
function iconoDeModulo(icono: string, href: string): NombreIcono {
  if (icono in ICONOS) return icono as NombreIcono;
  return ICONO_POR_RUTA[href] ?? 'informacion';
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
    const checkMobile = () => setIsNarrow(window.innerWidth < 1024);
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
        expand="lg"
        className={`${styles.navbar} ${useSidebar ? styles.navbarHidden : ''} shadow-sm`}
      >
        <Container>
          <BSNavbar.Brand as={Link} href="/" className={styles.brand}>
            <Logo variante="horizontal" alto={28} />
          </BSNavbar.Brand>

          {isAuthenticated && (
            <Link href="/dashboard" className={styles.panelBtn} title="Panel principal">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <rect x="0"  y="0"  width="5" height="5" rx="1" fill="currentColor"/>
                <rect x="6.5" y="0"  width="5" height="5" rx="1" fill="currentColor"/>
                <rect x="13" y="0"  width="5" height="5" rx="1" fill="currentColor"/>
                <rect x="0"  y="6.5" width="5" height="5" rx="1" fill="currentColor"/>
                <rect x="6.5" y="6.5" width="5" height="5" rx="1" fill="currentColor"/>
                <rect x="13" y="6.5" width="5" height="5" rx="1" fill="currentColor"/>
                <rect x="0"  y="13" width="5" height="5" rx="1" fill="currentColor"/>
                <rect x="6.5" y="13" width="5" height="5" rx="1" fill="currentColor"/>
                <rect x="13" y="13" width="5" height="5" rx="1" fill="currentColor"/>
              </svg>
              <span className={styles.panelBtnLabel}>Panel</span>
            </Link>
          )}

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
                  {navModules.map(mod => (
                    <Nav.Link key={mod.id} as={Link} href={mod.href} className={styles.navLink}>
                      <Icon name={iconoDeModulo(mod.icon, mod.href)} /> {mod.name}
                    </Nav.Link>
                  ))}
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
                    <span>{user?.name} ({user?.role})</span>
                  </div>
                  <Dropdown className={styles.logoutDropdown}>
                    <Dropdown.Toggle
                      variant="outline-danger"
                      size="sm"
                      id="logout-dropdown"
                      disabled={isLoggingOut}
                    >
                      Cerrar sesión
                    </Dropdown.Toggle>
                    <Dropdown.Menu align="end">
                      <Dropdown.Item onClick={handleLogoutClick} disabled={isLoggingOut}>
                        <Icon name="cerrar-sesion" /> Cerrar sesión en este dispositivo
                      </Dropdown.Item>
                      <Dropdown.Divider />
                      <Dropdown.Item
                        onClick={handleLogoutAllClick}
                        disabled={isLoggingOut}
                        className={styles.logoutAllItem}
                      >
                        <Icon name="cerrar-sesion-todos" /> Cerrar sesión en todos tus dispositivos
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </>
              )}
            </Nav>
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
