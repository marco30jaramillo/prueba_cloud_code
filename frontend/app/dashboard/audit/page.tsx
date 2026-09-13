'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import styles from './page.module.scss';

interface AuditLog {
  id: string;
  action: string;
  userId: string;
  targetUserId: string | null;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  success: string | boolean;
  failureReason: string | null;
  details: string;
  method: string;
  duration: number;
}

export default function AuditPage() {
  const router = useRouter();
  const { user, token, isInitialized } = useAuthStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'failed' | 'successful'>('all');

  useEffect(() => {
    if (!isInitialized) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (user.role !== 'superuser') {
      setError('❌ Solo los superuser pueden acceder a este módulo');
      setLoading(false);
      return;
    }

    fetchLogs();
  }, [user, isInitialized, router]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/audit/logs');

      setLogs(response.data.logs || []);
      setError('');
    } catch (err: any) {
      console.error('Error fetching audit logs:', err);
      setError(err.response?.data?.message || 'Error al cargar los logs de auditoría');
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string): string => {
    const actionColors: Record<string, string> = {
      login: '#10b981',
      logout: '#6b7280',
      password_change: '#f59e0b',
      password_generated: '#f59e0b',
      password_reset_requested: '#f59e0b',
      profile_update: '#3b82f6',
      user_created: '#8b5cf6',
      user_enable: '#10b981',
      user_disable: '#ef4444',
      superuser_created: '#8b5cf6'
    };
    return actionColors[action] || '#6b7280';
  };

  const getActionLabel = (action: string): string => {
    const labels: Record<string, string> = {
      login: 'Inicio de Sesión',
      logout: 'Cierre de Sesión',
      password_change: 'Cambio de Contraseña',
      password_generated: 'Contraseña Generada',
      password_reset_requested: 'Recuperación Solicitada',
      profile_update: 'Actualización de Perfil',
      user_created: 'Usuario Creado',
      user_enable: 'Usuario Habilitado',
      user_disable: 'Usuario Deshabilitado',
      superuser_created: 'Superuser Creado'
    };
    return labels[action] || action;
  };

  const filteredLogs = logs.filter(log => {
    if (filter === 'failed') return log.success === 'false' || log.success === false;
    if (filter === 'successful') return log.success === 'true' || log.success === true;
    return true;
  });

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const truncateText = (text: string, maxLength: number = 30): string => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  if (user?.role !== 'superuser') {
    return (
      <div className={styles.container}>
        <div className={styles.errorAlert}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>📋 Auditoría del Sistema</h1>
        <p>Seguimiento completo de todas las acciones del sistema</p>
      </div>

      {error && (
        <div className={styles.alert}>
          {error}
        </div>
      )}

      <div className={styles.controls}>
        <div className={styles.filterGroup}>
          <label>Filtrar por:</label>
          <div className={styles.buttonGroup}>
            <button
              className={filter === 'all' ? styles.active : ''}
              onClick={() => setFilter('all')}
            >
              Todos ({logs.length})
            </button>
            <button
              className={filter === 'successful' ? styles.active : ''}
              onClick={() => setFilter('successful')}
            >
              Exitosos ({logs.filter(l => l.success === 'true' || l.success === true).length})
            </button>
            <button
              className={filter === 'failed' ? styles.active : ''}
              onClick={() => setFilter('failed')}
            >
              Fallidos ({logs.filter(l => l.success === 'false' || l.success === false).length})
            </button>
          </div>
        </div>
        <button className={styles.refreshBtn} onClick={fetchLogs} disabled={loading}>
          {loading ? '⏳ Cargando...' : '🔄 Actualizar'}
        </button>
      </div>

      <div className={styles.tableWrapper}>
        {loading ? (
          <div className={styles.loading}>Cargando registros de auditoría...</div>
        ) : filteredLogs.length === 0 ? (
          <div className={styles.empty}>No hay registros de auditoría</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Acción</th>
                <th>Usuario</th>
                <th>Usuario Afectado</th>
                <th>IP Address</th>
                <th>Timestamp</th>
                <th>Resultado</th>
                <th>Método</th>
                <th>Detalles</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => (
                <tr key={log.id} className={log.success === 'false' || log.success === false ? styles.failed : ''}>
                  <td>
                    <span
                      className={styles.actionBadge}
                      style={{ backgroundColor: getActionColor(log.action) }}
                    >
                      {getActionLabel(log.action)}
                    </span>
                  </td>
                  <td>{log.userId === 'unknown' ? '—' : truncateText(log.userId)}</td>
                  <td>{log.targetUserId ? truncateText(log.targetUserId) : '—'}</td>
                  <td className={styles.mono}>{log.ipAddress}</td>
                  <td className={styles.timestamp}>{formatTimestamp(log.timestamp)}</td>
                  <td>
                    {log.success === 'true' || log.success === true ? (
                      <span className={styles.success}>✅ Exitoso</span>
                    ) : (
                      <span className={styles.failure}>❌ Fallido</span>
                    )}
                  </td>
                  <td>
                    <span className={styles.method}>{log.method}</span>
                  </td>
                  <td title={log.failureReason || log.details || ''}>
                    {log.failureReason ? truncateText(log.failureReason) : truncateText(log.details || '—')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span>📊 Total de eventos:</span>
          <strong>{logs.length}</strong>
        </div>
        <div className={styles.stat}>
          <span>✅ Exitosos:</span>
          <strong>{logs.filter(l => l.success === 'true' || l.success === true).length}</strong>
        </div>
        <div className={styles.stat}>
          <span>❌ Fallidos:</span>
          <strong>{logs.filter(l => l.success === 'false' || l.success === false).length}</strong>
        </div>
      </div>
    </div>
  );
}
