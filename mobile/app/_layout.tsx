import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useAuthStore } from '@/lib/store';
import { archivosFuentes, colores } from '@/lib/tema';
import { AvisoHost } from '@/components/AvisoHost';

export default function RootLayout() {
  const { user, isLoaded, init } = useAuthStore();
  const [fuentesListas] = useFonts(archivosFuentes);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const seccion = segments[0] as string;
    const publica = ['login', 'forgot-password', 'reset-password'].includes(seccion);
    if (!user && !publica) {
      router.replace('/login');
    } else if (user && (seccion === 'login' || seccion === 'forgot-password')) {
      router.replace('/(tabs)');
    }
  }, [user, isLoaded, segments]);

  if (!fuentesListas) return null;

  return (
    <KeyboardProvider>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ title: 'Recuperar contraseña', headerTintColor: colores.azul, headerShadowVisible: false }} />
        <Stack.Screen name="reset-password" options={{ title: 'Nueva contraseña', headerTintColor: colores.azul, headerShadowVisible: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="vale-nuevo"
          options={{
            presentation: 'modal',
            title: 'Nuevo vale',
            headerTintColor: colores.azul,
            headerStyle: { backgroundColor: colores.superficie },
          }}
        />
        <Stack.Screen
          name="vale/[id]"
          options={{
            title: 'Detalle del vale',
            headerTintColor: colores.azul,
            headerStyle: { backgroundColor: colores.superficie },
            headerShadowVisible: false,
          }}
        />
      </Stack>
      <AvisoHost />
    </KeyboardProvider>
  );
}
