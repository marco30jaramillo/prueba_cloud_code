'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
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

function isSuccess(log: AuditEntry) {
  return log.success === 'true' || log.success === true;
}

function formatDate(ts: string): string {
  if (!ts) return '—';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  return d.toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

// ── Mapa de módulos ─────────────────────────────────────────────────────────
const MODULE_MAP: Record<string, { label: string; color: string }> = {
  login:                    { label: 'Sesión',   color: '#3b82f6' },
  logout:                   { label: 'Sesión',   color: '#3b82f6' },
  failed_login_attempt:     { label: 'Sesión',   color: '#ef4444' },
  password_change:          { label: 'Perfil',   color: '#8b5cf6' },
  password_generated:       { label: 'Perfil',   color: '#8b5cf6' },
  password_reset_requested: { label: 'Perfil',   color: '#8b5cf6' },
  profile_update:           { label: 'Perfil',   color: '#8b5cf6' },
  user_created:             { label: 'Usuarios', color: '#0ea5e9' },
  user_enable:              { label: 'Usuarios', color: '#0ea5e9' },
  user_disable:             { label: 'Usuarios', color: '#0ea5e9' },
  user_role_changed:        { label: 'Usuarios', color: '#0ea5e9' },
  superuser_created:        { label: 'Usuarios', color: '#0ea5e9' },
  role_created:             { label: 'Roles',    color: '#f59e0b' },
  role_permissions_updated: { label: 'Roles',    color: '#f59e0b' },
  role_modules_updated:     { label: 'Roles',    color: '#f59e0b' },
  vale_creado:              { label: 'Créditos', color: '#10b981' },
  vale_anulado:             { label: 'Créditos', color: '#10b981' },
  abono_creado:             { label: 'Créditos', color: '#10b981' },
  abono_anulado:            { label: 'Créditos', color: '#10b981' },
  pago_integral:            { label: 'Créditos', color: '#10b981' },
  tienda_creada:            { label: 'Tiendas',  color: '#f97316' },
  tienda_actualizada:       { label: 'Tiendas',  color: '#f97316' },
  tienda_habilitada:        { label: 'Tiendas',  color: '#f97316' },
  tienda_deshabilitada:     { label: 'Tiendas',  color: '#f97316' },
  tienda_usuario_agregado:  { label: 'Tiendas',  color: '#f97316' },
  tienda_usuario_removido:  { label: 'Tiendas',  color: '#f97316' },
};

const MODULES = ['Sesión', 'Perfil', 'Usuarios', 'Roles', 'Créditos', 'Tiendas', 'Sistema'];

function getModule(action: string) {
  return MODULE_MAP[action] ?? { label: 'Sistema', color: '#6b7280' };
}

function ActionBadge({ log }: { log: AuditEntry }) {
  const mod = getModule(log.action);
  return (
    <span className={styles.badgeWrap}>
      <span className={styles.modPill} style={{ background: mod.color }}>{mod.label}</span>
      <span className={styles.actionLabel}>{log.actionLabel || log.action || '—'}</span>
    </span>
  );
}

// ── Detalle expandible ───────────────────────────────────────────────────────
function DetailCell({ log }: { log: AuditEntry }) {
  const [open, setOpen] = useState(false);
  if (log.failureReason) {
    return <span className={styles.reason}>{log.failureReason}</span>;
  }
  if (!log.details || log.details === '{}') {
    return <span className={styles.na}>—</span>;
  }
  let parsed: Record<string, unknown> | null = null;
  try { parsed = JSON.parse(log.details); } catch { /* raw string */ }

  return (
    <span>
      <button className={styles.detailBtn} onClick={() => setOpen(o => !o)}>
        {open ? '▲ ocultar' : '▼ ver'}
      </button>
      {open && (
        <pre className={styles.detailPre}>
          {parsed ? JSON.stringify(parsed, null, 2) : log.details}
        </pre>
      )}
    </span>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
function AuditPageContent() {
  const { token } = useAuthStore();
  const [logs, setLogs]           = useState<AuditEntry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [showAdv, setShowAdv]     = useState(false);

  // Filtros
  const [search,       setSearch]       = useState('');
  const [result,       setResult]       = useState<'all' | 'ok' | 'fail'>('all');
  const [modFilter,    setModFilter]    = useState('');   // '' = todos
  const [actorSearch,  setActorSearch]  = useState('');
  const [ipFilter,     setIpFilter]     = useState('');
  const [dateFrom,     setDateFrom]     = useState('');
  const [dateTo,       setDateTo]       = useState('');

  const fetchLogs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const base = typeof window !== 'undefined' ? getBaseUrl() : 'http://localhost:3001';
      const res = await axios.get(`${base}/audit/logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLogs(res.data.logs || []);
      setError('');
    } catch (e: any) {
      setError('Error al cargar los registros: ' + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchLogs(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // IPs únicas para el datalist
  const uniqueIPs = useMemo(() =>
    Array.from(new Set(logs.map(l => l.ipAddress).filter(Boolean))).sort(),
  [logs]);

  // Actores únicos
  const uniqueActors = useMemo(() =>
    Array.from(new Map(
      logs.filter(l => l.actorEmail).map(l => [l.actorEmail, l.actorName || l.actorEmail])
    ).entries()),
  [logs]);

  const filtered = useMemo(() => {
    const q    = search.trim().toLowerCase();
    const aq   = actorSearch.trim().toLowerCase();
    const ipQ  = ipFilter.trim().toLowerCase();
    const from = dateFrom ? new Date(dateFrom + 'T00:00:00') : null;
    const to   = dateTo   ? new Date(dateTo   + 'T23:59:59') : null;

    return logs.filter(log => {
      // resultado
      if (result === 'ok'   && !isSuccess(log)) return false;
      if (result === 'fail' &&  isSuccess(log)) return false;
      // módulo
      if (modFilter && getModule(log.action).label !== modFilter) return false;
      // actor
      if (aq && !(log.actorEmail.toLowerCase().includes(aq) || log.actorName.toLowerCase().includes(aq))) return false;
      // IP
      if (ipQ && !log.ipAddress.toLowerCase().includes(ipQ)) return false;
      // rango de fechas
      if (from && new Date(log.timestamp) < from) return false;
      if (to   && new Date(log.timestamp) > to)   return false;
      // búsqueda de texto general
      if (q) {
        const hay = [log.actionLabel, log.action, log.actorEmail, log.actorName, log.targetEmail, log.ipAddress].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [logs, search, result, modFilter, actorSearch, ipFilter, dateFrom, dateTo]);

  // Conteo de filtros activos (excluyendo búsqueda y módulo que son visibles siempre)
  const advActiveCount = [actorSearch, ipFilter, dateFrom, dateTo].filter(Boolean).length;

  function clearAll() {
    setSearch(''); setResult('all'); setModFilter('');
    setActorSearch(''); setIpFilter(''); setDateFrom(''); setDateTo('');
  }

  const total    = logs.length;
  const totalOk  = logs.filter(isSuccess).length;
  const totalFail= total - totalOk;
  const hasFilters = !!(search || result !== 'all' || modFilter || actorSearch || ipFilter || dateFrom || dateTo);

  if (loading && logs.length === 0) {
    return <div className={styles.container}><div className={styles.loading}>Cargando registros de auditoría...</div></div>;
  }

  return (
    <div className={styles.container}>
      {/* ── Encabezado ── */}
      <div className={styles.header}>
        <div>
          <h1>📋 Auditoría del Sistema</h1>
          <p>Registro completo de todas las acciones y eventos</p>
        </div>
        <button className={styles.refreshBtn} onClick={fetchLogs} disabled={loading}>
          {loading ? '⏳' : '🔄'} Actualizar
        </button>
      </div>

      {error && <div className={styles.alert}>{error}</div>}

      {/* ── KPIs ── */}
      <div className={styles.stats}>
        <div className={styles.stat}><span>Total registros</span><strong>{total}</strong></div>
        <div className={`${styles.stat} ${styles.statOk}`}><span>Exitosos</span><strong>{totalOk}</strong></div>
        <div className={`${styles.stat} ${styles.statFail}`}><span>Fallidos</span><strong>{totalFail}</strong></div>
        <div className={`${styles.stat} ${styles.statFiltered}`}><span>Mostrando</span><strong>{filtered.length}</strong></div>
      </div>

      {/* ── Panel de filtros ── */}
      <div className={styles.filterPanel}>
        {/* Fila 1: búsqueda + resultado + limpiar */}
        <div className={styles.filterRow}>
          <div className={styles.searchBox}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              className={styles.searchInput}
              placeholder="Buscar por acción, email, nombre…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && <button className={styles.clearX} onClick={() => setSearch('')}>✕</button>}
          </div>

          <div className={styles.resultGroup}>
            {(['all', 'ok', 'fail'] as const).map(v => (
              <button
                key={v}
                className={`${styles.resultBtn} ${result === v ? styles.resultActive : ''} ${v === 'ok' ? styles.resultOk : v === 'fail' ? styles.resultFail : ''}`}
                onClick={() => setResult(v)}
              >
                {v === 'all' ? 'Todos' : v === 'ok' ? '✅ Exitosos' : '❌ Fallidos'}
              </button>
            ))}
          </div>

          <div className={styles.rightActions}>
            {hasFilters && (
              <button className={styles.clearAll} onClick={clearAll}>
                Limpiar filtros {advActiveCount + (modFilter ? 1 : 0) + (search ? 1 : 0) + (result !== 'all' ? 1 : 0) > 0 &&
                  <span className={styles.filterBadge}>{advActiveCount + (modFilter ? 1 : 0) + (search ? 1 : 0) + (result !== 'all' ? 1 : 0)}</span>}
              </button>
            )}
            <button
              className={`${styles.advBtn} ${showAdv ? styles.advBtnActive : ''}`}
              onClick={() => setShowAdv(o => !o)}
            >
              Filtros avanzados {advActiveCount > 0 && <span className={styles.filterBadge}>{advActiveCount}</span>}
              <span>{showAdv ? '▲' : '▼'}</span>
            </button>
          </div>
        </div>

        {/* Fila 2: módulos */}
        <div className={styles.modRow}>
          <button
            className={`${styles.modBtn} ${!modFilter ? styles.modBtnActive : ''}`}
            onClick={() => setModFilter('')}
          >
            Todos los módulos
          </button>
          {MODULES.map(m => {
            const color = Object.values(MODULE_MAP).find(x => x.label === m)?.color ?? '#6b7280';
            const active = modFilter === m;
            return (
              <button
                key={m}
                className={`${styles.modBtn} ${active ? styles.modBtnActive : ''}`}
                style={active ? { background: color, borderColor: color, color: '#fff' } : { '--mod-color': color } as React.CSSProperties}
                onClick={() => setModFilter(active ? '' : m)}
              >
                <span className={styles.modDot} style={{ background: color }} />
                {m}
              </button>
            );
          })}
        </div>

        {/* Fila 3: filtros avanzados */}
        {showAdv && (
          <div className={styles.advRow}>
            <label className={styles.advField}>
              <span>Actor / Usuario</span>
              <div className={styles.advInputWrap}>
                <input
                  list="actors-list"
                  className={styles.advInput}
                  placeholder="Nombre o email…"
                  value={actorSearch}
                  onChange={e => setActorSearch(e.target.value)}
                />
                {actorSearch && <button className={styles.clearX} onClick={() => setActorSearch('')}>✕</button>}
              </div>
              <datalist id="actors-list">
                {uniqueActors.map(([email, name]) => (
                  <option key={email} value={email}>{name}</option>
                ))}
              </datalist>
            </label>

            <label className={styles.advField}>
              <span>Dirección IP</span>
              <div className={styles.advInputWrap}>
                <input
                  list="ip-list"
                  className={styles.advInput}
                  placeholder="ej. 192.168.1.1"
                  value={ipFilter}
                  onChange={e => setIpFilter(e.target.value)}
                />
                {ipFilter && <button className={styles.clearX} onClick={() => setIpFilter('')}>✕</button>}
              </div>
              <datalist id="ip-list">
                {uniqueIPs.map(ip => <option key={ip} value={ip} />)}
              </datalist>
            </label>

            <label className={styles.advField}>
              <span>Desde</span>
              <input
                type="date"
                className={styles.advInput}
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                max={dateTo || undefined}
              />
            </label>

            <label className={styles.advField}>
              <span>Hasta</span>
              <input
                type="date"
                className={styles.advInput}
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                min={dateFrom || undefined}
              />
            </label>

            {(actorSearch || ipFilter || dateFrom || dateTo) && (
              <button
                className={styles.clearAll}
                onClick={() => { setActorSearch(''); setIpFilter(''); setDateFrom(''); setDateTo(''); }}
                style={{ alignSelf: 'flex-end' }}
              >
                Limpiar avanzados
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Tabla ── */}
      <div className={styles.tableWrapper}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <div>Sin registros que coincidan con los filtros</div>
            {hasFilters && <button className={styles.clearAll} onClick={clearAll} style={{ marginTop: '0.75rem' }}>Limpiar filtros</button>}
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 148 }}>Fecha y hora</th>
                <th style={{ width: 180 }}>Evento</th>
                <th>Actor</th>
                <th>Afectado</th>
                <th style={{ width: 130 }}>IP</th>
                <th style={{ width: 80 }}>Resultado</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(log => (
                <tr key={log.id} className={!isSuccess(log) ? styles.rowFailed : ''}>
                  <td className={styles.dateCell}>{formatDate(log.timestamp)}</td>
                  <td><ActionBadge log={log} /></td>
                  <td>
                    <div className={styles.userCell}>
                      {log.actorName && <strong>{log.actorName}</strong>}
                      <small>{log.actorEmail || log.actorId || '—'}</small>
                    </div>
                  </td>
                  <td>
                    {log.targetEmail && log.targetEmail !== log.actorEmail
                      ? <small className={styles.target}>{log.targetEmail}</small>
                      : <span className={styles.na}>—</span>}
                  </td>
                  <td><code className={styles.ip}>{log.ipAddress || '—'}</code></td>
                  <td className={styles.resultCell}>
                    {isSuccess(log)
                      ? <span className={styles.ok}>✓</span>
                      : <span className={styles.fail}>✗</span>}
                  </td>
                  <td><DetailCell log={log} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className={styles.footer}>
        Mostrando <strong>{filtered.length}</strong> de <strong>{total}</strong> registros
        {hasFilters && ' (filtrado)'}
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
