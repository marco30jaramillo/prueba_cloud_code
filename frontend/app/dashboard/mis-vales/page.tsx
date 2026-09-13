'use client';

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Alert, Spinner, Modal } from 'react-bootstrap';
import { useAuthStore } from '@/lib/auth-store';
import { valesAPI } from '@/lib/api';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import styles from './page.module.scss';

interface Vale {
  id: string;
  tiendaId: string;
  tiendaNombre?: string;
  descripcion: string;
  montoTotal: number;
  saldoPendiente: number;
  estado: 'pendiente' | 'parcial' | 'pagado' | 'anulado';
  fechaVale: string;
  fechaVencimiento?: string;
  notas?: string;
}

interface Abono {
  id: string;
  monto: number;
  notas?: string;
  anulado: boolean;
  registradoPorNombre?: string;
  fechaAbono: string;
}

const ESTADO_CONFIG = {
  pendiente: { bg: 'warning', label: 'Pendiente' },
  parcial:   { bg: 'info',    label: 'Parcial' },
  pagado:    { bg: 'success', label: 'Pagado' },
  anulado:   { bg: 'secondary', label: 'Anulado' },
};

function fmt(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}

function fmtDate(s?: string) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function MisValesContent() {
  const { user } = useAuthStore();
  const [vales, setVales] = useState<Vale[]>([]);
  const [totalPendiente, setTotalPendiente] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedVale, setSelectedVale] = useState<Vale | null>(null);
  const [abonos, setAbonos] = useState<Abono[]>([]);
  const [loadingAbonos, setLoadingAbonos] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { loadVales(); }, []);

  async function loadVales() {
    try {
      setLoading(true);
      const res = await valesAPI.getMisVales();
      setVales(res.vales || []);
      setTotalPendiente(res.totalPendiente || 0);
    } catch {
      setError('No se pudieron cargar tus vales.');
    } finally {
      setLoading(false);
    }
  }

  async function openDetalle(vale: Vale) {
    setSelectedVale(vale);
    setShowModal(true);
    setLoadingAbonos(true);
    try {
      const res = await valesAPI.getAbonos(vale.id);
      setAbonos(res.abonos || []);
    } catch {
      setAbonos([]);
    } finally {
      setLoadingAbonos(false);
    }
  }

  const activos = vales.filter(v => ['pendiente', 'parcial'].includes(v.estado));

  return (
    <Container className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>🧾 Mis Vales</h1>
        <p className={styles.subtitle}>Historial de compras al fiado en tiendas de barrio</p>
      </div>

      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}

      {loading ? (
        <div className={styles.loadingCenter}><Spinner animation="border" variant="success" /></div>
      ) : (
        <>
          {totalPendiente > 0 && (
            <Alert variant="warning" className="mb-4">
              <strong>Saldo total pendiente: {fmt(totalPendiente)}</strong>
              {' '}— tienes {activos.length} vale{activos.length !== 1 ? 's' : ''} por saldar.
            </Alert>
          )}

          <Row className="g-3 mb-4">
            <Col xs={6} md={3}>
              <Card className={styles.statCard}>
                <Card.Body className="text-center">
                  <div className={styles.statNum}>{vales.length}</div>
                  <div className={styles.statLabel}>Total vales</div>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} md={3}>
              <Card className={`${styles.statCard} ${styles.statWarning}`}>
                <Card.Body className="text-center">
                  <div className={styles.statNum}>{activos.length}</div>
                  <div className={styles.statLabel}>Por saldar</div>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} md={3}>
              <Card className={`${styles.statCard} ${styles.statSuccess}`}>
                <Card.Body className="text-center">
                  <div className={styles.statNum}>{vales.filter(v => v.estado === 'pagado').length}</div>
                  <div className={styles.statLabel}>Pagados</div>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} md={3}>
              <Card className={`${styles.statCard} ${styles.statDanger}`}>
                <Card.Body className="text-center">
                  <div className={styles.statNum}>{fmt(totalPendiente)}</div>
                  <div className={styles.statLabel}>Saldo pendiente</div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {vales.length === 0 ? (
            <Card className={styles.card}>
              <Card.Body className={styles.emptyState}>
                <p>🎉 No tienes vales registrados.</p>
              </Card.Body>
            </Card>
          ) : (
            <Card className={styles.card}>
              <div className={styles.tableWrapper}>
                <Table className={styles.table} hover>
                  <thead>
                    <tr>
                      <th>Tienda</th>
                      <th>Descripción</th>
                      <th>Total</th>
                      <th>Pendiente</th>
                      <th>Estado</th>
                      <th>Fecha</th>
                      <th>Vence</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {vales.map(v => {
                      const cfg = ESTADO_CONFIG[v.estado];
                      const enMora = ['pendiente','parcial'].includes(v.estado) && v.fechaVencimiento && new Date(v.fechaVencimiento) < new Date();
                      return (
                        <tr key={v.id} className={v.estado === 'anulado' ? styles.anulado : ''}>
                          <td><strong>{v.tiendaNombre || '—'}</strong></td>
                          <td>{v.descripcion}</td>
                          <td className={styles.monto}>{fmt(v.montoTotal)}</td>
                          <td className={styles.monto}>{v.estado === 'pagado' ? <span className={styles.pagado}>✓ Pagado</span> : fmt(v.saldoPendiente)}</td>
                          <td>
                            <Badge bg={cfg.bg}>{cfg.label}</Badge>
                            {enMora && <Badge bg="danger" className="ms-1">Mora</Badge>}
                          </td>
                          <td className={styles.date}>{fmtDate(v.fechaVale)}</td>
                          <td className={styles.date}>{fmtDate(v.fechaVencimiento)}</td>
                          <td>
                            <Button size="sm" variant="outline-secondary" onClick={() => openDetalle(v)}>
                              Ver
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Modal detalle + abonos */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>🧾 Detalle del vale</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedVale && (
            <>
              <Row className="mb-3">
                <Col md={6}><strong>Tienda:</strong> {selectedVale.tiendaNombre || '—'}</Col>
                <Col md={6}><strong>Estado:</strong> <Badge bg={ESTADO_CONFIG[selectedVale.estado].bg}>{ESTADO_CONFIG[selectedVale.estado].label}</Badge></Col>
                <Col md={12} className="mt-2"><strong>Descripción:</strong> {selectedVale.descripcion}</Col>
                <Col md={6} className="mt-2"><strong>Monto total:</strong> {fmt(selectedVale.montoTotal)}</Col>
                <Col md={6} className="mt-2"><strong>Saldo pendiente:</strong> {fmt(selectedVale.saldoPendiente)}</Col>
                <Col md={6} className="mt-2"><strong>Fecha:</strong> {fmtDate(selectedVale.fechaVale)}</Col>
                <Col md={6} className="mt-2"><strong>Vence:</strong> {fmtDate(selectedVale.fechaVencimiento)}</Col>
                {selectedVale.notas && <Col md={12} className="mt-2"><strong>Notas:</strong> {selectedVale.notas}</Col>}
              </Row>
              <hr />
              <h6>Historial de abonos</h6>
              {loadingAbonos ? (
                <div className="text-center py-3"><Spinner size="sm" /></div>
              ) : abonos.length === 0 ? (
                <p className="text-muted">Sin abonos registrados.</p>
              ) : (
                <Table size="sm" hover>
                  <thead><tr><th>Fecha</th><th>Monto</th><th>Por</th><th>Notas</th><th>Estado</th></tr></thead>
                  <tbody>
                    {abonos.map(a => (
                      <tr key={a.id} style={{ opacity: a.anulado ? 0.5 : 1 }}>
                        <td>{fmtDate(a.fechaAbono)}</td>
                        <td>{fmt(a.monto)}</td>
                        <td>{a.registradoPorNombre || '—'}</td>
                        <td>{a.notas || '—'}</td>
                        <td>{a.anulado ? <Badge bg="secondary">Anulado</Badge> : <Badge bg="success">Activo</Badge>}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cerrar</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default function MisValesPage() {
  return (
    <ProtectedRoute>
      <MisValesContent />
    </ProtectedRoute>
  );
}
