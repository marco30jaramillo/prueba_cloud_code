'use client';

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Table, Badge, Modal } from 'react-bootstrap';
import { useAuthStore } from '@/lib/auth-store';
import { tiendasAPI, usersAPI } from '@/lib/api';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import styles from './page.module.scss';

interface Tienda {
  id: string;
  nombre: string;
  descripcion?: string;
  direccion?: string;
  ciudad?: string;
  telefono?: string;
  isActive: boolean;
  totalAsignados?: number;
  totalPropietarios?: number;
  propietarioNombre?: string | null;
  propietarioEmail?: string | null;
}

interface TiendaUsuario {
  id: string;
  userId: string;
  name?: string;
  email?: string;
  userName?: string;
  userEmail?: string;
  esPropietario: boolean;
  assignedAt: string;
}

interface UserResult { id: string; name: string; email: string; role: string; }

function TiendaContent() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'superuser' || user?.role === 'administrador';

  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState('');

  // null = lista, string = detalle de esa tienda
  const [vistaDetalle, setVistaDetalle] = useState<string | null>(null);

  const [tienda, setTienda] = useState<Tienda | null>(null);
  const [usuarios, setUsuarios] = useState<TiendaUsuario[]>([]);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [detailSuccess, setDetailSuccess] = useState('');
  const [form, setForm] = useState({ nombre: '', descripcion: '', direccion: '', ciudad: '', telefono: '' });

  const [showAddUser, setShowAddUser] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const [esPropietario, setEsPropietario] = useState(false);
  const [addingUser, setAddingUser] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ nombre: '', descripcion: '', direccion: '', ciudad: 'Cartagena', telefono: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadTiendas(); }, []);

  useEffect(() => {
    // Tendero con una sola tienda: ir directo al detalle
    if (!isAdmin && tiendas.length === 1 && vistaDetalle === null) {
      openDetalle(tiendas[0].id);
    }
  }, [tiendas]);

  async function loadTiendas() {
    setLoadingList(true);
    try {
      const res = isAdmin ? await tiendasAPI.getAll() : await tiendasAPI.getMisTiendas();
      setTiendas(res.tiendas || []);
    } catch {
      setListError('No se pudieron cargar las tiendas.');
    } finally {
      setLoadingList(false);
    }
  }

  async function openDetalle(id: string) {
    setVistaDetalle(id);
    setLoadingDetalle(true);
    setDetailError('');
    setDetailSuccess('');
    try {
      const [tRes, uRes] = await Promise.all([
        tiendasAPI.getById(id),
        tiendasAPI.getUsuarios(id),
      ]);
      const t = tRes.tienda;
      setTienda(t);
      setForm({
        nombre: t.nombre || '',
        descripcion: t.descripcion || '',
        direccion: t.direccion || '',
        ciudad: t.ciudad || '',
        telefono: t.telefono || '',
      });
      setUsuarios(uRes.usuarios || []);
    } catch {
      setDetailError('Error al cargar la tienda.');
    } finally {
      setLoadingDetalle(false);
    }
  }

  function volverALista() {
    setVistaDetalle(null);
    setTienda(null);
    setUsuarios([]);
    setDetailError('');
    setDetailSuccess('');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!vistaDetalle) return;
    setDetailError('');
    setDetailSuccess('');
    setSaving(true);
    try {
      const res = await tiendasAPI.update(vistaDetalle, form);
      const updated = res.tienda as Tienda;
      setTienda(updated);
      setTiendas(prev => prev.map(t => t.id === updated.id ? { ...t, nombre: updated.nombre } : t));
      setDetailSuccess('Tienda actualizada correctamente.');
    } catch (err: any) {
      setDetailError(err?.response?.data?.message || 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.nombre.trim()) return;
    setCreating(true);
    setListError('');
    try {
      const res = await tiendasAPI.create(createForm);
      const nueva = res.tienda as Tienda;
      setTiendas(prev => [...prev, { ...nueva, totalAsignados: 0, totalPropietarios: 0, propietarioNombre: null, propietarioEmail: null }]);
      setShowCreate(false);
      setCreateForm({ nombre: '', descripcion: '', direccion: '', ciudad: 'Cartagena', telefono: '' });
    } catch (err: any) {
      setListError(err?.response?.data?.message || 'Error al crear la tienda.');
    } finally {
      setCreating(false);
    }
  }

  async function searchUsers(q: string) {
    setUserQuery(q);
    setSelectedUser(null);
    if (q.trim().length < 2) { setUserResults([]); return; }
    try {
      const res = await usersAPI.getAll();
      const lower = q.toLowerCase();
      const existingIds = new Set(usuarios.map(u => u.userId));
      setUserResults(
        (res.users || []).filter((u: UserResult) =>
          ['tendero', 'vendedor'].includes(u.role) &&
          !existingIds.has(u.id) &&
          (u.name.toLowerCase().includes(lower) || u.email.toLowerCase().includes(lower))
        ).slice(0, 6)
      );
    } catch { setUserResults([]); }
  }

  async function handleAddUser() {
    if (!selectedUser || !vistaDetalle) return;
    setAddingUser(true);
    setDetailError('');
    try {
      await tiendasAPI.addUsuario(vistaDetalle, selectedUser.id, esPropietario);
      await openDetalle(vistaDetalle);
      setShowAddUser(false);
      setUserQuery('');
      setSelectedUser(null);
      setDetailSuccess('Usuario agregado a la tienda.');
    } catch (err: any) {
      setDetailError(err?.response?.data?.message || 'Error al agregar usuario.');
    } finally {
      setAddingUser(false);
    }
  }

  async function handleRemoveUser(userId: string) {
    if (!confirm('¿Remover este usuario de la tienda?') || !vistaDetalle) return;
    try {
      await tiendasAPI.removeUsuario(vistaDetalle, userId);
      setUsuarios(prev => prev.filter(u => u.userId !== userId));
      setDetailSuccess('Usuario removido de la tienda.');
    } catch (err: any) {
      setDetailError(err?.response?.data?.message || 'Error al remover usuario.');
    }
  }

  // ── VISTA LISTA ─────────────────────────────────────────────────
  if (vistaDetalle === null) {
    return (
      <Container className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>🏪 Tiendas</h1>
            <p className={styles.subtitle}>Gestiona las tiendas registradas en el sistema</p>
          </div>
          {isAdmin && (
            <Button variant="success" onClick={() => setShowCreate(true)}>+ Nueva Tienda</Button>
          )}
        </div>

        {listError && <Alert variant="danger" onClose={() => setListError('')} dismissible>{listError}</Alert>}

        {loadingList ? (
          <div className={styles.loadingCenter}><Spinner animation="border" variant="success" /></div>
        ) : tiendas.length === 0 ? (
          <Alert variant={isAdmin ? 'info' : 'warning'}>
            {isAdmin
              ? <>No hay tiendas registradas. <Button variant="link" className="p-0" onClick={() => setShowCreate(true)}>Crea la primera.</Button></>
              : 'No tienes tiendas asignadas.'}
          </Alert>
        ) : (
          <Card className={styles.card}>
            <Card.Body className="p-0">
              <div className={styles.tableWrapper}>
                <Table className={styles.table} hover>
                  <thead>
                    <tr>
                      <th>Tienda</th>
                      <th>Estado</th>
                      <th>Contacto principal</th>
                      <th className="text-center">Equipo</th>
                      <th className="text-center">Responsables</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tiendas.map(t => (
                      <tr key={t.id}>
                        <td>
                          <strong>{t.nombre}</strong>
                          {t.ciudad && <div className={styles.muted}>{t.ciudad}</div>}
                        </td>
                        <td>
                          <Badge bg={t.isActive ? 'success' : 'secondary'}>
                            {t.isActive ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </td>
                        <td>
                          {t.propietarioNombre
                            ? <><strong>{t.propietarioNombre}</strong><div className={styles.muted}>{t.propietarioEmail}</div></>
                            : <span className={styles.muted}>Sin contacto</span>}
                        </td>
                        <td className="text-center">
                          <Badge bg="light" text="dark">{t.totalAsignados ?? 0}</Badge>
                        </td>
                        <td className="text-center">
                          <Badge bg="light" text="dark">{t.totalPropietarios ?? 0}</Badge>
                        </td>
                        <td>
                          <Button size="sm" variant="outline-success" onClick={() => openDetalle(t.id)}>
                            Administrar →
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        )}

        {/* Modal crear tienda */}
        <Modal show={showCreate} onHide={() => setShowCreate(false)}>
          <Modal.Header closeButton><Modal.Title>Nueva Tienda</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form onSubmit={handleCreate}>
              <Form.Group className="mb-3">
                <Form.Label className={styles.label}>Nombre *</Form.Label>
                <Form.Control value={createForm.nombre} onChange={e => setCreateForm(f => ({ ...f, nombre: e.target.value }))} required autoFocus />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className={styles.label}>Descripción</Form.Label>
                <Form.Control as="textarea" rows={2} value={createForm.descripcion} onChange={e => setCreateForm(f => ({ ...f, descripcion: e.target.value }))} />
              </Form.Group>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className={styles.label}>Dirección</Form.Label>
                    <Form.Control value={createForm.direccion} onChange={e => setCreateForm(f => ({ ...f, direccion: e.target.value }))} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className={styles.label}>Ciudad</Form.Label>
                    <Form.Control value={createForm.ciudad} onChange={e => setCreateForm(f => ({ ...f, ciudad: e.target.value }))} />
                  </Form.Group>
                </Col>
              </Row>
              <Form.Group className="mb-3">
                <Form.Label className={styles.label}>Teléfono</Form.Label>
                <Form.Control value={createForm.telefono} onChange={e => setCreateForm(f => ({ ...f, telefono: e.target.value }))} />
              </Form.Group>
              <div className="d-flex gap-2 justify-content-end">
                <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancelar</Button>
                <Button type="submit" variant="success" disabled={creating}>
                  {creating ? <Spinner size="sm" /> : 'Crear Tienda'}
                </Button>
              </div>
            </Form>
          </Modal.Body>
        </Modal>
      </Container>
    );
  }

  // ── VISTA DETALLE ──────────────────────────────────────────────
  return (
    <Container className={styles.container}>
      <div className={styles.header}>
        <div>
          {isAdmin && (
            <button className={styles.backBtn} onClick={volverALista}>
              ← Volver a tiendas
            </button>
          )}
          <h1 className={styles.title}>
            🏪 {loadingDetalle ? '...' : (tienda?.nombre || 'Tienda')}
          </h1>
          {tienda && (
            <Badge bg={tienda.isActive ? 'success' : 'secondary'}>
              {tienda.isActive ? 'Activa' : 'Inactiva'}
            </Badge>
          )}
        </div>
      </div>

      {detailError && <Alert variant="danger" onClose={() => setDetailError('')} dismissible>{detailError}</Alert>}
      {detailSuccess && <Alert variant="success" onClose={() => setDetailSuccess('')} dismissible>{detailSuccess}</Alert>}

      {loadingDetalle ? (
        <div className={styles.loadingCenter}><Spinner animation="border" variant="success" /></div>
      ) : (
        <Row className="g-4">
          {/* Información de la tienda */}
          <Col md={6}>
            <Card className={styles.card}>
              <Card.Header className={styles.cardHeader}>
                <strong>Información de la tienda</strong>
              </Card.Header>
              <Card.Body>
                <Form onSubmit={handleSave}>
                  <Form.Group className="mb-3">
                    <Form.Label className={styles.label}>Nombre *</Form.Label>
                    <Form.Control value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required disabled={!isAdmin} />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label className={styles.label}>Descripción</Form.Label>
                    <Form.Control as="textarea" rows={2} value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} disabled={!isAdmin} />
                  </Form.Group>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label className={styles.label}>Dirección</Form.Label>
                        <Form.Control value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} disabled={!isAdmin} />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label className={styles.label}>Ciudad</Form.Label>
                        <Form.Control value={form.ciudad} onChange={e => setForm(f => ({ ...f, ciudad: e.target.value }))} disabled={!isAdmin} />
                      </Form.Group>
                    </Col>
                  </Row>
                  <Form.Group className="mb-3">
                    <Form.Label className={styles.label}>Teléfono</Form.Label>
                    <Form.Control value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} disabled={!isAdmin} />
                  </Form.Group>
                  {isAdmin && (
                    <Button type="submit" variant="success" disabled={saving}>
                      {saving ? <><Spinner size="sm" className="me-2" />Guardando...</> : 'Guardar cambios'}
                    </Button>
                  )}
                </Form>
              </Card.Body>
            </Card>
          </Col>

          {/* Equipo de la tienda */}
          <Col md={6}>
            <Card className={styles.card}>
              <Card.Header className={styles.cardHeader}>
                <strong>Equipo</strong>
                {isAdmin && (
                  <Button size="sm" variant="outline-success" className="ms-auto" onClick={() => setShowAddUser(true)}>
                    + Agregar
                  </Button>
                )}
              </Card.Header>
              <Card.Body className="p-0">
                {usuarios.length === 0 ? (
                  <p className={styles.emptySmall}>No hay usuarios asignados a esta tienda.</p>
                ) : (
                  <Table className={styles.table} hover size="sm">
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Cargo</th>
                        {isAdmin && <th></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {usuarios.map(u => (
                        <tr key={u.id}>
                          <td>
                            <strong>{u.name || u.userName || '—'}</strong>
                            <div className={styles.muted}>{u.email || u.userEmail}</div>
                          </td>
                          <td>
                            {u.esPropietario
                              ? <><Badge bg="success" className="me-1">Propietario</Badge></>
                              : <><Badge bg="secondary" className="me-1">Empleado</Badge></>}
                          </td>
                          {isAdmin && (
                            <td>
                              <Button size="sm" variant="outline-danger" onClick={() => handleRemoveUser(u.userId)}>✕</Button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Modal agregar usuario */}
      <Modal show={showAddUser} onHide={() => { setShowAddUser(false); setUserQuery(''); setSelectedUser(null); setUserResults([]); }}>
        <Modal.Header closeButton>
          <Modal.Title>Agregar usuario al equipo</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label className={styles.label}>Buscar tendero o vendedor</Form.Label>
            <div className={styles.searchWrapper}>
              <Form.Control
                placeholder="Nombre o email..."
                value={userQuery}
                onChange={e => searchUsers(e.target.value)}
                autoComplete="off"
              />
              {userResults.length > 0 && (
                <div className={styles.searchDropdown}>
                  {userResults.map(u => (
                    <div
                      key={u.id}
                      className={`${styles.searchItem} ${selectedUser?.id === u.id ? styles.selected : ''}`}
                      onClick={() => { setSelectedUser(u); setUserQuery(`${u.name} — ${u.email}`); setUserResults([]); }}
                    >
                      <strong>{u.name}</strong>{' '}
                      <span className="text-muted">— {u.email}</span>
                      <Badge bg="secondary" className="ms-2">{u.role}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Form.Group>
          <Form.Check
            type="switch"
            label="Es propietario (tendero dueño)"
            checked={esPropietario}
            onChange={e => setEsPropietario(e.target.checked)}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddUser(false)}>Cancelar</Button>
          <Button variant="success" onClick={handleAddUser} disabled={!selectedUser || addingUser}>
            {addingUser ? <Spinner size="sm" /> : 'Agregar'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default function TiendaPage() {
  return (
    <ProtectedRoute>
      <TiendaContent />
    </ProtectedRoute>
  );
}
