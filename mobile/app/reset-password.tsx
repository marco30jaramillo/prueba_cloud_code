import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { CampoContrasena } from '@/components/CampoContrasena';
import { colores, fuentes } from '@/lib/tema';
import { avisar } from '@/lib/aviso';

/** Se abre desde el enlace del correo: mivalecito://reset-password?token=... */
export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const router = useRouter();
  const { clearAuth } = useAuthStore();
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [loading, setLoading] = useState(false);

  const guardar = async () => {
    if (!nueva || !confirmar) {
      avisar('Faltan datos', 'Escribe la contraseña nueva dos veces.', undefined, 'aviso');
      return;
    }
    if (nueva !== confirmar) {
      avisar('No coinciden', 'Las dos contraseñas deben ser iguales.', undefined, 'aviso');
      return;
    }
    setLoading(true);
    try {
      await authAPI.resetPassword(String(token), nueva);
      // El servidor cierra todas las sesiones al restablecer: se limpia también esta.
      await clearAuth();
      avisar('Listo', 'Tu contraseña fue cambiada. Inicia sesión con la nueva.', undefined, 'exito');
      router.replace('/login');
    } catch (e: any) {
      if (e?.response) {
        avisar('No pudimos cambiar la contraseña', e.response.data?.message || 'El enlace no es válido o ya venció.', undefined, 'error');
      } else {
        avisar('Sin conexión', 'No pudimos conectarnos. Revisa tu internet e intenta de nuevo.', undefined, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <View style={styles.root}>
        <View style={[styles.card, { margin: 24 }]}>
          <Text style={styles.titulo}>Enlace no válido</Text>
          <Text style={styles.texto}>Este enlace no sirve. Pide uno nuevo desde «¿Olvidaste tu contraseña?».</Text>
          <TouchableOpacity style={styles.btn} onPress={() => router.replace('/forgot-password')} activeOpacity={0.8}>
            <Text style={styles.btnText}>Pedir un enlace nuevo</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAwareScrollView
      style={styles.root}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      bottomOffset={90}
    >
        <View style={styles.card}>
          <Text style={styles.titulo}>Crea tu contraseña nueva</Text>
          <Text style={styles.texto}>Usa al menos 8 caracteres, con mayúscula, minúscula, número y un carácter especial (como ! o @).</Text>
          <Text style={styles.label}>Contraseña nueva</Text>
          <CampoContrasena value={nueva} onChangeText={setNueva} placeholder="Contraseña nueva" returnKeyType="next" />
          <Text style={styles.label}>Repite la contraseña</Text>
          <CampoContrasena value={confirmar} onChangeText={setConfirmar} placeholder="Repite la contraseña" returnKeyType="done" onSubmitEditing={guardar} />
          <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={guardar} disabled={loading} activeOpacity={0.8}>
            {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.btnText}>Cambiar contraseña</Text>}
          </TouchableOpacity>
        </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colores.azulSuave },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: { backgroundColor: colores.superficie, borderRadius: 20, padding: 28 },
  titulo: { fontSize: 20, fontFamily: fuentes.extrabold, color: colores.texto, marginBottom: 8 },
  texto: { fontSize: 15, color: colores.textoSecundario, lineHeight: 22, marginBottom: 8 },
  label: { fontSize: 13, fontFamily: fuentes.semibold, color: colores.texto, marginBottom: 6, marginTop: 14 },
  btn: { backgroundColor: colores.azul, borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 20 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#ffffff', fontFamily: fuentes.extrabold, fontSize: 16 },
});
