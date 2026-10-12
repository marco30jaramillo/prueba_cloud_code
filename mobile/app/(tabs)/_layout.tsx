import type { ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { Icon, type NombreIcono } from '@/components/Icon';
import { useAuthStore, isAdminRole } from '@/lib/store';

function TabIcon({ name, color, size }: { name: NombreIcono; color: ColorValue; size: number }) {
  return <Icon name={name} size={size} color={color as string} />;
}

export default function TabLayout() {
  const { user } = useAuthStore();
  const canSeeAdmin = isAdminRole(user?.role);

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
          tabBarIcon: ({ color, size }) => <TabIcon name="vale" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="cartera"
        options={{
          title: 'Cartera',
          href: canSeeAdmin ? undefined : null,
          tabBarIcon: ({ color, size }) => <TabIcon name="cartera" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="equipo"
        options={{
          title: 'Equipo',
          href: canSeeAdmin ? undefined : null,
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
