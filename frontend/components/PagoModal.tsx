'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Form, Alert, Spinner, Table, Badge } from 'react-bootstrap';
import { valesAPI } from '@/lib/api';

export interface ValeActivo {
  id: string;
  tiendaNombre?: string;
  descripcion: string;
  montoTotal: number;
  saldoPendiente: number;
  fechaVale: string;
  fechaVencimiento?: string;
  estado: string;
}

interface Props {
  show: boolean;
  onHide: () => void;
  clienteId: string;
  clienteNombre: string;
  vales: ValeActivo[];
  onPagoCorrecto: (valesActualizados: any[]) => void;
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}
function fmtDate(s?: string) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PagoModal({ show, onHide, clienteId, clienteNombre, vales, onPagoCorrecto }: Props) {
  // Solo vales activos, ordenados más viejo primero (mismo orden que el backend aplicará)
  const valesOrdenados = useMemo(
    () => [...vales]
      .filter(v => ['pendiente', 'parcial'].includes(v.estado))
      .sort((a, b) => new Date(a.fechaVale).getTime() - new Date(b.fechaVale).getTime()),
    [vales]
  );

  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [monto, setMonto] = useState('');   // valor numérico crudo (sin formato)

  // Convierte "$ 20.000" → "20000" al escribir
  function handleMontoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^\d]/g, '');
    setMonto(raw);
  }

  const montoFormatted = monto
    ? '$ ' + parseInt(monto, 10).toLocaleString('es-CO')
    : '';
  const [notas, setNotas] = useState('');
  const [registrando, setRegistrando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  // Al abrir, seleccionar todos por defecto
  useEffect(() => {
    if (show) {
      setSeleccionados(new Set(valesOrdenados.map(v => v.id)));
      setMonto('');
      setNotas('');
      setError('');
      setExito('');
    }
  }, [show, valesOrdenados]);

  const valesSeleccionados = valesOrdenados.filter(v => seleccionados.has(v.id));
  const totalSeleccionado = valesSeleccionados.reduce((s, v) => s + parseFloat(String(v.saldoPendiente)), 0);
  const minSugerido = valesSeleccionados.length > 0 ? parseFloat(String(valesSeleccionados[0].saldoPendiente)) : 0;
  const montoNum = parseFloat(monto) || 0;

  // Preview de distribución
  const preview = useMemo(() => {
    if (montoNum <= 0 || valesSeleccionados.length === 0) return [];
    let restante = montoNum;
    return valesSeleccionados.map(v => {
      const saldo = parseFloat(String(v.saldoPendiente));
      const aplicado = Math.min(restante, saldo);
      restante = Math.max(0, restante - saldo);
      return { ...v, aplicado, quedaPendiente: Math.max(0, saldo - aplicado) };
    });
  }, [montoNum, valesSeleccionados]);

  function toggleVale(id: string) {
    setSeleccionados(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setMonto(''); // recalcular monto al cambiar selección
  }

  async function handlePagar(e: React.FormEvent) {
    e.preventDefault();
    if (montoNum <= 0) return setError('Ingresa un monto válido.');
    if (valesSeleccionados.length === 0) return setError('Selecciona al menos un crédito.');
    if (montoNum > totalSeleccionado + 0.01)
      return setError(`El monto supera el total seleccionado (${fmt(totalSeleccionado)}).`);

    setRegistrando(true);
    setError('');
    try {
      const res = await valesAPI.pagoIntegral({
        clienteId,
        monto: montoNum,
        valeIds: valesSeleccionados.map(v => v.id),
      });
      setExito(res.message || `Pago de ${fmt(montoNum)} aplicado correctamente.`);
      onPagoCorrecto(res.vales || []);
      setMonto('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al registrar el pago.');
    } finally {
      setRegistrando(false);
    }
  }

  const hoy = new Date();

  return (
    <Modal show={show} onHide={onHide} size="lg" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>💳 Pago integral — {clienteNombre}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
        {exito && <Alert variant="success">{exito}</Alert>}

        {valesOrdenados.length === 0 ? (
          <Alert variant="info">Este cliente no tiene créditos activos.</Alert>
        ) : (
          <Form onSubmit={handlePagar}>
            {/* Selección de créditos */}
            <h6 className="mb-2 text-muted" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Créditos a incluir
            </h6>
            <Table size="sm" hover className="mb-3" style={{ fontSize: '0.9rem' }}>
              <thead style={{ background: '#f9fafb' }}>
                <tr>
                  <th style={{ width: 36 }}>
                    <Form.Check
                      checked={seleccionados.size === valesOrdenados.length}
                      onChange={e => setSeleccionados(e.target.checked ? new Set(valesOrdenados.map(v => v.id)) : new Set())}
                    />
                  </th>
                  <th>Descripción</th>
                  <th className="text-end">Pendiente</th>
                  <th>Vence</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {valesOrdenados.map((v, i) => {
                  const enMora = v.fechaVencimiento && new Date(v.fechaVencimiento) < hoy;
                  return (
                    <tr key={v.id} onClick={() => toggleVale(v.id)} style={{ cursor: 'pointer' }}>
                      <td><Form.Check checked={seleccionados.has(v.id)} onChange={() => toggleVale(v.id)} onClick={e => e.stopPropagation()} /></td>
                      <td>
                        <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>#{i + 1} · {fmtDate(v.fechaVale)}{v.tiendaNombre ? ` · ${v.tiendaNombre}` : ''}</span>
                        <div>{v.descripcion}</div>
                      </td>
                      <td className="text-end fw-bold">{fmt(parseFloat(String(v.saldoPendiente)))}</td>
                      <td style={{ color: enMora ? '#dc2626' : undefined }}>{fmtDate(v.fechaVencimiento)}</td>
                      <td>
                        <Badge bg={v.estado === 'pendiente' ? 'warning' : 'info'} text={v.estado === 'pendiente' ? 'dark' : undefined}>
                          {v.estado === 'pendiente' ? 'Pendiente' : 'Parcial'}
                        </Badge>
                        {enMora && <Badge bg="danger" className="ms-1">Mora</Badge>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>

            {/* Resumen selección */}
            <div className="d-flex justify-content-between mb-3 p-2 rounded" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <span style={{ fontSize: '0.9rem' }}>
                {valesSeleccionados.length} crédito{valesSeleccionados.length !== 1 ? 's' : ''} seleccionado{valesSeleccionados.length !== 1 ? 's' : ''}
              </span>
              <span className="fw-bold">Total: {fmt(totalSeleccionado)}</span>
            </div>

            {/* Monto */}
            <h6 className="mb-2 text-muted" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Monto a pagar
            </h6>
            <div className="d-flex gap-2 mb-2">
              <Button
                size="sm" variant="outline-secondary"
                onClick={() => setMonto(String(Math.round(minSugerido)))}
                disabled={minSugerido <= 0}

                title="Saldo del crédito más antiguo"
              >
                Mínimo {minSugerido > 0 ? `(${fmt(minSugerido)})` : ''}
              </Button>
              <Button
                size="sm" variant="outline-success"
                onClick={() => setMonto(String(Math.round(totalSeleccionado)))}
                disabled={totalSeleccionado <= 0}
              >
                Total {totalSeleccionado > 0 ? `(${fmt(totalSeleccionado)})` : ''}
              </Button>
            </div>
            <Form.Control
              type="text"
              inputMode="numeric"
              placeholder="$ 0"
              value={montoFormatted}
              onChange={handleMontoChange}
              required
              className="mb-3"
              style={{ fontSize: '1.1rem', fontWeight: 600 }}
            />

            {/* Preview de distribución */}
            {montoNum > 0 && preview.length > 0 && (
              <>
                <h6 className="mb-2 text-muted" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Distribución del pago
                </h6>
                <Table size="sm" className="mb-3" style={{ fontSize: '0.88rem' }}>
                  <thead style={{ background: '#f9fafb' }}>
                    <tr>
                      <th>Crédito</th>
                      <th className="text-end">Saldo actual</th>
                      <th className="text-end text-success">Se abona</th>
                      <th className="text-end">Queda</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map(p => (
                      <tr key={p.id}>
                        <td>{p.descripcion}</td>
                        <td className="text-end">{fmt(parseFloat(String(p.saldoPendiente)))}</td>
                        <td className="text-end text-success fw-bold">{p.aplicado > 0 ? fmt(p.aplicado) : '—'}</td>
                        <td className="text-end" style={{ color: p.quedaPendiente > 0 ? '#d97706' : '#059669' }}>
                          {p.quedaPendiente > 0 ? fmt(p.quedaPendiente) : '✓ Pagado'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                {montoNum > totalSeleccionado + 0.01 && (
                  <Alert variant="warning" className="py-2">
                    El monto supera el total seleccionado de {fmt(totalSeleccionado)}.
                  </Alert>
                )}
              </>
            )}

            <div className="d-grid mt-2">
              <Button
                type="submit"
                variant="success"
                size="lg"
                disabled={registrando || valesSeleccionados.length === 0 || montoNum <= 0 || exito !== ''}
              >
                {registrando
                  ? <><Spinner size="sm" className="me-2" />Registrando...</>
                  : `Registrar pago de ${montoNum > 0 ? fmt(montoNum) : '...'}`}
              </Button>
            </div>
          </Form>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Cerrar</Button>
      </Modal.Footer>
    </Modal>
  );
}
