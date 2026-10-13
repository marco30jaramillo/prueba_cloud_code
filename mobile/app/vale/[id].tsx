import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, TextInput, RefreshControl,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { valesAPI, pick } from '@/lib/api';
import { useAuthStore, usePermiso, formatCOP } from '@/lib/store';
import { ETIQUETA_ESTADO, esCobrable, estadoVisible } from '@/lib/estado-vale';
import { colorEstado } from '@/lib/tema';
import { avisar } from '@/lib/aviso';

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
  // Cada acción, según los permisos efectivos del rol (los mismos que revisa el servidor).
  const puedeAbonar = usePermiso('abono:crear');
  const puedeAnularVale = usePermiso('vale:anular');
  const puedeAnularAbono = usePermiso('abono:anular');

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
      const v: Vale = vRes?.vale ?? vRes?.data ?? vRes;
      const a: Abono[] = pick(aRes, 'abonos');
      setVale(v);
      setAbonos(a);
      navigation.setOptions({ title: v.clienteNombre ?? v.clienteName ?? 'Vale' });
    } catch {
      avisar('Error', 'No se pudo cargar el vale.', undefined, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleAnular = () => {
    avisar(
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
              avisar('Error', e?.response?.data?.message ?? 'No se pudo anular.', undefined, 'error');
            }
          },
        },
      ]
    );
  };

  const handleRegistrarAbono = async () => {
    const monto = parseFloat(abonoMonto.replace(/[^0-9.]/g, ''));
    if (!monto || monto <= 0) return avisar('Monto', 'Ingresa un monto válido.', undefined, 'aviso');
    setSavingAbono(true);
    try {
      const res = await valesAPI.registrarAbono(id!, monto, abonoNotas.trim() || undefined);
      if (res?.status == 'success') {
        setShowAbonoForm(false);
        setAbonoMonto('');
        setAbonoNotas('');
        await load();
        avisar('Abono registrado', `Abono de ${formatCOP(monto)} registrado correctamente.`, undefined, 'exito');
      } else {
        avisar('Error', res?.message ?? 'No se pudo registrar el abono.', undefined, 'error');
      }
    } catch (e: any) {
      avisar('Error', e?.response?.data?.message ?? 'Error al registrar abono.', undefined, 'error');
    } finally {
      setSavingAbono(false);
    }
  };

  const handleAnularAbono = (abono: Abono) => {
    avisar('Anular abono', `¿Anular este abono de ${formatCOP(abono.monto)}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Anular',
        style: 'destructive',
        onPress: async () => {
          try {
            await valesAPI.anularAbono(id!, abono.id);
            await load();
          } catch {
            avisar('Error', 'No se pudo anular el abono.', undefined, 'error');
          }
        },
      },
    ]);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;
  }
  if (!vale) {
    return <View style={styles.center}><Text style={styles.errorText}>Vale no encontrado.</Text></View>;
  }

  const estado = estadoVisible(vale.estado, vale.fechaVencimiento);
  const isVencido = estado === 'mora';
  const estadoColor = colorEstado[estado];
  const estadoLabel = ETIQUETA_ESTADO[estado];
  const canRegisterAbono = puedeAbonar && esCobrable(vale.estado) && Number(vale.saldoPendiente) > 0;
  const canAnular = esCobrable(vale.estado) && puedeAnularVale;
  const abonosActivos = abonos.filter(a => a.estado !== 'anulado');

  return (
    <KeyboardAwareScrollView
      style={styles.root}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      bottomOffset={24}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#2563eb" />}
    >
      {/* Header card */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <Text style={styles.clienteName}>{vale.clienteNombre ?? vale.clienteName}</Text>
          <View style={[styles.estadoBadge, { backgroundColor: estadoColor + '20' }]}>
            <Text style={[styles.estadoText, { color: estadoColor }]}>{estadoLabel}</Text>
          </View>
        </View>
        {vale.tiendaNombre && <Text style={styles.tiendaName}>{vale.tiendaNombre}</Text>}
        <Text style={styles.descripcion}>{vale.descripcion}</Text>
        {vale.notas ? <Text style={styles.notasText}>{vale.notas}</Text> : null}

        <View style={styles.amountRow}>
          <AmountBox label="Total" value={formatCOP(vale.montoTotal)} />
          <AmountBox label="Abonado" value={formatCOP(Number(vale.montoTotal) - Number(vale.saldoPendiente))} />
          <AmountBox label="Pendiente" value={formatCOP(vale.saldoPendiente)} color={Number(vale.saldoPendiente) > 0 ? '#dc2626' : '#059669'} />
        </View>

        {vale.fechaVencimiento && (
          <Text style={[styles.fechaVenc, isVencido && { color: '#dc2626' }]}>
            {isVencido ? 'Vencido:' : 'Vence:'} {new Date(vale.fechaVencimiento).toLocaleDateString('es-CO')}
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
            placeholderTextColor="#6b7280"
          />
          <TextInput
            style={styles.input}
            value={abonoNotas}
            onChangeText={setAbonoNotas}
            placeholder="Notas (opcional)"
            placeholderTextColor="#6b7280"
          />
          <TouchableOpacity
            style={[styles.submitAbono, savingAbono && { opacity: 0.6 }]}
            onPress={handleRegistrarAbono}
            disabled={savingAbono}
          >
            {savingAbono
              ? <ActivityIndicator color="#ffffff" size="small" />
              : <Text style={styles.submitAbonoText}>Guardar abono</Text>
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
              {puedeAnularAbono && a.estado !== 'anulado' && (
                <TouchableOpacity onPress={() => handleAnularAbono(a)} style={styles.abonoAnularBtn}>
                  <Text style={styles.abonoAnularText}>Anular</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))
      }
    </KeyboardAwareScrollView>
  );
}

function AmountBox({ label, value, color = '#1f2937' }: { label: string; value: string; color?: string }) {
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
    backgroundColor: '#ffffff',
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
  clienteName: { fontSize: 18, fontFamily: 'PlusJakartaSans-ExtraBold', color: '#1f2937', flex: 1, marginRight: 8 },
  estadoBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  estadoText: { fontSize: 12, fontFamily: 'PlusJakartaSans-ExtraBold' },
  tiendaName: { fontSize: 12, color: '#6b7280', marginBottom: 6 },
  descripcion: { fontSize: 15, color: '#374151', fontFamily: 'PlusJakartaSans-SemiBold', marginBottom: 4 },
  notasText: { fontSize: 13, color: '#6b7280', marginBottom: 8 },
  amountRow: { flexDirection: 'row', gap: 8, marginTop: 14, borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 14 },
  amountBox: { flex: 1, alignItems: 'center' },
  amountLabel: { fontSize: 11, color: '#6b7280', fontFamily: 'PlusJakartaSans-SemiBold', marginBottom: 3 },
  amountValue: { fontVariant: ['tabular-nums'], fontSize: 16, fontFamily: 'PlusJakartaSans-ExtraBold' },
  fechaVenc: { fontSize: 13, color: '#6b7280', marginTop: 10 },
  meta: { fontSize: 12, color: '#6b7280', marginTop: 4 },

  actions: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  abonoBtn: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 13,
    alignItems: 'center',
  },
  abonoBtnText: { color: '#ffffff', fontFamily: 'PlusJakartaSans-ExtraBold', fontSize: 14 },
  anularBtn: {
    flex: 1,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  anularBtnText: { color: '#dc2626', fontFamily: 'PlusJakartaSans-ExtraBold', fontSize: 14 },

  abonoForm: {
    backgroundColor: '#ffffff',
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
    color: '#1f2937',
    backgroundColor: '#f8fafc',
    marginBottom: 10,
  },
  submitAbono: {
    backgroundColor: '#059669',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  submitAbonoText: { color: '#ffffff', fontFamily: 'PlusJakartaSans-ExtraBold', fontSize: 14 },

  sectionTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans-ExtraBold', color: '#6b7280', marginBottom: 10, marginTop: 4, letterSpacing: 0.3 },
  noAbonos: { color: '#6b7280', fontSize: 14, textAlign: 'center', paddingVertical: 24 },
  abonoCard: {
    backgroundColor: '#ffffff',
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
  abonoMonto: { fontSize: 17, fontFamily: 'PlusJakartaSans-ExtraBold', color: '#047857' },
  lineThrough: { textDecorationLine: 'line-through', color: '#6b7280' },
  anuladoTag: { fontSize: 11, color: '#dc2626', fontFamily: 'PlusJakartaSans-SemiBold', marginTop: 2 },
  abonoNotas: { fontSize: 12, color: '#6b7280', marginTop: 3 },
  abonoFecha: { fontSize: 11, color: '#6b7280', marginTop: 4 },
  abonoAnularBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  abonoAnularText: { fontSize: 12, color: '#dc2626', fontFamily: 'PlusJakartaSans-SemiBold' },
});
