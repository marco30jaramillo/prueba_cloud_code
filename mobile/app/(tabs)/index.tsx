import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore, isAdminRole, ROLE_LABEL } from '@/lib/store';

import { Icon, type NombreIcono } from '@/components/Icon';
const ACTIONS_ALL: { icon: NombreIcono; label: string; desc: string; route: string; color: string; bg: string }[] = [
  { icon: 'agregar', label: 'Nuevo Vale', desc: 'Registrar un crédito nuevo', route: '/vale-nuevo', color: '#2563eb', bg: '#dbeafe' },
  { icon: 'vale', label: 'Mis Vales', desc: 'Consultar y gestionar vales', route: '/(tabs)/vales', color: '#059669', bg: '#d1fae5' },
];
const ACTIONS_ADMIN: typeof ACTIONS_ALL = [
  { icon: 'cartera', label: 'Cartera', desc: 'Panel de indicadores', route: '/(tabs)/cartera', color: '#d97706', bg: '#fef3c7' },
  { icon: 'equipo', label: 'Equipo', desc: 'Gestionar personas y roles', route: '/(tabs)/equipo', color: '#2563eb', bg: '#dbeafe' },
];

export default function HomeScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const canAdmin = isAdminRole(user?.role);
  const actions = canAdmin ? [...ACTIONS_ALL, ...ACTIONS_ADMIN] : ACTIONS_ALL;
  const roleLabel = ROLE_LABEL[user?.role ?? ''] ?? user?.role ?? '';

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Profile card — gradiente verde→azul simulado con dos Views */}
        <View style={styles.profileCard}>
          {/* Capa verde de fondo */}
          <View style={styles.gradientBg1} />
          {/* Capa azul encima (diagonal) */}
          <View style={styles.gradientBg2} />
          {/* Contenido sobre el gradiente */}
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>Bienvenido,</Text>
              <Text style={styles.userName}>{user?.name?.split(' ')[0]}</Text>
            </View>
            <View style={styles.rolePill}>
              <Text style={styles.roleText}>{roleLabel}</Text>
            </View>
          </View>
        </View>

        {/* Módulos — igual que el dashboard web */}
        <Text style={styles.sectionTitle}>Panel de acceso</Text>
        <View style={styles.grid}>
          {actions.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={[styles.actionCard, { backgroundColor: a.bg, borderColor: a.color + '40' }]}
              onPress={() => router.push(a.route as any)}
              activeOpacity={0.75}
            >
              <Icon name={a.icon} size={26} color={a.color} />
              <Text style={styles.cardLabel}>{a.label}</Text>
              <Text style={styles.cardDesc}>{a.desc}</Text>
              <View style={[styles.cardBtn, { backgroundColor: a.color }]}>
                <Text style={styles.cardBtnText}>Ir →</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },
  container: { padding: 20, paddingBottom: 32 },

  profileCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
    overflow: 'hidden',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  /* Capa 1: fondo verde */
  gradientBg1: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#059669',
  },
  /* Capa 2: media elipse azul desde la derecha — simula gradiente */
  gradientBg2: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#2563eb',
    opacity: 0.85,
  },

  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: { fontSize: 22, fontFamily: 'PlusJakartaSans-ExtraBold', color: '#ffffff' },
  greeting: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontFamily: 'PlusJakartaSans-SemiBold' },
  userName: { fontSize: 22, fontFamily: 'PlusJakartaSans-ExtraBold', color: '#ffffff', marginTop: 1 },
  rolePill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  roleText: { color: '#ffffff', fontFamily: 'PlusJakartaSans-ExtraBold', fontSize: 12 },

  sectionTitle: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    color: '#6b7280',
    marginBottom: 14,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: {
    width: '47.5%',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardIcon: { fontSize: 32, marginBottom: 10 },
  cardLabel: { fontSize: 15, fontFamily: 'PlusJakartaSans-ExtraBold', color: '#1f2937', marginBottom: 4 },
  cardDesc: { fontSize: 12, color: '#6b7280', marginBottom: 14, lineHeight: 17 },
  cardBtn: {
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
  },
  cardBtnText: { color: '#ffffff', fontFamily: 'PlusJakartaSans-ExtraBold', fontSize: 12 },
});
