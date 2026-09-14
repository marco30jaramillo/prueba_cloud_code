import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, TextInput,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { valesAPI, tiendasAPI } from '@/lib/api';
import { useAuthStore, isAdminRole, formatCOP } from '@/lib/store';

interface Vale {
  id: string;
  clienteNombre?: string;
  clienteName?: string;
  descripcion: string;
  montoTotal: number;
  saldoPendiente: number;
  estado: string;
  tiendaNombre?: string;
  fecha?: string;
  createdAt?: string;
  fechaVencimiento?: string;
}

type TabFilter = 'activos' | 'todos';

export default function ValesScreen() {
  const [vales, setVales] = useState<Vale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<TabFilter>('activos');
  const { user } = useAuthStore();
  const router = useRouter();
  const canAdmin = isAdminRole(user?.role);

  const loadVales = useCallback(async () => {
    try {
      let list: Vale[] = [];
      if (canAdmin) {
        const tiRes = await tiendasAPI.getMisTiendas();
        const tiendas: any[] = tiRes?.data ?? [];
        if (tiendas.length > 0) {
          const vRes = await valesAPI.getCartera(tiendas[0].id);
          list = vRes?.data ?? [];
        }
      } else {
        const vRes = await valesAPI.getMisVales();
        list = vRes?.data ?? [];
      }
      setVales(list);
    } catch {
      setVales([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [canAdmin]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadVales();
    }, [loadVales])
  );

  const filtered = vales.filter((v) => {
    const name = (v.clienteNombre || v.clienteName || '').toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || v.descripcion?.toLowerCase().includes(search.toLowerCase());
    const matchTab = tab === 'todos' || v.estado === 'activo';
    return matchSearch && matchTab;
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color="#9ca3af" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por cliente o descripción…"
          placeholderTextColor="#9ca3af"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Tab filter */}
      <View style={styles.tabRow}>
        {(['activos', 'todos'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>
              {t === 'activos' ? '🟢 Activos' : 'Todos'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ValeCard vale={item} onPress={() => router.push(`/vale/${item.id}`)} />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadVales(); }}
            tintColor="#3b82f6"
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>
              {search ? 'Sin resultados' : 'No hay vales'}
            </Text>
          </View>
        }
        contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/vale-nuevo')} activeOpacity={0.85}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

function ValeCard({ vale, onPress }: { vale: Vale; onPress: () => void }) {
  const name = vale.clienteNombre || vale.clienteName || 'Cliente';
  const isVencido = vale.estado === 'activo' && vale.fechaVencimiento && new Date(vale.fechaVencimiento) < new Date();
  const badgeColor = vale.estado === 'anulado' ? '#6b7280' : isVencido ? '#ef4444' : '#10b981';
  const badgeLabel = vale.estado === 'anulado' ? 'Anulado' : isVencido ? 'Vencido' : 'Activo';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardRow}>
        <Text style={styles.clienteName} numberOfLines={1}>{name}</Text>
        <View style={[styles.badge, { backgroundColor: badgeColor + '20' }]}>
          <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeLabel}</Text>
        </View>
      </View>
      {vale.tiendaNombre && <Text style={styles.tienda}>{vale.tiendaNombre}</Text>}
      <Text style={styles.desc} numberOfLines={1}>{vale.descripcion}</Text>
      <View style={styles.amounts}>
        <View>
          <Text style={styles.amountLabel}>Total</Text>
          <Text style={styles.amountValue}>{formatCOP(vale.montoTotal)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.amountLabel}>Pendiente</Text>
          <Text style={[styles.amountValue, { color: Number(vale.saldoPendiente) > 0 ? '#ef4444' : '#10b981' }]}>
            {formatCOP(vale.saldoPendiente)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    padding: 3,
  },
  tabBtn: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#fff' },
  tabLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  tabLabelActive: { color: '#111827', fontWeight: '700' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  clienteName: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  tienda: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  desc: { fontSize: 13, color: '#6b7280', marginBottom: 10 },
  amounts: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 8 },
  amountLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '500', marginBottom: 2 },
  amountValue: { fontSize: 16, fontWeight: '700', color: '#111827' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#9ca3af', fontSize: 16 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
});
