'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import axios from 'axios';
import { getBaseUrl } from '@/lib/image-url';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import styles from './page.module.scss';

interface AuditEntry {
  id: string;
  action: string;
  actionLabel: string;
  actorId: string;
  actorEmail: string;
  actorName: string;
  targetId: string;
  targetEmail: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  success: string | boolean;
  failureReason: string;
  details: string;
  method: string;
}

type Filter = 'all' | 'failed' | 'successful';

function isSuccess(log: AuditEntry) {
  return log.success === 'true' || log.success === true;
}

function formatDate(ts: string): string {
  if (!ts) return '—';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  return d.toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

function actionBadge(log: AuditEntry) {
  const label = log.actionLabel || log.action || '—';
  const ok = isSuccess(log);
  const color =
    log.action === 'failed_login_attempt' ? '#ef4444' :
    log.action === 'user_disable'          ? '#f97316' :
    log.action === 'user_enable'           ? '#10b981' :
    log.action === 'login'                 ? '#3b82f6' :
    log.action === 'logout'                ? '#6b7280' :
    log.action === 'password_change'       ? '#8b5cf6' :
    log.action === 'password_generated'    ? '#ec4899' :
    ok                                     ? '#10b981' : '#ef4444';

  return <span style={{ backgroundColor: color, color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{label}</span>;
}

function AuditPageContent() {
  const { user, token } = useAuthStore();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const fetchLogs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const base = typeof window !== 'undefined' ? getBaseUrl() : 'http://localhost:3001';
      const res = await axios.get(`${base}/audit/logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(res.data.logs || []);
      setError('');
    } catch (e: any) {
      setError('Error al cargar los registros de auditoría: ' + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLogs();
  // fetchLogs should not be in deps — calling it once on mount is enough
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && logs.length === 0) {
    return <div className={styles.container}><div className={styles.loading}>Cargando registros de auditoría...</div></div>;
  }

  const filtered = logs.filter(log => {
    const matchFilter =
      filter === 'all' ? true :
      filter === 'failed' ? !isSuccess(log) :
      isSuccess(log);

    if (!matchFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (log.actionLabel || '').toLowerCase().includes(q) ||
      (log.actorEmail || '').toLowerCase().includes(q) ||
      (log.actorName || '').toLowerCase().includes(q) ||
      (log.targetEmail || '').toLowerCase().includes(q) ||
      (log.ipAddress || '').includes(q)
    );
  });

  const total = logs.length;
  const totalOk = logs.filter(isSuccess).length;
  const totalFail = total - totalOk;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>📋 Auditoría del Sistema</h1>
          <p>Registro completo de todas las acciones y eventos del sistema</p>
        </div>
        <button className={styles.refreshBtn} onClick={fetchLogs} disabled={loading}>
          {loading ? '⏳' : '🔄'} Actualizar
        </button>
      </div>

      {error && <div className={styles.alert}>{error}</div>}

      <div className={styles.stats}>
        <div className={styles.stat}><span>📊 Total</span><strong>{total}</strong></div>
        <div className={styles.stat}><span>✅ Exitosos</span><strong>{totalOk}</strong></div>
        <div className={styles.stat}><span>❌ Fallidos</span><strong>{totalFail}</strong></div>
        <div className={styles.stat}><span>📄 Mostrando</span><strong>{filtered.length}</strong></div>
      </div>

      <div className={styles.controls}>
        <div className={styles.filterGroup}>
          <button className={filter === 'all'        ? styles.active : ''} onClick={() => setFilter('all')}>Todos</button>
          <button className={filter === 'successful' ? styles.active : ''} onClick={() => setFilter('successful')}>Exitosos</button>
          <button className={filter === 'failed'     ? styles.active : ''} onClick={() => setFilter('failed')}>Fallidos</button>
        </div>
        <input
          className={styles.searchInput}
          placeholder="Buscar por acción, email, IP..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.tableWrapper}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>No hay registros que coincidan con los filtros</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Fecha y Hora</th>
                <th>Evento</th>
                <th>Actor (quien actuó)</th>
                <th>Afectado</th>
                <th>IP</th>
                <th>Resultado</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(log => (
                <tr key={log.id} className={!isSuccess(log) ? styles.rowFailed : ''}>
                  <td className={styles.dateCell}>{formatDate(log.timestamp)}</td>
                  <td>{actionBadge(log)}</td>
                  <td>
                    <div className={styles.userCell}>
                      {log.actorName && <strong>{log.actorName}</strong>}
                      <small>{log.actorEmail || log.actorId || '—'}</small>
                    </div>
                  </td>
                  <td>
                    {log.targetEmail && log.targetEmail !== log.actorEmail
                      ? <small>{log.targetEmail}</small>
                      : <span className={styles.na}>—</span>
                    }
                  </td>
                  <td><code className={styles.ip}>{log.ipAddress || '—'}</code></td>
                  <td>{isSuccess(log) ? '✅' : '❌'}</td>
                  <td>
                    {log.failureReason
                      ? <span className={styles.reason}>{log.failureReason}</span>
                      : log.details && log.details !== '{}'
                        ? <span className={styles.details} title={log.details}>ℹ️</span>
                        : <span className={styles.na}>—</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function AuditPage() {
  return (
    <ProtectedRoute>
      <AuditPageContent />
    </ProtectedRoute>
  );
}
