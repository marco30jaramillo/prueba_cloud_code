import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore, isAdminRole, ROLE_LABEL } from '@/lib/store';

const ACTIONS_ALL = [
  { icon: '➕', label: 'Nuevo Vale', route: '/vale-nuevo', color: '#3b82f6', bg: '#eff6ff' },
  { icon: '📋', label: 'Mis Vales', route: '/(tabs)/vales', color: '#10b981', bg: '#f0fdf4' },
];
const ACTIONS_ADMIN = [
  { icon: '💼', label: 'Cartera', route: '/(tabs)/cartera', color: '#f59e0b', bg: '#fffbeb' },
  { icon: '👥', label: 'Equipo', route: '/(tabs)/equipo', color: '#8b5cf6', bg: '#f5f3ff' },
];

export default function HomeScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const canAdmin = isAdminRole(user?.role);
  const actions = canAdmin ? [...ACTIONS_ALL, ...ACTIONS_ADMIN] : ACTIONS_ALL;

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Welcome banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerGreeting}>Hola, {user?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.bannerRole}>{ROLE_LABEL[user?.role ?? ''] ?? user?.role}</Text>
        </View>

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Acciones rápidas</Text>
        <View style={styles.grid}>
          {actions.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={[styles.card, { backgroundColor: a.bg, borderLeftColor: a.color }]}
              onPress={() => router.push(a.route as any)}
              activeOpacity={0.75}
            >
              <Text style={styles.cardIcon}>{a.icon}</Text>
              <Text style={[styles.cardLabel, { color: a.color }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Shortcut to vale nuevo - prominent CTA */}
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => router.push('/vale-nuevo')}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaBtnText}>+ Registrar nuevo vale</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },
  container: { padding: 20, paddingBottom: 32 },

  banner: {
    backgroundColor: '#3b82f6',
    borderRadius: 18,
    padding: 22,
    marginBottom: 28,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  bannerGreeting: { fontSize: 24, fontWeight: '800', color: '#fff' },
  bannerRole: { color: '#bfdbfe', marginTop: 4, fontSize: 14, fontWeight: '500' },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#6b7280', marginBottom: 12, letterSpacing: 0.3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  card: {
    borderRadius: 14,
    padding: 18,
    width: '47%',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardIcon: { fontSize: 30, marginBottom: 10 },
  cardLabel: { fontSize: 14, fontWeight: '700' },

  ctaBtn: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  ctaBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
