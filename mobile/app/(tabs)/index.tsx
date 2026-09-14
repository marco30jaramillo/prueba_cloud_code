import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore, isAdminRole, ROLE_LABEL } from '@/lib/store';

const ACTIONS_ALL = [
  { icon: '➕', label: 'Nuevo Vale', desc: 'Registrar un crédito nuevo', route: '/vale-nuevo', color: '#3b82f6', bg: '#eff6ff' },
  { icon: '📋', label: 'Mis Vales', desc: 'Consultar y gestionar vales', route: '/(tabs)/vales', color: '#10b981', bg: '#f0fdf4' },
];
const ACTIONS_ADMIN = [
  { icon: '💼', label: 'Cartera', desc: 'Panel de indicadores', route: '/(tabs)/cartera', color: '#f59e0b', bg: '#fffbeb' },
  { icon: '👥', label: 'Equipo', desc: 'Gestionar usuarios y roles', route: '/(tabs)/equipo', color: '#8b5cf6', bg: '#f5f3ff' },
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
              <Text style={styles.cardIcon}>{a.icon}</Text>
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
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  /* Capa 1: fondo verde */
  gradientBg1: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#10b981',
  },
  /* Capa 2: media elipse azul desde la derecha — simula gradiente */
  gradientBg2: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#3b82f6',
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
  avatarText: { fontSize: 22, fontWeight: '800', color: '#fff' },
  greeting: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  userName: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 1 },
  rolePill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  roleText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
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
  cardLabel: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  cardDesc: { fontSize: 12, color: '#6b7280', marginBottom: 14, lineHeight: 17 },
  cardBtn: {
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
  },
  cardBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
