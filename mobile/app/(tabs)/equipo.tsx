import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, RefreshControl, TextInput,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useFocusEffect } from 'expo-router';
import { tiendasAPI, pick } from '@/lib/api';
import { ROLE_LABEL, usePermiso, useTodasLasTiendas } from '@/lib/store';
import { colores, fuentes } from '@/lib/tema';

import { Icon } from '@/components/Icon';
import { avisar } from '@/lib/aviso';

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

/** Formulario abierto: sumar a alguien ya registrado o crear la cuenta de alguien nuevo. */
type Formulario = 'agregar' | 'crear';
/** Roles que el dueño suma a su equipo (backend/src/config/permisos.js, ROLES_EQUIPO). */
type RolEquipo = 'vendedor' | 'encargado';
const ROLES_EQUIPO: RolEquipo[] = ['vendedor', 'encargado'];
const AYUDA_ROL: Record<RolEquipo, string> = {
  vendedor: 'Registra vales y consulta la cartera.',
  encargado: 'Atiende por ti: registra vales y cobra, pero no anula ni gestiona el equipo.',
};

export default function EquipoScreen() {
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [tienda, setTienda] = useState<{ id: string; nombre: string; esPropietario: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Con tienda:administrar se gestiona cualquier tienda; con equipo:gestionar, solo la propia.
  const isSuperAdmin = useTodasLasTiendas();
  const gestionaEquipo = usePermiso('equipo:gestionar');
  const puedeGestionar = isSuperAdmin || (gestionaEquipo && tienda?.esPropietario === true);

  const [formulario, setFormulario] = useState<Formulario | null>(null);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [rolNuevo, setRolNuevo] = useState<RolEquipo>('vendedor');
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
    setRolNuevo('vendedor');
  };

  const guardar = async () => {
    if (!tienda || !formulario) return;
    const correo = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) {
      avisar('Correo', 'Escribe el correo completo de la persona.', undefined, 'aviso');
      return;
    }
    if (formulario === 'crear' && nombre.trim().length < 2) {
      avisar('Nombre', 'Escribe el nombre de la persona.', undefined, 'aviso');
      return;
    }
    setGuardando(true);
    try {
      const res = formulario === 'agregar'
        ? await tiendasAPI.agregarAlEquipo(tienda.id, correo)
        : await tiendasAPI.crearMiembro(tienda.id, nombre.trim(), correo, rolNuevo);
      setFormulario(null);
      setNombre('');
      setEmail('');
      await load();
      avisar(formulario === 'agregar' ? 'Persona agregada' : 'Cuenta creada', res?.message ?? 'Listo.', undefined, 'exito');
    } catch (e: any) {
      avisar('No se pudo completar', e?.response?.data?.message || 'Revisa tu conexión e intenta de nuevo.', undefined, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const handleRemove = (m: Miembro) => {
    if (!tienda) return;
    avisar(
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
              // Vendedores y encargados, por el equipo (dueño o admin); otros roles, solo el admin.
              if (ROLES_EQUIPO.includes(m.role as RolEquipo)) await tiendasAPI.quitarDelEquipo(tienda.id, uid);
              else await tiendasAPI.removeUsuario(tienda.id, uid);
              setMiembros((prev) => prev.filter((x) => (x.userId ?? x.id) !== uid));
            } catch {
              avisar('Error', 'No pudimos quitar a la persona.', undefined, 'error');
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
            <Text style={[styles.accionText, formulario === 'agregar' && styles.accionTextActivo]}>Agregar al equipo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.accionBtn, formulario === 'crear' && styles.accionBtnActivo]}
            onPress={() => abrirFormulario('crear')}
            activeOpacity={0.8}
          >
            <Icon name="cliente" size={18} color={formulario === 'crear' ? colores.superficie : colores.azul} />
            <Text style={[styles.accionText, formulario === 'crear' && styles.accionTextActivo]}>Crear cuenta nueva</Text>
          </TouchableOpacity>
        </View>
      )}

      {formulario && (
        <View style={styles.formCard}>
          <Text style={styles.formTitulo}>
            {formulario === 'agregar' ? 'Agregar a alguien ya registrado' : 'Crear la cuenta de alguien nuevo'}
          </Text>
          <Text style={styles.formAyuda}>
            {formulario === 'agregar'
              ? 'Escribe el correo completo con el que el vendedor o encargado se registró en la app. Quedará en esta tienda con su rol.'
              : 'Creamos su cuenta y le enviamos un correo para activarla y crear su contraseña. Quedará en esta tienda.'}
          </Text>
          {formulario === 'crear' && (
            <>
              <Text style={styles.label}>Rol</Text>
              <View style={styles.roles}>
                {ROLES_EQUIPO.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.rolOpcion, rolNuevo === r && styles.rolOpcionActiva]}
                    onPress={() => setRolNuevo(r)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.rolOpcionText, rolNuevo === r && styles.rolOpcionTextActiva]}>{ROLE_LABEL[r]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.formAyuda}>{AYUDA_ROL[rolNuevo]}</Text>
              <Text style={styles.label}>Nombre completo</Text>
              <TextInput
                style={styles.input}
                value={nombre}
                onChangeText={setNombre}
                placeholder="Nombre completo"
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
            placeholder="persona@correo.com"
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
            {puedeGestionar && !item.esPropietario && (isSuperAdmin || ROLES_EQUIPO.includes(rol as RolEquipo)) && (
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
  roles: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  rolOpcion: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: colores.borde, backgroundColor: colores.superficie,
  },
  rolOpcionActiva: { borderColor: colores.azul, backgroundColor: colores.azulSuave },
  rolOpcionText: { color: colores.textoSecundario, fontFamily: fuentes.semibold },
  rolOpcionTextActiva: { color: colores.azulPresionado, fontFamily: fuentes.extrabold },
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
