'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import axios from 'axios';
import styles from './page.module.scss';

interface AuditLog {
  id: string;
  action: string;
  userId: string;
  targetUserId: string | null;
  ipAddress: string;
  timestamp: string;
  success: string | boolean;
  failureReason: string | null;
  details: string;
  method: string;
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

    const fetchData = async () => {
      try {
        const res = await axios.get('http://localhost:3001/audit/logs', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setLogs(res.data.logs || []);
        setError('');
      } catch (e: any) {
        setError('Error al cargar los logs');
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, token, isInitialized, router]);

  if (user?.role !== 'superuser') {
    return (
      <div className={styles.container}>
        <div className={styles.errorAlert}>{error}</div>
      </div>
    );
  }

  const filteredLogs = logs.filter(log => {
    if (filter === 'failed') return log.success === 'false' || log.success === false;
    if (filter === 'successful') return log.success === 'true' || log.success === true;
    return true;
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>📋 Auditoría del Sistema</h1>
        <p>Seguimiento completo de todas las acciones del sistema</p>
      </div>

      {error && <div className={styles.alert}>{error}</div>}

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
        <button className={styles.refreshBtn} onClick={() => window.location.reload()} disabled={loading}>
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
                <th>IP</th>
                <th>Timestamp</th>
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => (
                <tr key={log.id} className={log.success === 'false' || log.success === false ? styles.failed : ''}>
                  <td>{log.action}</td>
                  <td>{log.userId}</td>
                  <td>{log.ipAddress}</td>
                  <td>{new Date(log.timestamp).toLocaleString()}</td>
                  <td>{log.success === 'true' || log.success === true ? '✅' : '❌'}</td>
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
