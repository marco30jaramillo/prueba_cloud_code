import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, TextInput,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { valesAPI, tiendasAPI, pick } from '@/lib/api';
import { useAccesos, formatCOP } from '@/lib/store';
import { ETIQUETA_ESTADO, esCobrable, estadoVisible } from '@/lib/estado-vale';
import { colorEstado } from '@/lib/tema';

import { Icon } from '@/components/Icon';
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
  const router = useRouter();
  // Personal de la tienda (con módulo de cartera o de nuevo vale) ve los vales de su tienda;
  // el cliente, los suyos.
  const { valesDeTienda: canAdmin, nuevoVale: puedeCrear } = useAccesos();

  const loadVales = useCallback(async () => {
    try {
      let list: Vale[] = [];
      if (canAdmin) {
        const tiRes = await tiendasAPI.getMisTiendas();
        const tiendas: any[] = pick(tiRes, 'tiendas');
        if (tiendas.length > 0) {
          const vRes = await valesAPI.getCartera(tiendas[0].id);
          list = pick(vRes, 'vales');
        }
      } else {
        const vRes = await valesAPI.getMisVales();
        list = pick(vRes, 'vales');
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
    const matchTab = tab === 'todos' || esCobrable(v.estado);
    return matchSearch && matchTab;
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={{ marginRight: 8 }}><Icon name="buscar" size={16} color="#6b7280" /></View>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por cliente o descripción…"
          placeholderTextColor="#6b7280"
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
              {t === 'activos' ? 'Activos' : 'Todos'}
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
            tintColor="#2563eb"
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={{ marginBottom: 12 }}><Icon name="vale" size={48} color="#6b7280" /></View>
            <Text style={styles.emptyText}>
              {search ? 'Sin resultados' : 'No hay vales'}
            </Text>
          </View>
        }
        contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
      />

      {/* FAB */}
      {puedeCrear && (
        <TouchableOpacity style={styles.fab} onPress={() => router.push('/vale-nuevo')} activeOpacity={0.85}>
          <Icon name="agregar" size={30} color="#ffffff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

function ValeCard({ vale, onPress }: { vale: Vale; onPress: () => void }) {
  const name = vale.clienteNombre || vale.clienteName || 'Cliente';
  const estado = estadoVisible(vale.estado, vale.fechaVencimiento);
  const badgeColor = colorEstado[estado];
  const badgeLabel = ETIQUETA_ESTADO[estado];

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
          <Text style={[styles.amountValue, { color: Number(vale.saldoPendiente) > 0 ? '#dc2626' : '#059669' }]}>
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
    backgroundColor: '#ffffff',
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1f2937' },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    padding: 3,
  },
  tabBtn: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#ffffff' },
  tabLabel: { fontSize: 13, color: '#6b7280', fontFamily: 'PlusJakartaSans-SemiBold' },
  tabLabelActive: { color: '#1f2937', fontFamily: 'PlusJakartaSans-ExtraBold' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  clienteName: { fontSize: 15, fontFamily: 'PlusJakartaSans-ExtraBold', color: '#1f2937', flex: 1, marginRight: 8 },
  badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontFamily: 'PlusJakartaSans-SemiBold' },
  tienda: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  desc: { fontSize: 13, color: '#6b7280', marginBottom: 10 },
  amounts: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 8 },
  amountLabel: { fontSize: 11, color: '#6b7280', fontFamily: 'PlusJakartaSans-SemiBold', marginBottom: 2 },
  amountValue: { fontSize: 16, fontFamily: 'PlusJakartaSans-ExtraBold', color: '#1f2937' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#6b7280', fontSize: 16 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
});
