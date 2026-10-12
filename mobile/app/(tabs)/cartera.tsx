import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, ScrollView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { valesAPI, tiendasAPI } from '@/lib/api';
import { formatCOP } from '@/lib/store';

import { Icon } from '@/components/Icon';
interface Vale {
  id: string;
  clienteId: string;
  clienteNombre?: string;
  clienteName?: string;
  montoTotal: number;
  saldoPendiente: number;
  estado: string;
  fechaVencimiento?: string;
}

interface ClienteSummary {
  id: string;
  nombre: string;
  total: number;
  pendiente: number;
  valesActivos: number;
  valesVencidos: number;
}

interface KPI { label: string; value: string | number; color: string; bg: string }

export default function CarteraScreen() {
  const [clientes, setClientes] = useState<ClienteSummary[]>([]);
  const [tiendaNombre, setTiendaNombre] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [kpis, setKpis] = useState<KPI[]>([]);

  const load = useCallback(async () => {
    try {
      const tiRes = await tiendasAPI.getMisTiendas();
      const tiendas: any[] = tiRes?.data ?? [];
      if (tiendas.length === 0) {
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const tienda = tiendas[0];
      setTiendaNombre(tienda.nombre ?? tienda.name ?? '');

      const vRes = await valesAPI.getCartera(tienda.id);
      const vales: Vale[] = vRes?.data ?? [];

      // Aggregate per client
      const map = new Map<string, ClienteSummary>();
      for (const v of vales) {
        const cid = v.clienteId;
        const cname = v.clienteNombre || v.clienteName || 'Cliente';
        const isVencido = v.estado === 'activo' && v.fechaVencimiento && new Date(v.fechaVencimiento) < new Date();
        if (!map.has(cid)) {
          map.set(cid, { id: cid, nombre: cname, total: 0, pendiente: 0, valesActivos: 0, valesVencidos: 0 });
        }
        const c = map.get(cid)!;
        c.total += Number(v.montoTotal) || 0;
        c.pendiente += Number(v.saldoPendiente) || 0;
        if (v.estado === 'activo') c.valesActivos++;
        if (isVencido) c.valesVencidos++;
      }

      const sorted = [...map.values()].sort((a, b) => b.pendiente - a.pendiente);
      setClientes(sorted);

      const totalPendiente = sorted.reduce((s, c) => s + c.pendiente, 0);
      const totalActivos = vales.filter(v => v.estado === 'activo').length;
      const totalVencidos = vales.filter(v => v.estado === 'activo' && v.fechaVencimiento && new Date(v.fechaVencimiento) < new Date()).length;

      setKpis([
        { label: 'Por cobrar', value: formatCOP(totalPendiente), color: '#dc2626', bg: '#fee2e2' },
        { label: 'Vales activos', value: totalActivos, color: '#2563eb', bg: '#dbeafe' },
        { label: 'Vencidos', value: totalVencidos, color: '#d97706', bg: '#fef3c7' },
        { label: 'Clientes', value: sorted.length, color: '#2563eb', bg: '#dbeafe' },
      ]);
    } catch {
      setClientes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;
  }

  return (
    <FlatList
      data={clientes}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#2563eb" />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          {tiendaNombre ? <Text style={styles.tiendaName}>{tiendaNombre}</Text> : null}
          <Text style={styles.sectionTitle}>Indicadores</Text>
          <View style={styles.kpiGrid}>
            {kpis.map((k) => (
              <View key={k.label} style={[styles.kpiCard, { backgroundColor: k.bg }]}>
                <Text style={[styles.kpiValue, { color: k.color }]}>{k.value}</Text>
                <Text style={styles.kpiLabel}>{k.label}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.sectionTitle}>Clientes con deuda</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.clienteCard}>
          <View style={styles.clienteRow}>
            <Text style={styles.clienteNombre} numberOfLines={1}>{item.nombre}</Text>
            <Text style={styles.clientePendiente}>{formatCOP(item.pendiente)}</Text>
          </View>
          <View style={styles.clienteRow}>
            <Text style={styles.clienteMeta}>
              {item.valesActivos} vale{item.valesActivos !== 1 ? 's' : ''} activo{item.valesActivos !== 1 ? 's' : ''}
              {item.valesVencidos > 0 ? `  •  ${item.valesVencidos} vencido${item.valesVencidos !== 1 ? 's' : ''}` : ''}
            </Text>
            <Text style={styles.clienteMeta}>Total: {formatCOP(item.total)}</Text>
          </View>
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <View style={{ marginBottom: 12 }}><Icon name="cartera" size={40} color="#6b7280" /></View>
          <Text style={styles.emptyText}>No hay datos de cartera</Text>
        </View>
      }
      contentContainerStyle={{ paddingBottom: 32 }}
      style={styles.root}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 16 },
  tiendaName: { fontSize: 13, color: '#6b7280', fontFamily: 'PlusJakartaSans-SemiBold', marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans-ExtraBold', color: '#6b7280', marginBottom: 10, letterSpacing: 0.3 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  kpiCard: {
    width: '47%',
    borderRadius: 14,
    padding: 16,
    alignItems: 'flex-start',
  },
  kpiValue: { fontSize: 22, fontFamily: 'PlusJakartaSans-ExtraBold', marginBottom: 4 },
  kpiLabel: { fontSize: 12, color: '#6b7280', fontFamily: 'PlusJakartaSans-SemiBold' },
  clienteCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  clienteRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  clienteNombre: { fontSize: 15, fontFamily: 'PlusJakartaSans-ExtraBold', color: '#1f2937', flex: 1, marginRight: 8 },
  clientePendiente: { fontSize: 17, fontFamily: 'PlusJakartaSans-ExtraBold', color: '#dc2626' },
  clienteMeta: { fontSize: 12, color: '#6b7280' },
  empty: { padding: 48, alignItems: 'center' },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: '#6b7280', fontSize: 15 },
});
