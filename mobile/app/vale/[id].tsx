import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, TextInput, RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { valesAPI } from '@/lib/api';
import { useAuthStore, isAdminRole, formatCOP } from '@/lib/store';

interface Abono {
  id: string;
  monto: number;
  notas?: string;
  fecha?: string;
  createdAt?: string;
  estado?: string;
  registradoPorNombre?: string;
}

interface Vale {
  id: string;
  clienteNombre?: string;
  clienteName?: string;
  tiendaNombre?: string;
  descripcion: string;
  montoTotal: number;
  saldoPendiente: number;
  estado: string;
  notas?: string;
  fecha?: string;
  createdAt?: string;
  fechaVencimiento?: string;
  registradoPorNombre?: string;
}

export default function ValeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const canAdmin = isAdminRole(user?.role);

  const [vale, setVale] = useState<Vale | null>(null);
  const [abonos, setAbonos] = useState<Abono[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showAbonoForm, setShowAbonoForm] = useState(false);
  const [abonoMonto, setAbonoMonto] = useState('');
  const [abonoNotas, setAbonoNotas] = useState('');
  const [savingAbono, setSavingAbono] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [vRes, aRes] = await Promise.all([
        valesAPI.getById(id),
        valesAPI.getAbonos(id),
      ]);
      const v: Vale = vRes?.data ?? vRes;
      const a: Abono[] = aRes?.data ?? aRes ?? [];
      setVale(v);
      setAbonos(a);
      navigation.setOptions({ title: v.clienteNombre ?? v.clienteName ?? 'Vale' });
    } catch {
      Alert.alert('Error', 'No se pudo cargar el vale.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleAnular = () => {
    Alert.alert(
      'Anular vale',
      '¿Estás seguro de que deseas anular este vale? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Anular',
          style: 'destructive',
          onPress: async () => {
            try {
              await valesAPI.anular(id!);
              await load();
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.message ?? 'No se pudo anular.');
            }
          },
        },
      ]
    );
  };

  const handleRegistrarAbono = async () => {
    const monto = parseFloat(abonoMonto.replace(/[^0-9.]/g, ''));
    if (!monto || monto <= 0) return Alert.alert('Error', 'Ingresa un monto válido.');
    setSavingAbono(true);
    try {
      const res = await valesAPI.registrarAbono(id!, monto, abonoNotas.trim() || undefined);
      if (res?.status == 'success') {
        setShowAbonoForm(false);
        setAbonoMonto('');
        setAbonoNotas('');
        await load();
        Alert.alert('Abono registrado', `Abono de ${formatCOP(monto)} registrado correctamente.`);
      } else {
        Alert.alert('Error', res?.message ?? 'No se pudo registrar el abono.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'Error al registrar abono.');
    } finally {
      setSavingAbono(false);
    }
  };

  const handleAnularAbono = (abono: Abono) => {
    Alert.alert('Anular abono', `¿Anular este abono de ${formatCOP(abono.monto)}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Anular',
        style: 'destructive',
        onPress: async () => {
          try {
            await valesAPI.anularAbono(id!, abono.id);
            await load();
          } catch {
            Alert.alert('Error', 'No se pudo anular el abono.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#3b82f6" /></View>;
  }
  if (!vale) {
    return <View style={styles.center}><Text style={styles.errorText}>Vale no encontrado.</Text></View>;
  }

  const isVencido = vale.estado === 'activo' && vale.fechaVencimiento && new Date(vale.fechaVencimiento) < new Date();
  const estadoColor = vale.estado === 'anulado' ? '#6b7280' : isVencido ? '#ef4444' : '#10b981';
  const estadoLabel = vale.estado === 'anulado' ? 'Anulado' : isVencido ? 'Vencido' : 'Activo';
  const canRegisterAbono = vale.estado === 'activo' && Number(vale.saldoPendiente) > 0;
  const canAnular = vale.estado === 'activo' && canAdmin;
  const abonosActivos = abonos.filter(a => a.estado !== 'anulado');

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#3b82f6" />}
    >
      {/* Header card */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <Text style={styles.clienteName}>{vale.clienteNombre ?? vale.clienteName}</Text>
          <View style={[styles.estadoBadge, { backgroundColor: estadoColor + '20' }]}>
            <Text style={[styles.estadoText, { color: estadoColor }]}>{estadoLabel}</Text>
          </View>
        </View>
        {vale.tiendaNombre && <Text style={styles.tiendaName}>📍 {vale.tiendaNombre}</Text>}
        <Text style={styles.descripcion}>{vale.descripcion}</Text>
        {vale.notas ? <Text style={styles.notasText}>📝 {vale.notas}</Text> : null}

        <View style={styles.amountRow}>
          <AmountBox label="Total" value={formatCOP(vale.montoTotal)} />
          <AmountBox label="Abonado" value={formatCOP(Number(vale.montoTotal) - Number(vale.saldoPendiente))} />
          <AmountBox label="Pendiente" value={formatCOP(vale.saldoPendiente)} color={Number(vale.saldoPendiente) > 0 ? '#ef4444' : '#10b981'} />
        </View>

        {vale.fechaVencimiento && (
          <Text style={[styles.fechaVenc, isVencido && { color: '#ef4444' }]}>
            {isVencido ? '⚠️ Vencido:' : '📅 Vence:'} {new Date(vale.fechaVencimiento).toLocaleDateString('es-CO')}
          </Text>
        )}
        {vale.registradoPorNombre && <Text style={styles.meta}>Registrado por {vale.registradoPorNombre}</Text>}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {canRegisterAbono && (
          <TouchableOpacity style={styles.abonoBtn} onPress={() => setShowAbonoForm(!showAbonoForm)} activeOpacity={0.8}>
            <Text style={styles.abonoBtnText}>{showAbonoForm ? '× Cancelar' : '+ Registrar abono'}</Text>
          </TouchableOpacity>
        )}
        {canAnular && (
          <TouchableOpacity style={styles.anularBtn} onPress={handleAnular} activeOpacity={0.8}>
            <Text style={styles.anularBtnText}>Anular vale</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Abono form */}
      {showAbonoForm && (
        <View style={styles.abonoForm}>
          <Text style={styles.sectionTitle}>Nuevo abono</Text>
          <TextInput
            style={styles.input}
            value={abonoMonto}
            onChangeText={setAbonoMonto}
            keyboardType="numeric"
            placeholder={`Monto (máx. ${formatCOP(vale.saldoPendiente)})`}
            placeholderTextColor="#9ca3af"
          />
          <TextInput
            style={styles.input}
            value={abonoNotas}
            onChangeText={setAbonoNotas}
            placeholder="Notas (opcional)"
            placeholderTextColor="#9ca3af"
          />
          <TouchableOpacity
            style={[styles.submitAbono, savingAbono && { opacity: 0.6 }]}
            onPress={handleRegistrarAbono}
            disabled={savingAbono}
          >
            {savingAbono
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.submitAbonoText}>✓ Guardar abono</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      {/* Abonos list */}
      <Text style={styles.sectionTitle}>
        Abonos ({abonosActivos.length})
      </Text>
      {abonos.length === 0
        ? <Text style={styles.noAbonos}>Sin abonos registrados</Text>
        : abonos.map((a) => (
          <View key={a.id} style={[styles.abonoCard, a.estado === 'anulado' && styles.abonoAnulado]}>
            <View style={styles.abonoRow}>
              <View>
                <Text style={[styles.abonoMonto, a.estado === 'anulado' && styles.lineThrough]}>
                  {formatCOP(a.monto)}
                </Text>
                {a.estado === 'anulado' && <Text style={styles.anuladoTag}>Anulado</Text>}
                {a.notas ? <Text style={styles.abonoNotas}>{a.notas}</Text> : null}
                <Text style={styles.abonoFecha}>
                  {new Date(a.fecha ?? a.createdAt ?? '').toLocaleDateString('es-CO')}
                  {a.registradoPorNombre ? `  ·  ${a.registradoPorNombre}` : ''}
                </Text>
              </View>
              {canAdmin && a.estado !== 'anulado' && (
                <TouchableOpacity onPress={() => handleAnularAbono(a)} style={styles.abonoAnularBtn}>
                  <Text style={styles.abonoAnularText}>Anular</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))
      }
    </ScrollView>
  );
}

function AmountBox({ label, value, color = '#111827' }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.amountBox}>
      <Text style={styles.amountLabel}>{label}</Text>
      <Text style={[styles.amountValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },
  container: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#6b7280', fontSize: 15 },

  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  clienteName: { fontSize: 18, fontWeight: '800', color: '#111827', flex: 1, marginRight: 8 },
  estadoBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  estadoText: { fontSize: 12, fontWeight: '700' },
  tiendaName: { fontSize: 12, color: '#6b7280', marginBottom: 6 },
  descripcion: { fontSize: 15, color: '#374151', fontWeight: '500', marginBottom: 4 },
  notasText: { fontSize: 13, color: '#6b7280', marginBottom: 8 },
  amountRow: { flexDirection: 'row', gap: 8, marginTop: 14, borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 14 },
  amountBox: { flex: 1, alignItems: 'center' },
  amountLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '500', marginBottom: 3 },
  amountValue: { fontSize: 16, fontWeight: '800' },
  fechaVenc: { fontSize: 13, color: '#6b7280', marginTop: 10 },
  meta: { fontSize: 12, color: '#9ca3af', marginTop: 4 },

  actions: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  abonoBtn: {
    flex: 1,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 13,
    alignItems: 'center',
  },
  abonoBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  anularBtn: {
    flex: 1,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  anularBtnText: { color: '#ef4444', fontWeight: '700', fontSize: 14 },

  abonoForm: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#dbeafe',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 11,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fafafa',
    marginBottom: 10,
  },
  submitAbono: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  submitAbonoText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#6b7280', marginBottom: 10, marginTop: 4, letterSpacing: 0.3 },
  noAbonos: { color: '#9ca3af', fontSize: 14, textAlign: 'center', paddingVertical: 24 },
  abonoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 13,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  abonoAnulado: { opacity: 0.6 },
  abonoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  abonoMonto: { fontSize: 17, fontWeight: '700', color: '#10b981' },
  lineThrough: { textDecorationLine: 'line-through', color: '#9ca3af' },
  anuladoTag: { fontSize: 11, color: '#ef4444', fontWeight: '600', marginTop: 2 },
  abonoNotas: { fontSize: 12, color: '#6b7280', marginTop: 3 },
  abonoFecha: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  abonoAnularBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  abonoAnularText: { fontSize: 12, color: '#ef4444', fontWeight: '600' },
});
