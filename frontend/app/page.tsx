'use client';

import React from 'react';
import Link from 'next/link';
import { Container, Row, Col, Button, Card } from 'react-bootstrap';
import styles from './page.module.scss';

export default function Home() {
  const features = [
    {
      icon: '🔐',
      title: 'Autenticación Segura',
      description: 'Sistema de autenticación con JWT y tokens con expiración'
    },
    {
      icon: '👥',
      title: 'Gestión de Roles',
      description: 'Cuatro roles diferentes con permisos específicos'
    },
    {
      icon: '🔄',
      title: 'Recuperación de Contraseña',
      description: 'Sistema seguro de recuperación con tokens únicos'
    },
    {
      icon: '📱',
      title: 'Responsive Design',
      description: 'Funciona perfectamente en móvil, tablet y desktop'
    },
    {
      icon: '✨',
      title: 'Interfaz Moderna',
      description: 'Diseño limpio con animaciones y transiciones suaves'
    },
    {
      icon: '⚡',
      title: 'Alto Rendimiento',
      description: 'Basado en React, Next.js y arquitectura escalable'
    }
  ];

  return (
    <div className={styles.home}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <Container>
          <Row className="align-items-center min-vh-50">
            <Col lg={6} className={styles.heroContent}>
              <h1 className={styles.title}>
                Bienvenido al Sistema de Autenticación
              </h1>
              <p className={styles.subtitle}>
                Una plataforma segura y moderna para gestionar usuarios, roles y permisos
              </p>
              <div className={styles.ctaButtons}>
                <Link href="/login">
                  <Button variant="success" size="lg" className={styles.btnPrimary}>
                    Iniciar Sesión
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="outline-info" size="lg" className={styles.btnSecondary}>
                    Crear Cuenta
                  </Button>
                </Link>
              </div>
            </Col>
            <Col lg={6} className={styles.heroIllustration}>
              <div className={styles.illustration}>🔐✨</div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Features Section */}
      <section className={styles.features}>
        <Container>
          <Row className="mb-5">
            <Col lg={12} className="text-center">
              <h2 className={styles.sectionTitle}>Características Principales</h2>
              <p className={styles.sectionSubtitle}>
                Todo lo que necesitas para una gestión de usuarios profesional
              </p>
            </Col>
          </Row>
          <Row className="g-4">
            {features.map((feature, idx) => (
              <Col lg={4} md={6} key={idx}>
                <Card className={`${styles.featureCard} h-100 border-0 shadow-sm fade-in`}>
                  <Card.Body className={styles.featureBody}>
                    <div className={styles.featureIcon}>{feature.icon}</div>
                    <h5 className={styles.featureTitle}>{feature.title}</h5>
                    <p className={styles.featureDescription}>{feature.description}</p>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* Roles Section */}
      <section className={styles.roles}>
        <Container>
          <Row className="mb-5">
            <Col lg={12} className="text-center">
              <h2 className={styles.sectionTitle}>Roles Disponibles</h2>
            </Col>
          </Row>
          <Row className="g-4">
            <Col lg={3} md={6}>
              <Card className={`${styles.roleCard} ${styles.superuser} h-100`}>
                <Card.Body>
                  <h5>Super Usuario</h5>
                  <p>Acceso integral a todas las funciones del sistema</p>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={3} md={6}>
              <Card className={`${styles.roleCard} ${styles.admin} h-100`}>
                <Card.Body>
                  <h5>Administrador</h5>
                  <p>Gestión de usuarios y acceso a funciones administrativas</p>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={3} md={6}>
              <Card className={`${styles.roleCard} ${styles.vendor} h-100`}>
                <Card.Body>
                  <h5>Vendedor</h5>
                  <p>Permisos limitados para operaciones de venta</p>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={3} md={6}>
              <Card className={`${styles.roleCard} ${styles.client} h-100`}>
                <Card.Body>
                  <h5>Cliente</h5>
                  <p>Acceso básico a características de perfil</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {/* CTA Section */}
      <section className={styles.cta}>
        <Container className="text-center">
          <h2 className={styles.ctaTitle}>¿Listo para comenzar?</h2>
          <p className={styles.ctaSubtitle}>Crea tu cuenta ahora y accede a todas las funciones</p>
          <Link href="/register">
            <Button variant="success" size="lg" className={styles.ctaBtn}>
              Registrarse Ahora
            </Button>
          </Link>
        </Container>
      </section>
    </div>
  );
}
