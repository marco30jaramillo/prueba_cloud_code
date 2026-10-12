import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { authAPI } from '@/lib/api';
import { Logo } from '@/components/Logo';
import { useAuthStore } from '@/lib/store';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const handleLogin = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      Alert.alert('Campos requeridos', 'Ingresa tu correo y contraseña.');
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.login(trimmedEmail, password);
      if (res?.status == 'success' && res?.token) {
        await setAuth(res.token, res.user);
        router.replace('/(tabs)');
      } else {
        Alert.alert('Error', res?.message || 'Credenciales incorrectas.');
      }
    } catch (e: any) {
      if (e?.response?.status === 403 && e?.response?.data?.code === 'ACCOUNT_PENDING_ACTIVATION') {
        Alert.alert(
          'Cuenta pendiente de activación',
          'Tu cuenta aún no está activada. Revisa tu correo (también la carpeta de spam) y abre el enlace para activarla.'
        );
        return;
      }
      if (e?.response) {
        // El servidor respondió: no es un problema de conexión (credenciales, bloqueo, etc.).
        const msg = e.response.data?.message || 'No pudimos iniciar sesión. Intenta de nuevo.';
        Alert.alert(e.response.status === 429 ? 'Demasiados intentos' : 'No pudimos iniciar sesión', msg);
      } else {
        Alert.alert('Sin conexión', 'No pudimos conectarnos. Revisa tu internet e intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Logo alto={56} conNombre={false} />
          <Text style={styles.appName}>Mi Valecito</Text>
          <Text style={styles.tagline}>Tus vales, claros y al día</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Iniciar sesión</Text>

          <Text style={styles.label}>Correo electrónico</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="usuario@ejemplo.com"
            placeholderTextColor="#6b7280"
            returnKeyType="next"
          />

          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor="#6b7280"
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color="#ffffff" />
              : <Text style={styles.btnText}>Ingresar</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#dbeafe' },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  hero: { alignItems: 'center', marginBottom: 36 },
  logo: { fontSize: 72, marginBottom: 8 },
  appName: { fontSize: 30, fontFamily: 'PlusJakartaSans-ExtraBold', color: '#1e40af', letterSpacing: -0.5 },
  tagline: { color: '#6b7280', marginTop: 6, fontSize: 15 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 28,
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  cardTitle: { fontSize: 20, fontFamily: 'PlusJakartaSans-ExtraBold', color: '#1f2937', marginBottom: 16 },
  label: { fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold', color: '#374151', marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1.5,
    borderColor: '#dbeafe',
    borderRadius: 12,
    padding: 13,
    fontSize: 15,
    color: '#1f2937',
    backgroundColor: '#f8fafc',
  },
  btn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 28,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#ffffff', fontFamily: 'PlusJakartaSans-ExtraBold', fontSize: 16 },
});
