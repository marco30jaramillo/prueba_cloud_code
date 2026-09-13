'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Row, Col, Card, Button, Alert, Spinner } from 'react-bootstrap';
import { useAuthStore } from '@/lib/auth-store';
import { modulesAPI } from '@/lib/api';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import styles from './page.module.scss';

interface DashboardModule {
  id: string;
  name: string;
  description: string;
  buttonLabel: string;
  href: string;
  icon: string;
}

const ROLE_COLORS: Record<string, string> = {
  superuser:     '#f59e0b',
  administrador: '#3b82f6',
  vendedor:      '#10b981',
  cliente:       '#8b5cf6',
};

function DashboardPageContent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [modules, setModules] = useState<DashboardModule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await modulesAPI.getAll();
        setModules(res.modules || []);
      } catch {
        setError('No se pudieron cargar los módulos del panel.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  if (!user) return <Spinner animation="border" />;

  return (
    <Container className={styles.dashboard}>
      <Row className="mb-5">
        <Col lg={12}>
          <Card className={styles.profileCard}>
            <Card.Body className={styles.profileBody}>
              <div className={styles.profileInfo}>
                <h2 className={styles.userName}>Bienvenido, {user.name}</h2>
                <p className={styles.userEmail}>{user.email}</p>
                <span
                  className={styles.roleBadge}
                  style={{ backgroundColor: ROLE_COLORS[user.role] ?? '#6b7280' }}
                >
                  {user.role}
                </span>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible className="mb-4">
          {error}
        </Alert>
      )}

      {isLoading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : (
        <Row className="g-4">
          {modules.map(mod => (
            <Col key={mod.id} lg={6} md={12}>
              <Card className={`${styles.actionCard} h-100`}>
                <Card.Body>
                  <Card.Title className={styles.cardTitle}>
                    {mod.icon} {mod.name}
                  </Card.Title>
                  <Card.Text>{mod.description}</Card.Text>
                  <Button
                    variant="secondary"
                    className={styles.actionBtn}
                    onClick={() => router.push(mod.href)}
                  >
                    {mod.buttonLabel}
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
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
