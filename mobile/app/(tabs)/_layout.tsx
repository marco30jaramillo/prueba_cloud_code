import { useEffect } from 'react';
import { AppState, type ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { Icon, type NombreIcono } from '@/components/Icon';
import { useAuthStore, useAccesos } from '@/lib/store';

function TabIcon({ name, color, size }: { name: NombreIcono; color: ColorValue; size: number }) {
  return <Icon name={name} size={size} color={color as string} />;
}

export default function TabLayout() {
  const userId = useAuthStore((s) => s.user?.id);
  const cargarModulos = useAuthStore((s) => s.cargarModulos);
  const accesos = useAccesos();

  // Los módulos salen de los permisos del rol; se recargan al volver a la app para que un cambio
  // hecho en «Roles y permisos» se vea sin cerrar sesión.
  useEffect(() => {
    if (!userId) return;
    cargarModulos();
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') cargarModulos();
    });
    return () => sub.remove();
  }, [userId, cargarModulos]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: { borderTopColor: '#e5e7eb', backgroundColor: '#ffffff' },
        tabBarLabelStyle: { fontSize: 11, fontFamily: 'PlusJakartaSans-SemiBold' },
        headerStyle: { backgroundColor: '#ffffff' },
        headerShadowVisible: false,
        headerTintColor: '#1f2937',
        headerTitleStyle: { fontFamily: 'PlusJakartaSans-ExtraBold', fontSize: 17 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          headerTitle: 'Mi Valecito',
          tabBarIcon: ({ color, size }) => <TabIcon name="tienda" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="vales"
        options={{
          title: 'Vales',
          href: accesos.vales ? undefined : null,
          tabBarIcon: ({ color, size }) => <TabIcon name="vale" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="cartera"
        options={{
          title: 'Cartera',
          href: accesos.cartera ? undefined : null,
          tabBarIcon: ({ color, size }) => <TabIcon name="cartera" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="equipo"
        options={{
          title: 'Equipo',
          href: accesos.equipo ? undefined : null,
          tabBarIcon: ({ color, size }) => <TabIcon name="equipo" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <TabIcon name="cliente" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
