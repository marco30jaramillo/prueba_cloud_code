import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '@/lib/store';

export default function RootLayout() {
  const { user, isLoaded, init } = useAuthStore();
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

  return (
    <Stack>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="vale-nuevo"
        options={{
          presentation: 'modal',
          title: 'Nuevo Vale',
          headerTintColor: '#3b82f6',
          headerStyle: { backgroundColor: '#fff' },
        }}
      />
      <Stack.Screen
        name="vale/[id]"
        options={{
          title: 'Detalle del Vale',
          headerTintColor: '#3b82f6',
          headerStyle: { backgroundColor: '#fff' },
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}
