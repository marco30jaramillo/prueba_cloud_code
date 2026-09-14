'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Container, Card, Form, Button, Alert, Spinner, Row, Col, ListGroup } from 'react-bootstrap';
import { useAuthStore } from '@/lib/auth-store';
import { tiendasAPI, valesAPI, usersAPI } from '@/lib/api';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useRouter } from 'next/navigation';
import styles from './page.module.scss';

interface Tienda { id: string; nombre: string; }
interface UserResult { id: string; name: string; email: string; role: string; }

function ValeNuevoContent() {
  const { user } = useAuthStore();
  const router = useRouter();

  const isAdmin = user?.role === 'superuser' || user?.role === 'administrador';

  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [loadingTiendas, setLoadingTiendas] = useState(true);

  const [form, setForm] = useState({
    tiendaId: '',
    clienteId: '',
    clienteNombre: '',
    descripcion: '',
    montoTotal: '',
    fechaVencimiento: (() => {
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      return d.toISOString().split('T')[0];
    })(),
    notas: '',
  });

  const [clienteQuery, setClienteQuery] = useState('');
  const [clienteResults, setClienteResults] = useState<UserResult[]>([]);
  const [searchingCliente, setSearchingCliente] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadTiendas();
  }, []);

  async function loadTiendas() {
    try {
      const res = isAdmin ? await tiendasAPI.getAll() : await tiendasAPI.getMisTiendas();
      const list: Tienda[] = res.tiendas || [];
      setTiendas(list);
      if (list.length === 1) setForm(f => ({ ...f, tiendaId: list[0].id }));
    } catch {
      setError('No se pudieron cargar tus tiendas.');
    } finally {
      setLoadingTiendas(false);
    }
  }

  function handleClienteSearch(q: string) {
    setClienteQuery(q);
    setForm(f => ({ ...f, clienteId: '', clienteNombre: '' }));
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (q.trim().length < 2) { setClienteResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearchingCliente(true);
      try {
        const res = await usersAPI.buscarClientes(q);
        setClienteResults(res.clientes || []);
      } catch { setClienteResults([]); }
      finally { setSearchingCliente(false); }
    }, 350);
  }

  function selectCliente(u: UserResult) {
    setForm(f => ({ ...f, clienteId: u.id, clienteNombre: u.name }));
    setClienteQuery(`${u.name} — ${u.email}`);
    setClienteResults([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.tiendaId) return setError('Selecciona una tienda.');
    if (!form.clienteId) return setError('Selecciona un cliente.');
    if (!form.descripcion.trim()) return setError('La descripción es requerida.');
    const monto = parseFloat(form.montoTotal);
    if (!monto || monto <= 0) return setError('El monto debe ser mayor a 0.');

    setSubmitting(true);
    try {
      await valesAPI.crear({
        tiendaId: form.tiendaId,
        clienteId: form.clienteId,
        descripcion: form.descripcion.trim(),
        montoTotal: monto,
        ...(form.fechaVencimiento && { fechaVencimiento: form.fechaVencimiento }),
        ...(form.notas.trim() && { notas: form.notas.trim() }),
      });
      setSuccess('¡Vale registrado exitosamente!');
      setForm(f => ({ ...f, clienteId: '', clienteNombre: '', descripcion: '', montoTotal: '', fechaVencimiento: '', notas: '' }));
      setClienteQuery('');
      setTimeout(() => router.push('/dashboard/cartera'), 1500);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al registrar el vale.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingTiendas) {
    return (
      <Container className={styles.container}>
        <div className={styles.loadingCenter}><Spinner animation="border" variant="success" /></div>
      </Container>
    );
  }

  if (tiendas.length === 0) {
    return (
      <Container className={styles.container}>
        <Alert variant="warning">
          {isAdmin
            ? 'No hay tiendas registradas en el sistema.'
            : 'No tienes tiendas asignadas. Contacta a tu administrador.'}
        </Alert>
      </Container>
    );
  }

  return (
    <Container className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>➕ Nueva Venta al Fiado</h1>
        <p className={styles.subtitle}>Registra un vale para un cliente</p>
      </div>

      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <Card className={styles.card}>
            <Card.Body className="p-4">
              <Form onSubmit={handleSubmit}>

                {/* Tienda */}
                <Form.Group className="mb-3">
                  <Form.Label className={styles.label}>Tienda *</Form.Label>
                  {tiendas.length === 1 ? (
                    <Form.Control value={tiendas[0].nombre} disabled />
                  ) : (
                    <Form.Select value={form.tiendaId} onChange={e => setForm(f => ({ ...f, tiendaId: e.target.value }))} required>
                      <option value="">Selecciona una tienda</option>
                      {tiendas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    </Form.Select>
                  )}
                </Form.Group>

                {/* Cliente */}
                <Form.Group className="mb-3" style={{ position: 'relative' }}>
                  <Form.Label className={styles.label}>Cliente *</Form.Label>
                  <div className="d-flex gap-2">
                    <Form.Control
                      placeholder="Buscar por nombre o email..."
                      value={clienteQuery}
                      onChange={e => handleClienteSearch(e.target.value)}
                      autoComplete="off"
                    />
                    {searchingCliente && <Spinner size="sm" className="align-self-center" />}
                  </div>
                  {form.clienteId && (
                    <Form.Text className="text-success">✓ Cliente seleccionado: {form.clienteNombre}</Form.Text>
                  )}
                  {clienteResults.length > 0 && (
                    <ListGroup className={styles.searchDropdown}>
                      {clienteResults.map(u => (
                        <ListGroup.Item key={u.id} action onClick={() => selectCliente(u)} className={styles.searchItem}>
                          <strong>{u.name}</strong> <span className="text-muted">— {u.email}</span>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  )}
                </Form.Group>

                {/* Descripción */}
                <Form.Group className="mb-3">
                  <Form.Label className={styles.label}>Descripción *</Form.Label>
                  <Form.Control
                    as="textarea" rows={2}
                    placeholder="Ej: Mercado semanal — arroz, aceite, sal"
                    value={form.descripcion}
                    onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                    required
                  />
                </Form.Group>

                <Row>
                  {/* Monto */}
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className={styles.label}>Monto total (COP) *</Form.Label>
                      <Form.Control
                        type="number" min="1" step="100"
                        placeholder="0"
                        value={form.montoTotal}
                        onChange={e => setForm(f => ({ ...f, montoTotal: e.target.value }))}
                        required
                      />
                    </Form.Group>
                  </Col>
                  {/* Vencimiento */}
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className={styles.label}>Fecha de vencimiento</Form.Label>
                      <Form.Control
                        type="date"
                        value={form.fechaVencimiento}
                        onChange={e => setForm(f => ({ ...f, fechaVencimiento: e.target.value }))}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                {/* Notas */}
                <Form.Group className="mb-4">
                  <Form.Label className={styles.label}>Notas (opcional)</Form.Label>
                  <Form.Control
                    as="textarea" rows={2}
                    placeholder="Observaciones adicionales..."
                    value={form.notas}
                    onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                  />
                </Form.Group>

                <div className="d-grid">
                  <Button type="submit" variant="success" size="lg" disabled={submitting}>
                    {submitting ? <><Spinner size="sm" className="me-2" />Registrando...</> : '🧾 Registrar Vale'}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default function ValeNuevoPage() {
  return (
    <ProtectedRoute>
      <ValeNuevoContent />
    </ProtectedRoute>
  );
}
