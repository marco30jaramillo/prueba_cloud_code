import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, FlatList,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useRouter } from 'expo-router';
import { valesAPI, tiendasAPI, usersAPI, pick } from '@/lib/api';
import { useTodasLasTiendas } from '@/lib/store';
import { aISO, unMesDespues } from '@/lib/fechas';
import { CampoFecha } from '@/components/CampoFecha';
import { avisar } from '@/lib/aviso';
import { AvisoHost } from '@/components/AvisoHost';

interface Tienda { id: string; nombre?: string; name?: string }
interface Cliente { id: string; nombre?: string; name?: string; email?: string }

export default function ValeNuevoScreen() {
  const router = useRouter();
  const todasLasTiendas = useTodasLasTiendas();

  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [tiendaId, setTiendaId] = useState('');
  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteResults, setClienteResults] = useState<Cliente[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [searching, setSearching] = useState(false);
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  // Por defecto vence en un mes; el selector no deja elegir días anteriores a hoy.
  const [fechaVencimiento, setFechaVencimiento] = useState<Date | null>(() => unMesDespues());
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadTiendas = async () => {
      try {
        const res = todasLasTiendas
          ? await tiendasAPI.getAll()
          : await tiendasAPI.getMisTiendas();
        const list: Tienda[] = pick(res, 'tiendas');
        setTiendas(list);
        if (list.length > 0) setTiendaId(list[0].id);
      } catch {
        avisar('Error', 'No se pudieron cargar las tiendas.', undefined, 'error');
      }
    };
    loadTiendas();
  }, [todasLasTiendas]);

  const buscarCliente = async (q: string) => {
    setClienteSearch(q);
    setClienteSeleccionado(null);
    if (q.length < 2) { setClienteResults([]); return; }
    setSearching(true);
    try {
      const res = await usersAPI.buscarClientes(q);
      setClienteResults(pick(res, 'clientes'));
    } catch {
      setClienteResults([]);
    } finally {
      setSearching(false);
    }
  };

  const seleccionarCliente = (c: Cliente) => {
    setClienteSeleccionado(c);
    setClienteSearch(c.nombre ?? c.name ?? '');
    setClienteResults([]);
  };

  const handleSubmit = async () => {
    if (!tiendaId) return avisar('Faltan datos', 'Selecciona una tienda.', undefined, 'aviso');
    if (!clienteSeleccionado) return avisar('Faltan datos', 'Busca y selecciona un cliente.', undefined, 'aviso');
    if (!descripcion.trim()) return avisar('Faltan datos', 'Ingresa una descripción.', undefined, 'aviso');
    const montoNum = parseFloat(monto.replace(/[^0-9.]/g, ''));
    if (!montoNum || montoNum <= 0) return avisar('Faltan datos', 'Ingresa un monto válido.', undefined, 'aviso');

    setLoading(true);
    try {
      const body: any = {
        tiendaId,
        clienteId: clienteSeleccionado.id,
        descripcion: descripcion.trim(),
        montoTotal: montoNum,
      };
      if (notas.trim()) body.notas = notas.trim();
      if (fechaVencimiento) body.fechaVencimiento = aISO(fechaVencimiento);

      const res = await valesAPI.crear(body);
      if (res?.status == 'success') {
        avisar('Vale creado', `Vale registrado por $${montoNum.toLocaleString('es-CO')}`, [
          { text: 'OK', onPress: () => router.back() },
        ], 'exito');
      } else {
        avisar('Error', res?.message ?? 'No se pudo crear el vale.', undefined, 'error');
      }
    } catch (e: any) {
      avisar('Error', e?.response?.data?.message ?? 'Error al crear el vale.', undefined, 'error');
    } finally {
      setLoading(false);
    }
  };

  const tNombre = (t: Tienda) => t.nombre ?? t.name ?? t.id;
  const cNombre = (c: Cliente) => c.nombre ?? c.name ?? '';

  return (
    <>
    <KeyboardAwareScrollView
      style={styles.root}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      bottomOffset={24}
    >

        {/* Tienda */}
        <Label text="Tienda" />
        {tiendas.length === 0
          ? <Text style={styles.noTiendas}>No tienes tiendas asignadas. Contacta a tu administrador.</Text>
          : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {tiendas.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.chip, tiendaId === t.id && styles.chipActive]}
                  onPress={() => setTiendaId(t.id)}
                >
                  <Text style={[styles.chipText, tiendaId === t.id && styles.chipTextActive]}>
                    {tNombre(t)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )
        }

        {/* Cliente */}
        <Label text="Cliente" />
        <View style={styles.clienteWrap}>
          <TextInput
            style={styles.input}
            value={clienteSearch}
            onChangeText={buscarCliente}
            placeholder="Buscar por nombre o correo…"
            placeholderTextColor="#6b7280"
          />
          {searching && <ActivityIndicator style={{ marginTop: 6 }} color="#2563eb" />}
          {clienteResults.length > 0 && !clienteSeleccionado && (
            <View style={styles.results}>
              {clienteResults.map((c) => (
                <TouchableOpacity key={c.id} style={styles.resultItem} onPress={() => seleccionarCliente(c)}>
                  <Text style={styles.resultName}>{cNombre(c)}</Text>
                  <Text style={styles.resultEmail}>{c.email}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {clienteSeleccionado && (
            <View style={styles.clienteSelected}>
              <Text style={styles.clienteSelectedText}>{cNombre(clienteSeleccionado)} · {clienteSeleccionado.email}</Text>
              <TouchableOpacity onPress={() => { setClienteSeleccionado(null); setClienteSearch(''); }}>
                <Text style={styles.clearClient}>Cambiar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Descripción */}
        <Label text="Descripción" />
        <TextInput
          style={styles.input}
          value={descripcion}
          onChangeText={setDescripcion}
          placeholder="Ej: Compra de mercado, préstamo…"
          placeholderTextColor="#6b7280"
        />

        {/* Monto */}
        <Label text="Monto total (COP)" />
        <TextInput
          style={styles.input}
          value={monto}
          onChangeText={setMonto}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor="#6b7280"
        />

        {/* Fecha vencimiento */}
        <Label text="Fecha de vencimiento (opcional)" />
        <CampoFecha value={fechaVencimiento} onChange={setFechaVencimiento} opcional />

        {/* Notas */}
        <Label text="Notas (opcional)" />
        <TextInput
          style={[styles.input, styles.textarea]}
          value={notas}
          onChangeText={setNotas}
          placeholder="Observaciones adicionales…"
          placeholderTextColor="#6b7280"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color="#ffffff" />
            : <Text style={styles.submitText}>Crear vale</Text>
          }
        </TouchableOpacity>
    </KeyboardAwareScrollView>
    {/* Pantalla modal nativa: en iOS los avisos de la raíz quedan detrás (components/AvisoHost.tsx). */}
    <AvisoHost />
    </>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },
  container: { padding: 20, paddingBottom: 48 },
  label: { fontSize: 13, fontFamily: 'PlusJakartaSans-ExtraBold', color: '#374151', marginBottom: 6, marginTop: 16 },
  noTiendas: { fontSize: 13, color: '#991b1b', padding: 12, backgroundColor: '#fee2e2', borderRadius: 10 },
  chipScroll: { marginBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    marginRight: 8,
  },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontSize: 13, color: '#374151', fontFamily: 'PlusJakartaSans-SemiBold' },
  chipTextActive: { color: '#ffffff' },
  clienteWrap: { position: 'relative' },
  input: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 13,
    fontSize: 15,
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },
  textarea: { height: 80, paddingTop: 12 },
  results: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  resultItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  resultName: { fontSize: 14, fontFamily: 'PlusJakartaSans-SemiBold', color: '#1f2937' },
  resultEmail: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  clienteSelected: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    padding: 10,
    backgroundColor: '#d1fae5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  clienteSelectedText: { fontSize: 13, color: '#065f46', fontFamily: 'PlusJakartaSans-SemiBold', flex: 1 },
  clearClient: { fontSize: 12, color: '#2563eb', fontFamily: 'PlusJakartaSans-SemiBold', marginLeft: 8 },
  submitBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: '#ffffff', fontFamily: 'PlusJakartaSans-ExtraBold', fontSize: 16 },
});
