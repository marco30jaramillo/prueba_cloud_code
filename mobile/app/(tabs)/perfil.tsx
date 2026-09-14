import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  TextInput, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useAuthStore, ROLE_LABEL } from '@/lib/store';
import { authAPI } from '@/lib/api';
import { WEB_URL } from '@/lib/config';

export default function PerfilScreen() {
  const { user, clearAuth, setUser } = useAuthStore();
  const router = useRouter();

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.name ?? '');
  const [savingName, setSavingName] = useState(false);

  const [changingPwd, setChangingPwd] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current: '', next: '', confirm: '' });
  const [savingPwd, setSavingPwd] = useState(false);

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    setSavingName(true);
    try {
      const res = await authAPI.updateProfile(newName.trim());
      if (res?.status == 'success') {
        setUser({ ...user!, name: newName.trim() });
        setEditingName(false);
        Alert.alert('Listo', 'Nombre actualizado.');
      } else {
        Alert.alert('Error', res?.message ?? 'No se pudo actualizar.');
      }
    } catch {
      Alert.alert('Error', 'No se pudo guardar.');
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePwd = async () => {
    if (!pwdForm.current || !pwdForm.next || !pwdForm.confirm) {
      Alert.alert('Campos requeridos', 'Completa todos los campos.');
      return;
    }
    if (pwdForm.next !== pwdForm.confirm) {
      Alert.alert('Error', 'Las contraseñas nuevas no coinciden.');
      return;
    }
    setSavingPwd(true);
    try {
      const res = await authAPI.changePassword(pwdForm.current, pwdForm.next, pwdForm.confirm);
      if (res?.status == 'success') {
        setChangingPwd(false);
        setPwdForm({ current: '', next: '', confirm: '' });
        Alert.alert('Listo', 'Contraseña actualizada.');
      } else {
        Alert.alert('Error', res?.message ?? 'Contraseña actual incorrecta.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'No se pudo cambiar la contraseña.');
    } finally {
      setSavingPwd(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          await authAPI.logout();
          await clearAuth();
          router.replace('/login');
        },
      },
    ]);
  };

  const handleOpenWeb = async () => {
    await WebBrowser.openBrowserAsync(WEB_URL);
  };

  const initial = user?.name?.[0]?.toUpperCase() ?? '?';

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {/* Avatar + info */}
      <View style={styles.profileBox}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{ROLE_LABEL[user?.role ?? ''] ?? user?.role}</Text>
          </View>
        </View>
      </View>

      {/* Edit name */}
      <SectionCard title="Nombre">
        {editingName ? (
          <View style={styles.editRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={newName}
              onChangeText={setNewName}
              autoFocus
              placeholder="Nombre completo"
              placeholderTextColor="#9ca3af"
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveName} disabled={savingName}>
              {savingName ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Guardar</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setEditingName(false); setNewName(user?.name ?? ''); }}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.editTrigger} onPress={() => { setEditingName(true); setNewName(user?.name ?? ''); }}>
            <Text style={styles.fieldValue}>{user?.name}</Text>
            <Text style={styles.editHint}>Editar</Text>
          </TouchableOpacity>
        )}
      </SectionCard>

      {/* Change password */}
      <SectionCard title="Contraseña">
        {changingPwd ? (
          <>
            <TextInput style={styles.input} value={pwdForm.current} onChangeText={v => setPwdForm(f => ({ ...f, current: v }))} secureTextEntry placeholder="Contraseña actual" placeholderTextColor="#9ca3af" />
            <TextInput style={styles.input} value={pwdForm.next} onChangeText={v => setPwdForm(f => ({ ...f, next: v }))} secureTextEntry placeholder="Nueva contraseña" placeholderTextColor="#9ca3af" />
            <TextInput style={styles.input} value={pwdForm.confirm} onChangeText={v => setPwdForm(f => ({ ...f, confirm: v }))} secureTextEntry placeholder="Confirmar contraseña" placeholderTextColor="#9ca3af" />
            <View style={styles.editRow}>
              <TouchableOpacity style={[styles.saveBtn, { flex: 1 }]} onPress={handleChangePwd} disabled={savingPwd}>
                {savingPwd ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Cambiar</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setChangingPwd(false); setPwdForm({ current: '', next: '', confirm: '' }); }}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <TouchableOpacity style={styles.editTrigger} onPress={() => setChangingPwd(true)}>
            <Text style={styles.fieldValue}>••••••••</Text>
            <Text style={styles.editHint}>Cambiar</Text>
          </TouchableOpacity>
        )}
      </SectionCard>

      {/* Open web */}
      <TouchableOpacity style={styles.webBtn} onPress={handleOpenWeb} activeOpacity={0.8}>
        <Text style={styles.webBtnIcon}>🌐</Text>
        <View>
          <Text style={styles.webBtnTitle}>Abrir versión web</Text>
          <Text style={styles.webBtnSub}>Accede a funciones avanzadas</Text>
        </View>
        <Text style={styles.webBtnArrow}>›</Text>
      </TouchableOpacity>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={cardStyles.wrap}>
      <Text style={cardStyles.title}>{title}</Text>
      {children}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  wrap: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  title: { fontSize: 11, fontWeight: '700', color: '#9ca3af', letterSpacing: 0.5, marginBottom: 10 },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },
  container: { padding: 20, paddingBottom: 40 },
  profileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: '800', color: '#1e40af' },
  name: { fontSize: 17, fontWeight: '700', color: '#111827' },
  email: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  roleBadge: {
    marginTop: 6,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  roleText: { fontSize: 12, color: '#3b82f6', fontWeight: '600' },
  editTrigger: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldValue: { fontSize: 15, color: '#111827', fontWeight: '500' },
  editHint: { fontSize: 13, color: '#3b82f6', fontWeight: '600' },
  editRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 11,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fafafa',
    marginBottom: 10,
  },
  saveBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  cancelBtn: { paddingHorizontal: 12 },
  cancelBtnText: { color: '#6b7280', fontSize: 13, fontWeight: '600' },
  webBtn: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  webBtnIcon: { fontSize: 28 },
  webBtnTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  webBtnSub: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  webBtnArrow: { marginLeft: 'auto', fontSize: 22, color: '#9ca3af' },
  logoutBtn: {
    backgroundColor: '#fef2f2',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoutText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
});
