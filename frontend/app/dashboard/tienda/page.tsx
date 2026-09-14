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
  logo?: string;
  isActive: boolean;
}

interface TiendaUsuario {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  esPropietario: boolean;
  assignedAt: string;
}

interface UserResult { id: string; name: string; email: string; role: string; }

function TiendaContent() {
  const { user } = useAuthStore();
  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [tiendaId, setTiendaId] = useState('');
  const [tienda, setTienda] = useState<Tienda | null>(null);
  const [usuarios, setUsuarios] = useState<TiendaUsuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({ nombre: '', descripcion: '', direccion: '', ciudad: '', telefono: '' });

  // Modal agregar usuario
  const [showAddUser, setShowAddUser] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const [esPropietario, setEsPropietario] = useState(false);
  const [addingUser, setAddingUser] = useState(false);

  const isAdmin = user?.role === 'superuser' || user?.role === 'administrador';

  // Modal crear tienda
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ nombre: '', descripcion: '', direccion: '', ciudad: 'Cartagena', telefono: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadTiendas(); }, []);
  useEffect(() => { if (tiendaId) loadTienda(tiendaId); }, [tiendaId]);

  async function loadTiendas() {
    try {
      const res = isAdmin ? await tiendasAPI.getAll() : await tiendasAPI.getMisTiendas();
      const list: Tienda[] = res.tiendas || [];
      setTiendas(list);
      if (list.length > 0) setTiendaId(list[0].id);
    } catch {
      setError('No se pudieron cargar las tiendas.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.nombre.trim()) return;
    setCreating(true);
    setError('');
    try {
      const res = await tiendasAPI.create(createForm);
      const nueva = res.tienda as Tienda;
      setTiendas(prev => [...prev, nueva]);
      setTiendaId(nueva.id);
      setShowCreate(false);
      setCreateForm({ nombre: '', descripcion: '', direccion: '', ciudad: 'Cartagena', telefono: '' });
      setSuccess(`Tienda "${nueva.nombre}" creada exitosamente.`);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al crear la tienda.');
    } finally {
      setCreating(false);
    }
  }

  async function loadTienda(id: string) {
    setLoading(true);
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
      setError('Error al cargar la tienda.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!tiendaId) return;
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const res = await tiendasAPI.update(tiendaId, form);
      setTienda(res.tienda);
      setSuccess('Tienda actualizada correctamente.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al guardar.');
    } finally {
      setSaving(false);
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
    if (!selectedUser || !tiendaId) return;
    setAddingUser(true);
    setError('');
    try {
      await tiendasAPI.addUsuario(tiendaId, selectedUser.id, esPropietario);
      await loadTienda(tiendaId);
      setShowAddUser(false);
      setUserQuery('');
      setSelectedUser(null);
      setSuccess('Usuario agregado a la tienda.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al agregar usuario.');
    } finally {
      setAddingUser(false);
    }
  }

  async function handleRemoveUser(userId: string) {
    if (!confirm('¿Remover este usuario de la tienda?')) return;
    try {
      await tiendasAPI.removeUsuario(tiendaId, userId);
      setUsuarios(prev => prev.filter(u => u.userId !== userId));
      setSuccess('Usuario removido de la tienda.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al remover usuario.');
    }
  }

  if (loading && !tienda) {
    return (
      <Container className={styles.container}>
        <div className={styles.loadingCenter}><Spinner animation="border" variant="success" /></div>
      </Container>
    );
  }

  if (tiendas.length === 0 && !loading) {
    return (
      <Container className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>🏪 Tiendas</h1>
          {isAdmin && (
            <Button variant="success" onClick={() => setShowCreate(true)}>+ Nueva Tienda</Button>
          )}
        </div>
        {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
        <Alert variant={isAdmin ? 'info' : 'warning'}>
          {isAdmin ? 'No hay tiendas registradas. Crea la primera.' : 'No tienes tiendas asignadas.'}
        </Alert>
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

  return (
    <Container className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>🏪 {isAdmin ? 'Tiendas' : 'Mi Tienda'}</h1>
          <p className={styles.subtitle}>Configura la información y el equipo de tu tienda</p>
        </div>
        {isAdmin && (
          <Button variant="success" onClick={() => setShowCreate(true)}>+ Nueva Tienda</Button>
        )}
      </div>

      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {/* Selector tienda */}
      {tiendas.length > 1 && (
        <Form.Select className="mb-4" value={tiendaId} onChange={e => setTiendaId(e.target.value)}>
          {tiendas.map(t => <option key={t.id} value={t.id}>{t.nombre}{!t.isActive ? ' (inactiva)' : ''}</option>)}
        </Form.Select>
      )}

      <Row className="g-4">
        {/* Info tienda */}
        <Col md={6}>
          <Card className={styles.card}>
            <Card.Header className={styles.cardHeader}>
              <strong>Información de la tienda</strong>
              {tienda && (
                <Badge bg={tienda.isActive ? 'success' : 'secondary'} className="ms-2">
                  {tienda.isActive ? 'Activa' : 'Inactiva'}
                </Badge>
              )}
            </Card.Header>
            <Card.Body>
              {loading ? (
                <div className="text-center py-3"><Spinner size="sm" /></div>
              ) : (
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
              )}
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
                    <tr><th>Nombre</th><th>Rol</th><th>Cargo</th>{isAdmin && <th></th>}</tr>
                  </thead>
                  <tbody>
                    {usuarios.map(u => (
                      <tr key={u.id}>
                        <td>
                          <strong>{u.userName || '—'}</strong>
                          <div className={styles.email}>{u.userEmail}</div>
                        </td>
                        <td><Badge bg="secondary" className="text-capitalize">{u.esPropietario ? 'tendero' : 'vendedor'}</Badge></td>
                        <td>{u.esPropietario ? '🏪 Dueño' : '🛒 Empleado'}</td>
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

      {/* Modal agregar usuario */}
      <Modal show={showAddUser} onHide={() => { setShowAddUser(false); setUserQuery(''); setSelectedUser(null); setUserResults([]); }}>
        <Modal.Header closeButton>
          <Modal.Title>Agregar usuario a la tienda</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label className={styles.label}>Buscar tendero o vendedor</Form.Label>
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
                    <strong>{u.name}</strong> <span className="text-muted">— {u.email}</span>
                    <Badge bg="secondary" className="ms-2">{u.role}</Badge>
                  </div>
                ))}
              </div>
            )}
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
