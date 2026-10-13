import { useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useFocusEffect, useRouter } from 'expo-router';
import { valesAPI, tiendasAPI, pick } from '@/lib/api';
import { useAuthStore, formatCOP, verTodasLasTiendas } from '@/lib/store';
import { esCobrable, estaEnMora } from '@/lib/estado-vale';
import { valesCobrables, distribuirPago, validarPago, totalSaldos } from '@/lib/pago-integral';
import { colores, fuentes } from '@/lib/tema';

import { Icon } from '@/components/Icon';

interface Vale {
  id: string;
  clienteId: string;
  clienteNombre?: string;
  clienteName?: string;
  clienteEmail?: string;
  descripcion: string;
  montoTotal: number;
  saldoPendiente: number;
  estado: string;
  fechaVale: string;
  fechaVencimiento?: string;
}

interface Tienda { id: string; nombre: string }

interface ClienteResumen {
  id: string;
  nombre: string;
  email: string;
  total: number;
  pendiente: number;
  valesPorCobrar: number;
  valesEnMora: number;
}

/** Qué se va a pagar: solo los vales marcados o todos los del cliente (pago integral). */
type ModoPago = 'seleccion' | 'integral';

const fecha = (s?: string) => (s ? new Date(s).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) : '');
const soloDigitos = (t: string) => t.replace(/[^0-9]/g, '');

export default function CarteraScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [tiendaId, setTiendaIdState] = useState<string | null>(null);
  // La tienda elegida también en una ref: `load` la lee sin volver a crearse al cambiarla.
  const tiendaRef = useRef<string | null>(null);
  const setTiendaId = (id: string | null) => { tiendaRef.current = id; setTiendaIdState(id); };
  const [vales, setVales] = useState<Vale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [busqueda, setBusqueda] = useState('');
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [modoPago, setModoPago] = useState<ModoPago | null>(null);
  const [monto, setMonto] = useState('');
  const [pagando, setPagando] = useState(false);

  const cargarCartera = useCallback(async (id: string) => {
    const res = await valesAPI.getCartera(id);
    setVales(pick(res, 'vales'));
  }, []);

  const load = useCallback(async () => {
    try {
      let lista: any[] = pick(await tiendasAPI.getMisTiendas(), 'tiendas');
      // Administrador y superusuario no suelen estar asignados a una tienda: ven todas.
      if (lista.length === 0 && verTodasLasTiendas(user?.role)) lista = pick(await tiendasAPI.getAll(), 'tiendas');
      const ts: Tienda[] = lista.map((t) => ({ id: t.id, nombre: t.nombre ?? t.name ?? 'Tienda' }));
      setTiendas(ts);
      const actual = ts.find((t) => t.id === tiendaRef.current)?.id ?? ts[0]?.id ?? null;
      setTiendaId(actual);
      if (actual) await cargarCartera(actual);
      else setVales([]);
    } catch {
      setVales([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.role, cargarCartera]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ── Resumen por cliente ────────────────────────────────────────────────────
  const clientes = useMemo(() => {
    const mapa = new Map<string, ClienteResumen>();
    for (const v of vales) {
      if (v.estado === 'anulado') continue;
      let c = mapa.get(v.clienteId);
      if (!c) {
        c = {
          id: v.clienteId, nombre: v.clienteNombre || v.clienteName || 'Cliente', email: v.clienteEmail ?? '',
          total: 0, pendiente: 0, valesPorCobrar: 0, valesEnMora: 0,
        };
        mapa.set(v.clienteId, c);
      }
      c.total += Number(v.montoTotal) || 0;
      if (esCobrable(v.estado)) {
        c.pendiente += Number(v.saldoPendiente) || 0;
        c.valesPorCobrar++;
      }
      if (estaEnMora(v.estado, v.fechaVencimiento)) c.valesEnMora++;
    }
    return [...mapa.values()].sort((a, b) => b.pendiente - a.pendiente || a.nombre.localeCompare(b.nombre));
  }, [vales]);

  const kpis = useMemo(() => {
    const porCobrar = vales.filter((v) => esCobrable(v.estado));
    return [
      { label: 'Por cobrar', value: formatCOP(totalSaldos(porCobrar)), color: colores.rojo, bg: colores.rojoSuave },
      { label: 'Vales por cobrar', value: porCobrar.length, color: colores.azul, bg: colores.azulSuave },
      { label: 'En mora', value: vales.filter((v) => estaEnMora(v.estado, v.fechaVencimiento)).length, color: colores.ambarTexto, bg: colores.ambarSuave },
      { label: 'Clientes', value: clientes.length, color: colores.azul, bg: colores.azulSuave },
    ];
  }, [vales, clientes]);

  const q = busqueda.trim().toLowerCase();
  const clientesFiltrados = q
    ? clientes.filter((c) => c.nombre.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
    : clientes.filter((c) => c.pendiente > 0);

  // ── Cliente elegido ────────────────────────────────────────────────────────
  const cliente = clientes.find((c) => c.id === clienteId) ?? null;
  const valesCliente = useMemo(
    () => valesCobrables(vales.filter((v) => v.clienteId === clienteId)),
    [vales, clienteId]
  );
  const marcados = valesCliente.filter((v) => seleccion.has(v.id));
  const aPagar = modoPago === 'integral' ? valesCliente : marcados;
  const totalAPagar = totalSaldos(aPagar);
  const montoNum = Number(monto) || 0;
  const reparto = useMemo(() => distribuirPago(montoNum, aPagar), [montoNum, aPagar]);

  const abrirCliente = (id: string) => {
    setClienteId(id);
    setSeleccion(new Set());
    setModoPago(null);
    setMonto('');
  };
  const cerrarCliente = () => { setClienteId(null); setModoPago(null); setMonto(''); };

  const alternar = (id: string) => {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    if (modoPago === 'seleccion') setModoPago(null);
  };
  const todosMarcados = valesCliente.length > 0 && marcados.length === valesCliente.length;
  const alternarTodos = () => {
    setSeleccion(todosMarcados ? new Set() : new Set(valesCliente.map((v) => v.id)));
    if (modoPago === 'seleccion') setModoPago(null);
  };

  const iniciarPago = (modo: ModoPago) => {
    const lista = modo === 'integral' ? valesCliente : marcados;
    setModoPago(modo);
    setMonto(String(Math.round(totalSaldos(lista))));
  };

  const confirmarPago = async () => {
    if (!cliente || !tiendaId) return;
    const v = validarPago(montoNum, aPagar);
    if (!v.ok) {
      if (v.motivo === 'monto-invalido') return Alert.alert('Monto', 'Escribe un monto mayor a cero.');
      if (v.motivo === 'sin-seleccion') return Alert.alert('Vales', 'Selecciona al menos un vale.');
      return Alert.alert('Monto', `El monto supera lo que se debe en esos vales (${formatCOP(v.total)}).`);
    }
    setPagando(true);
    try {
      const res = await valesAPI.pagoIntegral({ clienteId: cliente.id, monto: montoNum, valeIds: aPagar.map((x) => x.id) });
      await cargarCartera(tiendaId);
      setSeleccion(new Set());
      setModoPago(null);
      setMonto('');
      Alert.alert('Pago registrado', res?.message || `Pago de ${formatCOP(montoNum)} registrado.`);
    } catch (e: any) {
      Alert.alert('No se registró el pago', e?.response?.data?.message || 'Intenta de nuevo.');
    } finally {
      setPagando(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colores.azul} /></View>;
  }

  const refresco = (
    <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colores.azul} />
  );

  // ── Vista: vales de un cliente y pago ──────────────────────────────────────
  if (cliente) {
    return (
      <KeyboardAwareScrollView
        style={styles.root}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
        refreshControl={refresco}
      >
        <TouchableOpacity style={styles.volver} onPress={cerrarCliente} hitSlop={8}>
          <Icon name="volver" size={18} color={colores.azul} />
          <Text style={styles.volverText}>Clientes</Text>
        </TouchableOpacity>

        <View style={styles.clienteHeader}>
          <Text style={styles.clienteHeaderNombre}>{cliente.nombre}</Text>
          {cliente.email ? <Text style={styles.clienteHeaderEmail}>{cliente.email}</Text> : null}
          <Text style={styles.clienteHeaderLabel}>Debe en esta tienda</Text>
          <Text style={styles.clienteHeaderMonto}>{formatCOP(cliente.pendiente)}</Text>
        </View>

        <View style={styles.listaHeader}>
          <Text style={styles.sectionTitle}>Vales por cobrar</Text>
          {valesCliente.length > 1 && (
            <TouchableOpacity onPress={alternarTodos} hitSlop={8}>
              <Text style={styles.link}>{todosMarcados ? 'Quitar selección' : 'Seleccionar todos'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {valesCliente.length === 0 ? (
          <Text style={styles.vacioCliente}>Este cliente no tiene vales por cobrar.</Text>
        ) : valesCliente.map((v) => {
          const marcado = seleccion.has(v.id);
          const mora = estaEnMora(v.estado, v.fechaVencimiento);
          return (
            <TouchableOpacity
              key={v.id}
              style={[styles.valeCard, marcado && styles.valeCardMarcado]}
              onPress={() => alternar(v.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.check, marcado && styles.checkMarcado]}>
                {marcado && <Icon name="check" size={14} color={colores.superficie} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.valeDesc} numberOfLines={1}>{v.descripcion}</Text>
                <Text style={[styles.valeMeta, mora && { color: colores.rojo }]}>
                  {fecha(v.fechaVale)}
                  {v.fechaVencimiento ? `  ·  ${mora ? 'En mora desde' : 'Vence'} ${fecha(v.fechaVencimiento)}` : ''}
                </Text>
                <TouchableOpacity onPress={() => router.push(`/vale/${v.id}`)} hitSlop={6}>
                  <Text style={styles.verDetalle}>Ver detalle</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.valeSaldo}>{formatCOP(v.saldoPendiente)}</Text>
            </TouchableOpacity>
          );
        })}

        {valesCliente.length > 0 && (
          <View style={styles.botonesPago}>
            <TouchableOpacity
              style={[styles.btnSecundario, marcados.length === 0 && styles.btnDeshabilitado, modoPago === 'seleccion' && styles.btnActivo]}
              onPress={() => iniciarPago('seleccion')}
              disabled={marcados.length === 0}
              activeOpacity={0.8}
            >
              <Text style={[styles.btnSecundarioText, marcados.length === 0 && styles.btnDeshabilitadoText]}>
                {marcados.length === 0
                  ? 'Pagar seleccionados'
                  : `Pagar ${marcados.length} seleccionado${marcados.length !== 1 ? 's' : ''} · ${formatCOP(totalSaldos(marcados))}`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnPrimario, modoPago === 'integral' && styles.btnActivo]}
              onPress={() => iniciarPago('integral')}
              activeOpacity={0.8}
            >
              <Text style={styles.btnPrimarioText}>Pago integral · {formatCOP(cliente.pendiente)}</Text>
            </TouchableOpacity>
          </View>
        )}

        {modoPago && (
          <View style={styles.pagoCard}>
            <Text style={styles.pagoTitulo}>
              {modoPago === 'integral' ? 'Pago integral' : 'Pagar vales seleccionados'}
            </Text>
            <Text style={styles.pagoAyuda}>
              El pago se aplica del vale más antiguo al más reciente. Puedes pagar una parte.
            </Text>
            <Text style={styles.label}>Monto recibido</Text>
            <View style={styles.montoRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={monto ? Number(monto).toLocaleString('es-CO') : ''}
                onChangeText={(t) => setMonto(soloDigitos(t))}
                keyboardType="number-pad"
                placeholder="$ 0"
                placeholderTextColor={colores.textoMinimo}
              />
              <TouchableOpacity style={styles.btnTotal} onPress={() => setMonto(String(Math.round(totalAPagar)))}>
                <Text style={styles.btnTotalText}>Total</Text>
              </TouchableOpacity>
            </View>

            {reparto.filter((r) => r.aplicado > 0).map((r) => (
              <View key={r.vale.id} style={styles.repartoFila}>
                <Text style={styles.repartoDesc} numberOfLines={1}>{r.vale.descripcion}</Text>
                <Text style={styles.repartoMonto}>
                  {formatCOP(r.aplicado)}{r.quedaPendiente > 0 ? ` (quedan ${formatCOP(r.quedaPendiente)})` : ' · queda pagado'}
                </Text>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.btnPrimario, { marginTop: 14 }, pagando && { opacity: 0.6 }]}
              onPress={confirmarPago}
              disabled={pagando}
              activeOpacity={0.8}
            >
              {pagando
                ? <ActivityIndicator color={colores.superficie} />
                : <Text style={styles.btnPrimarioText}>Confirmar pago de {formatCOP(montoNum)}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnCancelar} onPress={() => { setModoPago(null); setMonto(''); }}>
              <Text style={styles.btnCancelarText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAwareScrollView>
    );
  }

  // ── Vista: indicadores, buscador y clientes ────────────────────────────────
  return (
    <KeyboardAwareScrollView
      style={styles.root}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      bottomOffset={24}
      refreshControl={refresco}
    >
      {tiendas.length > 1 ? (
        <View style={styles.tiendas}>
          {tiendas.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.chip, t.id === tiendaId && styles.chipActivo]}
              onPress={async () => { setTiendaId(t.id); setLoading(true); try { await cargarCartera(t.id); } finally { setLoading(false); } }}
            >
              <Text style={[styles.chipText, t.id === tiendaId && styles.chipTextActivo]}>{t.nombre}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : tiendas[0] ? <Text style={styles.tiendaName}>{tiendas[0].nombre}</Text> : null}

      <Text style={styles.sectionTitle}>Indicadores</Text>
      <View style={styles.kpiGrid}>
        {kpis.map((k) => (
          <View key={k.label} style={[styles.kpiCard, { backgroundColor: k.bg }]}>
            <Text style={[styles.kpiValue, { color: k.color }]}>{k.value}</Text>
            <Text style={styles.kpiLabel}>{k.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.searchWrap}>
        <Icon name="buscar" size={16} color={colores.textoMinimo} />
        <TextInput
          style={styles.searchInput}
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar cliente por nombre o correo"
          placeholderTextColor={colores.textoMinimo}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {busqueda ? (
          <TouchableOpacity onPress={() => setBusqueda('')} hitSlop={8}>
            <Icon name="cerrar" size={16} color={colores.textoMinimo} />
          </TouchableOpacity>
        ) : null}
      </View>

      <Text style={styles.sectionTitle}>{q ? 'Resultados' : 'Clientes con deuda'}</Text>
      {clientesFiltrados.length === 0 ? (
        <View style={styles.empty}>
          <View style={{ marginBottom: 12 }}><Icon name="cartera" size={40} color={colores.textoMinimo} /></View>
          <Text style={styles.emptyText}>
            {q ? 'Ningún cliente de esta tienda coincide con la búsqueda' : 'No hay clientes con deuda'}
          </Text>
        </View>
      ) : clientesFiltrados.map((c) => (
        <TouchableOpacity key={c.id} style={styles.clienteCard} onPress={() => abrirCliente(c.id)} activeOpacity={0.8}>
          <View style={styles.clienteRow}>
            <Text style={styles.clienteNombre} numberOfLines={1}>{c.nombre}</Text>
            <Text style={[styles.clientePendiente, c.pendiente === 0 && { color: colores.verde }]}>
              {c.pendiente > 0 ? formatCOP(c.pendiente) : 'Al día'}
            </Text>
          </View>
          <View style={styles.clienteRow}>
            <Text style={styles.clienteMeta}>
              {c.valesPorCobrar} vale{c.valesPorCobrar !== 1 ? 's' : ''} por cobrar
              {c.valesEnMora > 0 ? `  •  ${c.valesEnMora} en mora` : ''}
            </Text>
            <Icon name="siguiente" size={16} color={colores.textoMinimo} />
          </View>
        </TouchableOpacity>
      ))}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colores.gris },
  container: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tiendaName: { fontSize: 13, color: colores.textoMinimo, fontFamily: fuentes.semibold, marginBottom: 16 },
  tiendas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: colores.superficie, borderWidth: 1, borderColor: colores.borde },
  chipActivo: { backgroundColor: colores.azul, borderColor: colores.azul },
  chipText: { fontSize: 13, color: colores.texto, fontFamily: fuentes.semibold },
  chipTextActivo: { color: colores.superficie },
  sectionTitle: { fontSize: 14, fontFamily: fuentes.extrabold, color: colores.textoMinimo, marginBottom: 10, letterSpacing: 0.3 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  kpiCard: { width: '47%', borderRadius: 14, padding: 16, alignItems: 'flex-start' },
  kpiValue: { fontSize: 22, fontFamily: fuentes.extrabold, marginBottom: 4 },
  kpiLabel: { fontSize: 12, color: colores.textoMinimo, fontFamily: fuentes.semibold },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colores.superficie, borderRadius: 12, paddingHorizontal: 12,
    borderWidth: 1, borderColor: colores.borde, marginBottom: 18,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: colores.texto, fontFamily: fuentes.regular },
  clienteCard: {
    backgroundColor: colores.superficie, marginBottom: 10, borderRadius: 12, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 2,
  },
  clienteRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  clienteNombre: { fontSize: 15, fontFamily: fuentes.extrabold, color: colores.texto, flex: 1, marginRight: 8 },
  clientePendiente: { fontSize: 17, fontFamily: fuentes.extrabold, color: colores.rojo },
  clienteMeta: { fontSize: 12, color: colores.textoMinimo },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: colores.textoMinimo, fontSize: 15, textAlign: 'center' },

  volver: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  volverText: { color: colores.azul, fontFamily: fuentes.semibold, fontSize: 15 },
  clienteHeader: { backgroundColor: colores.superficie, borderRadius: 14, padding: 16, marginBottom: 18 },
  clienteHeaderNombre: { fontSize: 18, fontFamily: fuentes.extrabold, color: colores.texto },
  clienteHeaderEmail: { fontSize: 13, color: colores.textoMinimo, marginTop: 2 },
  clienteHeaderLabel: { fontSize: 12, color: colores.textoMinimo, fontFamily: fuentes.semibold, marginTop: 12 },
  clienteHeaderMonto: { fontSize: 26, fontFamily: fuentes.extrabold, color: colores.rojo },
  listaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  link: { color: colores.azul, fontFamily: fuentes.semibold, fontSize: 13 },
  vacioCliente: { color: colores.textoMinimo, fontSize: 14, marginBottom: 12 },
  valeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colores.superficie, borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1.5, borderColor: colores.superficie,
  },
  valeCardMarcado: { borderColor: colores.azul, backgroundColor: colores.azulSuave },
  check: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colores.textoMinimo,
    alignItems: 'center', justifyContent: 'center',
  },
  checkMarcado: { backgroundColor: colores.azul, borderColor: colores.azul },
  valeDesc: { fontSize: 14, fontFamily: fuentes.semibold, color: colores.texto },
  valeMeta: { fontSize: 12, color: colores.textoMinimo, marginTop: 2 },
  verDetalle: { fontSize: 12, color: colores.azul, fontFamily: fuentes.semibold, marginTop: 4 },
  valeSaldo: { fontSize: 15, fontFamily: fuentes.extrabold, color: colores.texto },

  botonesPago: { gap: 10, marginTop: 10 },
  btnPrimario: { backgroundColor: colores.azul, borderRadius: 12, padding: 15, alignItems: 'center' },
  btnPrimarioText: { color: colores.superficie, fontFamily: fuentes.extrabold, fontSize: 15 },
  btnSecundario: {
    backgroundColor: colores.superficie, borderRadius: 12, padding: 15, alignItems: 'center',
    borderWidth: 1.5, borderColor: colores.azul,
  },
  btnSecundarioText: { color: colores.azul, fontFamily: fuentes.extrabold, fontSize: 15 },
  btnDeshabilitado: { borderColor: colores.borde },
  btnDeshabilitadoText: { color: colores.textoMinimo },
  btnActivo: { borderWidth: 3, borderColor: colores.azulPresionado },

  pagoCard: { backgroundColor: colores.superficie, borderRadius: 14, padding: 16, marginTop: 16 },
  pagoTitulo: { fontSize: 16, fontFamily: fuentes.extrabold, color: colores.texto },
  pagoAyuda: { fontSize: 12, color: colores.textoMinimo, marginTop: 4 },
  label: { fontSize: 13, fontFamily: fuentes.semibold, color: colores.textoSecundario, marginTop: 14, marginBottom: 6 },
  montoRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  input: {
    borderWidth: 1.5, borderColor: colores.azulSuave, borderRadius: 12, padding: 13,
    fontSize: 17, color: colores.texto, backgroundColor: colores.fondo, fontFamily: fuentes.semibold,
  },
  btnTotal: { justifyContent: 'center', paddingHorizontal: 16, borderRadius: 12, backgroundColor: colores.azulSuave },
  btnTotalText: { color: colores.azulPresionado, fontFamily: fuentes.extrabold },
  repartoFila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: colores.borde },
  repartoDesc: { flex: 1, fontSize: 13, color: colores.textoSecundario, marginRight: 8 },
  repartoMonto: { fontSize: 13, fontFamily: fuentes.semibold, color: colores.texto },
  btnCancelar: { alignItems: 'center', padding: 12 },
  btnCancelarText: { color: colores.textoMinimo, fontFamily: fuentes.semibold },
});
