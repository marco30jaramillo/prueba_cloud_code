import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  ActivityIndicator, Alert, TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { tiendasAPI, pick } from '@/lib/api';
import { useAuthStore, ROLE_LABEL } from '@/lib/store';

import { Icon } from '@/components/Icon';
interface Miembro {
  id: string;
  userId?: string;
  nombre?: string;
  name?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
  esPropietario?: boolean;
}

export default function EquipoScreen() {
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [tienda, setTienda] = useState<{ id: string; nombre: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'superuser' || user?.role === 'administrador';

  const load = useCallback(async () => {
    try {
      const tiRes = await tiendasAPI.getMisTiendas();
      const tiendas: any[] = pick(tiRes, 'tiendas');
      if (tiendas.length === 0) {
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const t = tiendas[0];
      setTienda({ id: t.id, nombre: t.nombre ?? t.name ?? 'Tienda' });

      const uRes = await tiendasAPI.getUsuarios(t.id);
      setMiembros(pick(uRes, 'usuarios'));
    } catch {
      setMiembros([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const handleRemove = (m: Miembro) => {
    if (!tienda) return;
    Alert.alert(
      'Quitar del equipo',
      `¿Quitar a ${m.nombre || m.name} del equipo?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Quitar',
          style: 'destructive',
          onPress: async () => {
            try {
              const uid = m.userId ?? m.id;
              await tiendasAPI.removeUsuario(tienda.id, uid);
              setMiembros((prev) => prev.filter((x) => (x.userId ?? x.id) !== uid));
            } catch {
              Alert.alert('Error', 'No pudimos quitar a la persona.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;
  }

  return (
    <View style={styles.root}>
      {tienda && <Text style={styles.tiendaLabel}>{tienda.nombre}</Text>}

      <FlatList
        data={miembros}
        keyExtractor={(item) => item.userId ?? item.id}
        renderItem={({ item }) => {
          const nombre = item.nombre || item.name || 'Usuario';
          const rol = item.role ?? '';
          const activo = item.isActive !== false;
          return (
            <View style={styles.card}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{nombre[0]?.toUpperCase()}</Text>
              </View>
              <View style={styles.info}>
                <View style={styles.nameRow}>
                  <Text style={styles.nombre} numberOfLines={1}>{nombre}</Text>
                  {item.esPropietario && <Text style={styles.ownerBadge}>Propietario</Text>}
                </View>
                <Text style={styles.email} numberOfLines={1}>{item.email ?? ''}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.rolBadge}>{ROLE_LABEL[rol] ?? rol}</Text>
                  <View style={[styles.statusDot, { backgroundColor: activo ? '#059669' : '#e5e7eb' }]} />
                  <Text style={styles.statusLabel}>{activo ? 'Activo' : 'Inactivo'}</Text>
                </View>
              </View>
              {isSuperAdmin && !item.esPropietario && (
                <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemove(item)}>
                  <Text style={styles.removeBtnText}>Quitar</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#2563eb" />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={{ marginBottom: 12 }}><Icon name="equipo" size={40} color="#6b7280" /></View>
            <Text style={styles.emptyText}>No hay miembros en el equipo</Text>
          </View>
        }
        contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tiendaLabel: { fontSize: 13, color: '#6b7280', fontFamily: 'PlusJakartaSans-SemiBold', padding: 16, paddingBottom: 0 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 18, fontFamily: 'PlusJakartaSans-ExtraBold', color: '#1e40af' },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nombre: { fontSize: 15, fontFamily: 'PlusJakartaSans-ExtraBold', color: '#1f2937', flex: 1 },
  ownerBadge: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    color: '#92400e',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  email: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 },
  rolBadge: { fontSize: 12, color: '#2563eb', fontFamily: 'PlusJakartaSans-SemiBold' },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusLabel: { fontSize: 12, color: '#6b7280' },
  removeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  removeBtnText: { fontSize: 12, color: '#dc2626', fontFamily: 'PlusJakartaSans-SemiBold' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: '#6b7280', fontSize: 15 },
});
