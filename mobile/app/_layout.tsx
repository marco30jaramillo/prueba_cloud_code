import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import { useAuthStore } from '@/lib/store';
import { archivosFuentes, colores } from '@/lib/tema';

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
    const inAuth = segments[0] === 'login';
    if (!user && !inAuth) {
      router.replace('/login');
    } else if (user && inAuth) {
      router.replace('/(tabs)');
    }
  }, [user, isLoaded, segments]);

  if (!fuentesListas) return null;

  return (
    <Stack>
      <Stack.Screen name="login" options={{ headerShown: false }} />
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
  );
}
