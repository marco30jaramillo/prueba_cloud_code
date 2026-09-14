'use client';

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Alert, Spinner, Modal, Form } from 'react-bootstrap';
import { useAuthStore } from '@/lib/auth-store';
import { tiendasAPI, valesAPI, usersAPI } from '@/lib/api';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import styles from './page.module.scss';

interface Tienda { id: string; nombre: string; }
interface Vale {
  id: string;
  clienteId: string;
  clienteNombre?: string;
  clienteEmail?: string;
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

function CarteraContent() {
  const { user } = useAuthStore();
  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [tiendaId, setTiendaId] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [vales, setVales] = useState<Vale[]>([]);
  const [totalPendiente, setTotalPendiente] = useState(0);
  const [enMora, setEnMora] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal detalle + abono
  const [selectedVale, setSelectedVale] = useState<Vale | null>(null);
  const [abonos, setAbonos] = useState<Abono[]>([]);
  const [loadingAbonos, setLoadingAbonos] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Form abono
  const [montoAbono, setMontoAbono] = useState('');
  const [notasAbono, setNotasAbono] = useState('');
  const [registrando, setRegistrando] = useState(false);

  // Búsqueda por cliente
  interface ClienteResult { id: string; name: string; email: string; }
  const [modoCliente, setModoCliente] = useState(false);
  const [clienteQuery, setClienteQuery] = useState('');
  const [clienteResults, setClienteResults] = useState<ClienteResult[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteResult | null>(null);
  const [loadingClientes, setLoadingClientes] = useState(false);

  useEffect(() => { loadTiendas(); }, []);
  useEffect(() => { if (tiendaId && !modoCliente) loadCartera(); }, [tiendaId, filtroEstado]);
  useEffect(() => {
    if (!modoCliente) { setClienteQuery(''); setClienteSeleccionado(null); setClienteResults([]); }
  }, [modoCliente]);

  async function buscarClientes(q: string) {
    setClienteQuery(q);
    setClienteSeleccionado(null);
    if (q.trim().length < 2) { setClienteResults([]); return; }
    setLoadingClientes(true);
    try {
      const res = await usersAPI.getAll();
      const lower = q.toLowerCase();
      setClienteResults(
        (res.users || []).filter((u: any) =>
          u.role === 'cliente' &&
          (u.name.toLowerCase().includes(lower) || u.email.toLowerCase().includes(lower))
        ).slice(0, 6)
      );
    } catch { setClienteResults([]); }
    finally { setLoadingClientes(false); }
  }

  async function cargarValesCliente(cliente: ClienteResult) {
    setClienteSeleccionado(cliente);
    setClienteQuery(cliente.name);
    setClienteResults([]);
    setLoading(true);
    setError('');
    try {
      const res = await valesAPI.getByUsuario(cliente.id);
      setVales(res.vales || []);
      setTotalPendiente(res.totalPendiente || 0);
      setEnMora(res.enMora || 0);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al cargar vales del cliente.');
    } finally {
      setLoading(false);
    }
  }

  async function loadTiendas() {
    try {
      const isAdmin = user?.role === 'superuser' || user?.role === 'administrador';
      const res = isAdmin ? await tiendasAPI.getAll() : await tiendasAPI.getMisTiendas();
      const list: Tienda[] = res.tiendas || [];
      setTiendas(list);
      if (list.length > 0) setTiendaId(list[0].id);
    } catch (err: any) {
      if (err?.response?.status === 500) setError('Error de base de datos al cargar tiendas. Verifica que la migración SQL haya sido ejecutada.');
      else setError('No se pudieron cargar tus tiendas.');
    }
  }

  async function loadCartera() {
    setLoading(true);
    setError('');
    try {
      const res = await valesAPI.getCartera(tiendaId, filtroEstado || undefined);
      setVales(res.vales || []);
      setTotalPendiente(res.totalPendiente || 0);
      setEnMora(res.enMora || 0);
    } catch {
      setError('Error al cargar la cartera.');
    } finally {
      setLoading(false);
    }
  }

  async function openDetalle(vale: Vale) {
    setSelectedVale(vale);
    setShowModal(true);
    setMontoAbono('');
    setNotasAbono('');
    setSuccess('');
    setLoadingAbonos(true);
    try {
      const res = await valesAPI.getAbonos(vale.id);
      setAbonos(res.abonos || []);
    } catch { setAbonos([]); }
    finally { setLoadingAbonos(false); }
  }

  async function handleAbono(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVale) return;
    const monto = parseFloat(montoAbono);
    if (!monto || monto <= 0) return setError('El monto debe ser mayor a 0.');
    setRegistrando(true);
    setError('');
    try {
      const res = await valesAPI.registrarAbono(selectedVale.id, monto, notasAbono.trim() || undefined);
      setAbonos(prev => [res.abono, ...prev]);
      setSelectedVale(res.vale);
      setVales(prev => prev.map(v => v.id === res.vale.id ? { ...v, ...res.vale } : v));
      setMontoAbono('');
      setNotasAbono('');
      setSuccess(`Abono de ${fmt(monto)} registrado.`);
      loadCartera();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al registrar abono.');
    } finally {
      setRegistrando(false);
    }
  }

  async function handleAnularVale(vale: Vale) {
    if (!confirm(`¿Anular el vale de ${vale.clienteNombre}? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await valesAPI.anular(vale.id);
      setVales(prev => prev.map(v => v.id === vale.id ? { ...v, ...res.vale } : v));
      if (selectedVale?.id === vale.id) setSelectedVale(res.vale);
      loadCartera();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al anular el vale.');
    }
  }

  async function handleAnularAbono(abonoId: string) {
    if (!selectedVale) return;
    if (!confirm('¿Anular este abono? Se recalculará el saldo del vale.')) return;
    try {
      const res = await valesAPI.anularAbono(selectedVale.id, abonoId);
      setAbonos(prev => prev.map(a => a.id === abonoId ? { ...a, anulado: true } : a));
      setSelectedVale(res.vale);
      setVales(prev => prev.map(v => v.id === res.vale.id ? { ...v, ...res.vale } : v));
      loadCartera();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al anular abono.');
    }
  }

  const valeActivo = selectedVale && ['pendiente', 'parcial'].includes(selectedVale.estado);

  return (
    <Container className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>💼 Cartera</h1>
        <p className={styles.subtitle}>Gestiona los vales al fiado de tu tienda</p>
      </div>

      {error && tiendas.length === 0 && (
        <Alert variant="warning">{error}</Alert>
      )}
      {error && tiendas.length > 0 && (
        <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>
      )}

      {tiendas.length > 0 && (
        <>
          {/* Filtros */}
          <Card className={styles.filterCard}>
            <Card.Body>
              {/* Toggle modo */}
              <div className="d-flex gap-2 mb-3">
                <Button
                  size="sm"
                  variant={!modoCliente ? 'success' : 'outline-success'}
                  onClick={() => setModoCliente(false)}
                >
                  Por tienda
                </Button>
                <Button
                  size="sm"
                  variant={modoCliente ? 'success' : 'outline-success'}
                  onClick={() => setModoCliente(true)}
                >
                  Buscar por cliente
                </Button>
              </div>

              {!modoCliente ? (
                <Row className="g-2 align-items-end">
                  <Col md={5}>
                    <Form.Label className={styles.label}>Tienda</Form.Label>
                    <Form.Select value={tiendaId} onChange={e => setTiendaId(e.target.value)}>
                      {tiendas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    </Form.Select>
                  </Col>
                  <Col md={4}>
                    <Form.Label className={styles.label}>Estado</Form.Label>
                    <Form.Select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                      <option value="">Todos</option>
                      <option value="pendiente">Pendiente</option>
                      <option value="parcial">Parcial</option>
                      <option value="pagado">Pagado</option>
                      <option value="anulado">Anulado</option>
                    </Form.Select>
                  </Col>
                  <Col md={3}>
                    <Button variant="outline-success" onClick={loadCartera} className="w-100">
                      Actualizar
                    </Button>
                  </Col>
                </Row>
              ) : (
                <div className={styles.clienteSearch}>
                  <Form.Label className={styles.label}>Buscar cliente por nombre o email</Form.Label>
                  <div className={styles.searchWrapper}>
                    <Form.Control
                      placeholder="Escribe al menos 2 caracteres..."
                      value={clienteQuery}
                      onChange={e => buscarClientes(e.target.value)}
                      autoComplete="off"
                    />
                    {loadingClientes && <Spinner size="sm" className={styles.searchSpinner} />}
                    {clienteResults.length > 0 && (
                      <div className={styles.searchDropdown}>
                        {clienteResults.map(c => (
                          <div key={c.id} className={styles.searchItem} onClick={() => cargarValesCliente(c)}>
                            <strong>{c.name}</strong>
                            <span className="text-muted ms-2">{c.email}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {clienteSeleccionado && (
                    <div className="mt-2 text-muted" style={{ fontSize: '0.85rem' }}>
                      Mostrando vales de <strong>{clienteSeleccionado.name}</strong>
                      {' '}—{' '}
                      <span
                        className="text-success"
                        style={{ cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={() => { setClienteSeleccionado(null); setClienteQuery(''); setVales([]); }}
                      >
                        limpiar
                      </span>
                    </div>
                  )}
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Resumen */}
          <Row className="g-3 my-3">
            <Col xs={6} md={3}>
              <Card className={styles.statCard}>
                <Card.Body className="text-center">
                  <div className={styles.statNum}>{vales.length}</div>
                  <div className={styles.statLabel}>Vales</div>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} md={3}>
              <Card className={`${styles.statCard} ${styles.statWarning}`}>
                <Card.Body className="text-center">
                  <div className={styles.statNum}>{vales.filter(v => ['pendiente','parcial'].includes(v.estado)).length}</div>
                  <div className={styles.statLabel}>Por cobrar</div>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} md={3}>
              <Card className={`${styles.statCard} ${styles.statDanger}`}>
                <Card.Body className="text-center">
                  <div className={styles.statNum}>{enMora}</div>
                  <div className={styles.statLabel}>En mora</div>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} md={3}>
              <Card className={`${styles.statCard} ${styles.statPrimary}`}>
                <Card.Body className="text-center">
                  <div className={styles.statNum}>{fmt(totalPendiente)}</div>
                  <div className={styles.statLabel}>Total pendiente</div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {loading ? (
            <div className={styles.loadingCenter}><Spinner animation="border" variant="success" /></div>
          ) : vales.length === 0 ? (
            <Card className={styles.card}>
              <Card.Body className={styles.emptyState}>Sin vales con ese filtro.</Card.Body>
            </Card>
          ) : (
            <Card className={styles.card}>
              <div className={styles.tableWrapper}>
                <Table className={styles.table} hover>
                  <thead>
                    <tr>
                      <th>Cliente</th>
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
                      const mora = ['pendiente','parcial'].includes(v.estado) && v.fechaVencimiento && new Date(v.fechaVencimiento) < new Date();
                      return (
                        <tr key={v.id} className={v.estado === 'anulado' ? styles.anulado : ''}>
                          <td>
                            <strong>{v.clienteNombre || '—'}</strong>
                            {v.clienteEmail && <div className={styles.email}>{v.clienteEmail}</div>}
                          </td>
                          <td>{v.descripcion}</td>
                          <td className={styles.monto}>{fmt(v.montoTotal)}</td>
                          <td className={styles.monto}>{v.estado === 'pagado' ? <span className={styles.pagado}>✓</span> : fmt(v.saldoPendiente)}</td>
                          <td>
                            <Badge bg={cfg.bg}>{cfg.label}</Badge>
                            {mora && <Badge bg="danger" className="ms-1">Mora</Badge>}
                          </td>
                          <td className={styles.date}>{fmtDate(v.fechaVale)}</td>
                          <td className={styles.date}>{fmtDate(v.fechaVencimiento)}</td>
                          <td>
                            <Button size="sm" variant="outline-success" onClick={() => openDetalle(v)}>
                              Gestionar
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

      {/* Modal gestión */}
      <Modal show={showModal} onHide={() => { setShowModal(false); setSuccess(''); setError(''); }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>🧾 Vale — {selectedVale?.clienteNombre}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedVale && (
            <>
              {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}
              {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}

              <Row className="mb-3">
                <Col md={6}><strong>Descripción:</strong> {selectedVale.descripcion}</Col>
                <Col md={3}><strong>Estado:</strong> <Badge bg={ESTADO_CONFIG[selectedVale.estado].bg}>{ESTADO_CONFIG[selectedVale.estado].label}</Badge></Col>
                <Col md={3} className="text-end">
                  {valeActivo && (
                    <Button size="sm" variant="outline-danger" onClick={() => handleAnularVale(selectedVale)}>
                      Anular vale
                    </Button>
                  )}
                </Col>
                <Col md={6} className="mt-2"><strong>Monto total:</strong> {fmt(selectedVale.montoTotal)}</Col>
                <Col md={6} className="mt-2"><strong>Saldo pendiente:</strong> <strong className={selectedVale.saldoPendiente > 0 ? 'text-danger' : 'text-success'}>{fmt(selectedVale.saldoPendiente)}</strong></Col>
                <Col md={6} className="mt-2"><strong>Fecha:</strong> {fmtDate(selectedVale.fechaVale)}</Col>
                <Col md={6} className="mt-2"><strong>Vence:</strong> {fmtDate(selectedVale.fechaVencimiento)}</Col>
              </Row>

              {valeActivo && (
                <>
                  <hr />
                  <h6>Registrar abono</h6>
                  <Form onSubmit={handleAbono}>
                    <Row className="g-2 align-items-end">
                      <Col md={5}>
                        <Form.Control type="number" min="1" step="100" placeholder="Monto abono" value={montoAbono} onChange={e => setMontoAbono(e.target.value)} required />
                      </Col>
                      <Col md={4}>
                        <Form.Control placeholder="Nota (opcional)" value={notasAbono} onChange={e => setNotasAbono(e.target.value)} />
                      </Col>
                      <Col md={3}>
                        <Button type="submit" variant="success" className="w-100" disabled={registrando}>
                          {registrando ? <Spinner size="sm" /> : 'Abonar'}
                        </Button>
                      </Col>
                    </Row>
                  </Form>
                </>
              )}

              <hr />
              <h6>Historial de abonos</h6>
              {loadingAbonos ? (
                <div className="text-center py-2"><Spinner size="sm" /></div>
              ) : abonos.length === 0 ? (
                <p className="text-muted">Sin abonos registrados.</p>
              ) : (
                <Table size="sm" hover>
                  <thead><tr><th>Fecha</th><th>Monto</th><th>Por</th><th>Estado</th><th></th></tr></thead>
                  <tbody>
                    {abonos.map(a => (
                      <tr key={a.id} style={{ opacity: a.anulado ? 0.5 : 1 }}>
                        <td>{fmtDate(a.fechaAbono)}</td>
                        <td>{fmt(a.monto)}</td>
                        <td>{a.registradoPorNombre || '—'}</td>
                        <td>{a.anulado ? <Badge bg="secondary">Anulado</Badge> : <Badge bg="success">Activo</Badge>}</td>
                        <td>
                          {!a.anulado && (
                            <Button size="sm" variant="outline-danger" onClick={() => handleAnularAbono(a.id)}>✕</Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setShowModal(false); setSuccess(''); setError(''); }}>Cerrar</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default function CarteraPage() {
  return (
    <ProtectedRoute>
      <CarteraContent />
    </ProtectedRoute>
  );
}
