import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { authAPI } from '@/lib/api';
import { colores, fuentes } from '@/lib/tema';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const enviar = async () => {
    const correo = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(correo)) {
      Alert.alert('Correo no válido', 'Escribe tu correo completo, por ejemplo nombre@correo.com.');
      return;
    }
    setLoading(true);
    try {
      await authAPI.forgotPassword(correo);
      setEnviado(true);
    } catch (e: any) {
      if (e?.response) {
        Alert.alert(e.response.status === 429 ? 'Demasiadas solicitudes' : 'No pudimos enviar el correo',
          e.response.data?.message || 'Intenta de nuevo en unos minutos.');
      } else {
        Alert.alert('Sin conexión', 'No pudimos conectarnos. Revisa tu internet e intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          {enviado ? (
            <>
              <Text style={styles.titulo}>Revisa tu correo</Text>
              <Text style={styles.texto}>
                Si ese correo está registrado, te enviamos un enlace para crear una contraseña nueva.
                Ábrelo desde este celular y te llevará a la app. Si no lo ves, mira también la carpeta de spam.
              </Text>
              <TouchableOpacity style={styles.btn} onPress={() => router.replace('/login')} activeOpacity={0.8}>
                <Text style={styles.btnText}>Volver a iniciar sesión</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.titulo}>¿Olvidaste tu contraseña?</Text>
              <Text style={styles.texto}>Escribe tu correo y te enviamos un enlace para crear una nueva.</Text>
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
                returnKeyType="send"
                onSubmitEditing={enviar}
              />
              <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={enviar} disabled={loading} activeOpacity={0.8}>
                {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.btnText}>Enviar enlace</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colores.azulSuave },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: { backgroundColor: colores.superficie, borderRadius: 20, padding: 28 },
  titulo: { fontSize: 20, fontFamily: fuentes.extrabold, color: colores.texto, marginBottom: 8 },
  texto: { fontSize: 15, color: colores.textoSecundario, lineHeight: 22, marginBottom: 8 },
  label: { fontSize: 13, fontFamily: fuentes.semibold, color: colores.texto, marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1.5, borderColor: colores.azulSuave, borderRadius: 12, padding: 13,
    fontSize: 15, color: colores.texto, backgroundColor: colores.fondo,
  },
  btn: { backgroundColor: colores.azul, borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 20 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#ffffff', fontFamily: fuentes.extrabold, fontSize: 16 },
});
