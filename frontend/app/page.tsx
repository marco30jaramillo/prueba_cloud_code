'use client';

import React from 'react';
import Link from 'next/link';
import { Container, Row, Col, Button, Card } from 'react-bootstrap';
import styles from './page.module.scss';

export default function Home() {
  const features = [
    {
      icon: '📝',
      title: 'Registra Vales al Instante',
      description: 'Anota cada fiado en segundos desde el celular o computador, sin necesidad de cuaderno ni lápiz.'
    },
    {
      icon: '💰',
      title: 'Cobros y Abonos',
      description: 'Lleva el historial completo de pagos por cliente. Sabe exactamente cuánto ha abonado y cuánto debe.'
    },
    {
      icon: '⚠️',
      title: 'Alertas de Mora',
      description: 'Recibe notificaciones cuando un vale lleva mucho tiempo sin abonar para que puedas actuar a tiempo.'
    },
    {
      icon: '📱',
      title: 'Tus Clientes Ven su Saldo',
      description: 'Cada cliente puede consultar su deuda desde el celular. Adiós a las discusiones por diferencias en las cuentas.'
    },
    {
      icon: '📊',
      title: 'Reportes de Cartera',
      description: 'Visualiza cuánto te deben en total, quién debe más y cuáles vales están próximos a vencer.'
    },
    {
      icon: '☁️',
      title: 'En la Nube, Siempre Seguro',
      description: 'Tu información está guardada en la nube. Si pierdes el celular o cambias de teléfono, no pierdes nada.'
    }
  ];

  return (
    <div className={styles.home}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <Container>
          <Row className="align-items-center">
            <Col lg={6} className={styles.heroContent}>
              <p className={styles.eyebrow}>Para tiendas de barrio en Cartagena</p>
              <h1 className={styles.title}>
                Di adiós al cuaderno. Bienvenido al vale digital.
              </h1>
              <p className={styles.subtitle}>
                Gestiona los fiados de tu tienda de forma rápida, segura y desde cualquier dispositivo. Tus clientes saben lo que deben y tú sabes lo que te deben.
              </p>
              <div className={styles.ctaButtons}>
                <Link href="/register">
                  <Button variant="success" size="lg" className={styles.btnPrimary}>
                    Registra tu Tienda
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline-success" size="lg" className={styles.btnSecondary}>
                    Iniciar Sesión
                  </Button>
                </Link>
              </div>
            </Col>
            <Col lg={6} className={styles.heroIllustration}>
              <div className={styles.illustrationBlock}>
                <div className={styles.illustrationCard}>
                  <p className={styles.illustrationLabel}>Vale pendiente</p>
                  <p className={styles.illustrationName}>María García</p>
                  <p className={styles.illustrationAmount}>$45.000</p>
                  <p className={styles.illustrationDate}>hace 12 días</p>
                </div>
                <div className={`${styles.illustrationCard} ${styles.illustrationCardPaid}`}>
                  <p className={styles.illustrationLabel}>Abono recibido</p>
                  <p className={styles.illustrationName}>Carlos Pérez</p>
                  <p className={styles.illustrationAmount}>$20.000 ✓</p>
                  <p className={styles.illustrationDate}>hoy</p>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Problem Section */}
      <section className={styles.problem}>
        <Container>
          <Row className="align-items-center g-4">
            <Col lg={5} className="text-center">
              <div className={styles.notebookIcon}>📒</div>
            </Col>
            <Col lg={7}>
              <p className={styles.problemEyebrow}>El problema de hoy</p>
              <h2 className={styles.problemTitle}>El cuaderno se pierde. Los números no cuadran.</h2>
              <p className={styles.problemText}>
                Muchas tiendas de barrio llevan los fiados en un cuaderno. El cliente tiene su cartoncito, el tendero tiene el cuaderno, y cuando llega el momento de cobrar… los números son diferentes.
              </p>
              <p className={styles.problemText}>
                Si se moja el cuaderno, si se pierde, si el cliente dice "yo ya pagué eso", no hay forma de comprobarlo. <strong>Mi Valecito cambia eso.</strong>
              </p>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Features Section */}
      <section className={styles.features}>
        <Container>
          <Row className="mb-5">
            <Col lg={12} className="text-center">
              <h2 className={styles.sectionTitle}>Todo lo que necesitas para tu cartera</h2>
              <p className={styles.sectionSubtitle}>
                Diseñado para tenderos que quieren llevar sus cuentas claras sin complicaciones
              </p>
            </Col>
          </Row>
          <Row className="g-4">
            {features.map((feature, idx) => (
              <Col lg={4} md={6} key={idx}>
                <Card className={`${styles.featureCard} h-100 border-0 shadow-sm`}>
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

      {/* Users Section */}
      <section className={styles.roles}>
        <Container>
          <Row className="mb-5">
            <Col lg={12} className="text-center">
              <h2 className={styles.sectionTitle}>¿Para quién es Mi Valecito?</h2>
              <p className={styles.sectionSubtitle}>Un perfil para cada persona en tu tienda</p>
            </Col>
          </Row>
          <Row className="g-4 justify-content-center">
            <Col lg={4} md={6}>
              <Card className={`${styles.roleCard} ${styles.admin} h-100`}>
                <Card.Body>
                  <div className={styles.roleIcon}>🏪</div>
                  <h5>Tendero (Administrador)</h5>
                  <p>Gestiona todos los vales, ve la cartera completa, administra a tus empleados y genera reportes de cobro.</p>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={4} md={6}>
              <Card className={`${styles.roleCard} ${styles.vendor} h-100`}>
                <Card.Body>
                  <div className={styles.roleIcon}>🛒</div>
                  <h5>Vendedor</h5>
                  <p>Registra vales y abonos en el día a día sin acceder a configuraciones del negocio. Ideal para empleados de confianza.</p>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={4} md={6}>
              <Card className={`${styles.roleCard} ${styles.client} h-100`}>
                <Card.Body>
                  <div className={styles.roleIcon}>👤</div>
                  <h5>Cliente</h5>
                  <p>Consulta tu saldo pendiente e historial de vales desde el celular. Transparencia total entre tienda y cliente.</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {/* CTA Section */}
      <section className={styles.cta}>
        <Container className="text-center">
          <h2 className={styles.ctaTitle}>Tu tienda merece cuentas claras</h2>
          <p className={styles.ctaSubtitle}>Empieza gratis hoy. Sin papeles, sin cuadernos, sin discusiones.</p>
          <Link href="/register">
            <Button variant="light" size="lg" className={styles.ctaBtn}>
              Registra tu Tienda Ahora
            </Button>
          </Link>
        </Container>
      </section>
    </div>
  );
}
