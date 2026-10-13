import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, RefreshControl, TextInput,
  ActivityIndicator, Alert, TouchableOpacity,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useFocusEffect } from 'expo-router';
import { tiendasAPI, pick } from '@/lib/api';
import { useAuthStore, ROLE_LABEL, verTodasLasTiendas } from '@/lib/store';
import { colores, fuentes } from '@/lib/tema';

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

/** Formulario abierto: sumar un vendedor ya registrado o crear la cuenta de uno nuevo. */
type Formulario = 'agregar' | 'crear';

export default function EquipoScreen() {
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [tienda, setTienda] = useState<{ id: string; nombre: string; esPropietario: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuthStore();
  const isSuperAdmin = verTodasLasTiendas(user?.role);
  // El propietario de la tienda arma su equipo; administrador y superusuario, en cualquiera.
  const puedeGestionar = isSuperAdmin || (user?.role === 'tendero' && tienda?.esPropietario === true);

  const [formulario, setFormulario] = useState<Formulario | null>(null);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [guardando, setGuardando] = useState(false);

  const load = useCallback(async () => {
    try {
      let tiendas: any[] = pick(await tiendasAPI.getMisTiendas(), 'tiendas');
      if (tiendas.length === 0 && isSuperAdmin) tiendas = pick(await tiendasAPI.getAll(), 'tiendas');
      if (tiendas.length === 0) {
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const t = tiendas[0];
      setTienda({ id: t.id, nombre: t.nombre ?? t.name ?? 'Tienda', esPropietario: Boolean(t.esPropietario) });

      const uRes = await tiendasAPI.getUsuarios(t.id);
      setMiembros(pick(uRes, 'usuarios'));
    } catch {
      setMiembros([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isSuperAdmin]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const abrirFormulario = (f: Formulario) => {
    setFormulario((actual) => (actual === f ? null : f));
    setNombre('');
    setEmail('');
  };

  const guardar = async () => {
    if (!tienda || !formulario) return;
    const correo = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) {
      Alert.alert('Correo', 'Escribe el correo completo del vendedor.');
      return;
    }
    if (formulario === 'crear' && nombre.trim().length < 2) {
      Alert.alert('Nombre', 'Escribe el nombre del vendedor.');
      return;
    }
    setGuardando(true);
    try {
      const res = formulario === 'agregar'
        ? await tiendasAPI.agregarVendedor(tienda.id, correo)
        : await tiendasAPI.crearVendedor(tienda.id, nombre.trim(), correo);
      setFormulario(null);
      setNombre('');
      setEmail('');
      await load();
      Alert.alert(formulario === 'agregar' ? 'Vendedor agregado' : 'Vendedor creado', res?.message ?? 'Listo.');
    } catch (e: any) {
      Alert.alert('No se pudo completar', e?.response?.data?.message || 'Revisa tu conexión e intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

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
    <KeyboardAwareScrollView
      style={styles.root}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      bottomOffset={24}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colores.azul} />
      }
    >
      {tienda && <Text style={styles.tiendaLabel}>{tienda.nombre}</Text>}

      {tienda && puedeGestionar && (
        <View style={styles.acciones}>
          <TouchableOpacity
            style={[styles.accionBtn, formulario === 'agregar' && styles.accionBtnActivo]}
            onPress={() => abrirFormulario('agregar')}
            activeOpacity={0.8}
          >
            <Icon name="agregar" size={18} color={formulario === 'agregar' ? colores.superficie : colores.azul} />
            <Text style={[styles.accionText, formulario === 'agregar' && styles.accionTextActivo]}>Agregar vendedor</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.accionBtn, formulario === 'crear' && styles.accionBtnActivo]}
            onPress={() => abrirFormulario('crear')}
            activeOpacity={0.8}
          >
            <Icon name="cliente" size={18} color={formulario === 'crear' ? colores.superficie : colores.azul} />
            <Text style={[styles.accionText, formulario === 'crear' && styles.accionTextActivo]}>Crear vendedor nuevo</Text>
          </TouchableOpacity>
        </View>
      )}

      {formulario && (
        <View style={styles.formCard}>
          <Text style={styles.formTitulo}>
            {formulario === 'agregar' ? 'Agregar un vendedor registrado' : 'Crear un vendedor nuevo'}
          </Text>
          <Text style={styles.formAyuda}>
            {formulario === 'agregar'
              ? 'Escribe el correo completo con el que el vendedor se registró en la app. Podrá registrar vales en esta tienda.'
              : 'Creamos su cuenta y le enviamos un correo para activarla y crear su contraseña. Quedará en esta tienda.'}
          </Text>
          {formulario === 'crear' && (
            <>
              <Text style={styles.label}>Nombre completo</Text>
              <TextInput
                style={styles.input}
                value={nombre}
                onChangeText={setNombre}
                placeholder="Nombre del vendedor"
                placeholderTextColor={colores.textoMinimo}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </>
          )}
          <Text style={styles.label}>Correo electrónico</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="vendedor@correo.com"
            placeholderTextColor={colores.textoMinimo}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            returnKeyType="done"
            onSubmitEditing={guardar}
          />
          <TouchableOpacity
            style={[styles.guardarBtn, guardando && { opacity: 0.6 }]}
            onPress={guardar}
            disabled={guardando}
            activeOpacity={0.8}
          >
            {guardando
              ? <ActivityIndicator color={colores.superficie} />
              : <Text style={styles.guardarText}>{formulario === 'agregar' ? 'Agregar al equipo' : 'Crear y agregar'}</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelarBtn} onPress={() => setFormulario(null)}>
            <Text style={styles.cancelarText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      )}

      {miembros.length === 0 ? (
        <View style={styles.empty}>
          <View style={{ marginBottom: 12 }}><Icon name="equipo" size={40} color={colores.textoMinimo} /></View>
          <Text style={styles.emptyText}>No hay miembros en el equipo</Text>
        </View>
      ) : miembros.map((item) => {
        const nombreMiembro = item.nombre || item.name || 'Usuario';
        const rol = item.role ?? '';
        const activo = item.isActive !== false;
        return (
          <View key={item.userId ?? item.id} style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{nombreMiembro[0]?.toUpperCase()}</Text>
            </View>
            <View style={styles.info}>
              <View style={styles.nameRow}>
                <Text style={styles.nombre} numberOfLines={1}>{nombreMiembro}</Text>
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
      })}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },
  container: { padding: 16, gap: 10, flexGrow: 1 },
  acciones: { flexDirection: 'row', gap: 8 },
  accionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, paddingHorizontal: 8, borderRadius: 12,
    backgroundColor: colores.superficie, borderWidth: 1.5, borderColor: colores.azul,
  },
  accionBtnActivo: { backgroundColor: colores.azul },
  accionText: { color: colores.azul, fontFamily: fuentes.extrabold, fontSize: 13 },
  accionTextActivo: { color: colores.superficie },
  formCard: { backgroundColor: colores.superficie, borderRadius: 14, padding: 16 },
  formTitulo: { fontSize: 16, fontFamily: fuentes.extrabold, color: colores.texto },
  formAyuda: { fontSize: 12, color: colores.textoMinimo, marginTop: 4 },
  label: { fontSize: 13, fontFamily: fuentes.semibold, color: colores.textoSecundario, marginTop: 14, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: colores.azulSuave, borderRadius: 12, padding: 13,
    fontSize: 15, color: colores.texto, backgroundColor: colores.fondo, fontFamily: fuentes.regular,
  },
  guardarBtn: { backgroundColor: colores.azul, borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 16 },
  guardarText: { color: colores.superficie, fontFamily: fuentes.extrabold, fontSize: 15 },
  cancelarBtn: { alignItems: 'center', padding: 10 },
  cancelarText: { color: colores.textoMinimo, fontFamily: fuentes.semibold },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tiendaLabel: { fontSize: 13, color: '#6b7280', fontFamily: 'PlusJakartaSans-SemiBold' },
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
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: '#6b7280', fontSize: 15 },
});
