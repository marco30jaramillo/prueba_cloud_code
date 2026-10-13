import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  TextInput, ActivityIndicator, Image,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useAuthStore, ROLE_LABEL } from '@/lib/store';
import { authAPI } from '@/lib/api';
import { API_URL, APP_VARIANT, WEB_URL } from '@/lib/config';

import { Icon } from '@/components/Icon';
export default function PerfilScreen() {
  const { user, clearAuth, setUser } = useAuthStore();
  const router = useRouter();

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.name ?? '');
  const [savingName, setSavingName] = useState(false);

  const [changingPwd, setChangingPwd] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current: '', next: '', confirm: '' });
  const [savingPwd, setSavingPwd] = useState(false);
  const [verPwd, setVerPwd] = useState({ current: false, next: false, confirm: false });
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  const fotoUrl = user?.photo
    ? (user.photo.startsWith('http') ? user.photo : `${API_URL}${user.photo}`)
    : null;

  const handleCambiarFoto = async () => {
    // Selector de fotos del sistema (Android 13+, iOS 14+): la app solo recibe la foto elegida,
    // así que no pide permiso de acceso a la galería.
    const sel = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (sel.canceled || !sel.assets?.[0]) return;
    const foto = sel.assets[0];
    setSubiendoFoto(true);
    try {
      const subida = await authAPI.uploadPhoto(foto.uri, foto.mimeType);
      const url: string | undefined = subida?.photo ?? subida?.url;
      if (!url) throw new Error('sin url');
      const res = await authAPI.updateProfile(user!.name, url);
      if (res?.status == 'success') {
        setUser({ ...user!, photo: res?.user?.photo ?? url });
        Alert.alert('Listo', 'Foto actualizada.');
      } else {
        Alert.alert('Error', res?.message ?? 'No pudimos guardar la foto.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'No pudimos subir la foto. Intenta de nuevo.');
    } finally {
      setSubiendoFoto(false);
    }
  };

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
    <KeyboardAwareScrollView
      style={styles.root}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      bottomOffset={24}
    >
      {/* Avatar + info */}
      <View style={styles.profileBox}>
        <TouchableOpacity style={styles.avatarWrap} onPress={handleCambiarFoto} disabled={subiendoFoto} activeOpacity={0.8}
          accessibilityLabel="Cambiar foto">
          <View style={styles.avatar}>
            {fotoUrl
              ? <Image source={{ uri: fotoUrl }} style={styles.avatarImg} />
              : <Text style={styles.avatarText}>{initial}</Text>}
            {subiendoFoto && <View style={styles.avatarLoading}><ActivityIndicator color="#ffffff" /></View>}
          </View>
          <Text style={styles.avatarHint}>Cambiar foto</Text>
        </TouchableOpacity>
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
          <View>
            <TextInput
              style={[styles.input, styles.inputNombre]}
              value={newName}
              onChangeText={setNewName}
              autoFocus
              multiline
              placeholder="Nombre completo"
              placeholderTextColor="#6b7280"
            />
            <View style={styles.editRow}>
              <TouchableOpacity style={[styles.saveBtn, { flex: 1 }]} onPress={handleSaveName} disabled={savingName}>
                {savingName ? <ActivityIndicator color="#ffffff" size="small" /> : <Text style={styles.saveBtnText}>Guardar</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setEditingName(false); setNewName(user?.name ?? ''); }}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
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
            <View style={styles.pwdRow}>
              <TextInput style={[styles.input, styles.pwdInput]} value={pwdForm.current} onChangeText={v => setPwdForm(f => ({ ...f, current: v }))} secureTextEntry={!verPwd.current} autoCapitalize="none" autoCorrect={false} placeholder="Contraseña actual" placeholderTextColor="#6b7280" />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setVerPwd(v => ({ ...v, current: !v.current }))} accessibilityLabel={verPwd.current ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                <Icon name={verPwd.current ? 'ocultar' : 'ver'} size={22} color="#4b5563" />
              </TouchableOpacity>
            </View>
            <View style={styles.pwdRow}>
              <TextInput style={[styles.input, styles.pwdInput]} value={pwdForm.next} onChangeText={v => setPwdForm(f => ({ ...f, next: v }))} secureTextEntry={!verPwd.next} autoCapitalize="none" autoCorrect={false} placeholder="Nueva contraseña" placeholderTextColor="#6b7280" />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setVerPwd(v => ({ ...v, next: !v.next }))} accessibilityLabel={verPwd.next ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                <Icon name={verPwd.next ? 'ocultar' : 'ver'} size={22} color="#4b5563" />
              </TouchableOpacity>
            </View>
            <View style={styles.pwdRow}>
              <TextInput style={[styles.input, styles.pwdInput]} value={pwdForm.confirm} onChangeText={v => setPwdForm(f => ({ ...f, confirm: v }))} secureTextEntry={!verPwd.confirm} autoCapitalize="none" autoCorrect={false} placeholder="Confirmar contraseña" placeholderTextColor="#6b7280" />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setVerPwd(v => ({ ...v, confirm: !v.confirm }))} accessibilityLabel={verPwd.confirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                <Icon name={verPwd.confirm ? 'ocultar' : 'ver'} size={22} color="#4b5563" />
              </TouchableOpacity>
            </View>
            <View style={styles.editRow}>
              <TouchableOpacity style={[styles.saveBtn, { flex: 1 }]} onPress={handleChangePwd} disabled={savingPwd}>
                {savingPwd ? <ActivityIndicator color="#ffffff" size="small" /> : <Text style={styles.saveBtnText}>Cambiar</Text>}
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
        <Icon name="nube" size={28} color="#2563eb" />
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

      {APP_VARIANT === 'qa' && <Text style={styles.envNote}>Ambiente de pruebas (QA)</Text>}
    </KeyboardAwareScrollView>
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
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  title: { fontSize: 11, fontFamily: 'PlusJakartaSans-ExtraBold', color: '#6b7280', letterSpacing: 0.5, marginBottom: 10 },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },
  container: { padding: 20, paddingBottom: 40 },
  profileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
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
  avatarWrap: { alignItems: 'center' },
  avatarImg: { width: 56, height: 56, borderRadius: 28 },
  avatarLoading: { position: 'absolute', inset: 0, borderRadius: 28, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  avatarHint: { fontSize: 11, color: '#2563eb', fontFamily: 'PlusJakartaSans-SemiBold', marginTop: 4 },
  inputNombre: { minHeight: 48, textAlignVertical: 'top' },
  pwdRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  pwdInput: { flex: 1 },
  eyeBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 24, fontFamily: 'PlusJakartaSans-ExtraBold', color: '#1e40af' },
  name: { fontSize: 17, fontFamily: 'PlusJakartaSans-ExtraBold', color: '#1f2937' },
  email: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  roleBadge: {
    marginTop: 6,
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  roleText: { fontSize: 12, color: '#2563eb', fontFamily: 'PlusJakartaSans-SemiBold' },
  editTrigger: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldValue: { fontSize: 15, color: '#1f2937', fontFamily: 'PlusJakartaSans-SemiBold' },
  editHint: { fontSize: 13, color: '#2563eb', fontFamily: 'PlusJakartaSans-SemiBold' },
  editRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 11,
    fontSize: 14,
    color: '#1f2937',
    backgroundColor: '#f8fafc',
    marginBottom: 10,
  },
  saveBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { color: '#ffffff', fontFamily: 'PlusJakartaSans-ExtraBold', fontSize: 13 },
  cancelBtn: { paddingHorizontal: 12 },
  cancelBtnText: { color: '#6b7280', fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold' },
  webBtn: {
    backgroundColor: '#ffffff',
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
  webBtnTitle: { fontSize: 15, fontFamily: 'PlusJakartaSans-ExtraBold', color: '#1f2937' },
  webBtnSub: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  webBtnArrow: { marginLeft: 'auto', fontSize: 22, color: '#6b7280' },
  logoutBtn: {
    backgroundColor: '#fee2e2',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  logoutText: { color: '#dc2626', fontFamily: 'PlusJakartaSans-ExtraBold', fontSize: 15 },
  envNote: { textAlign: 'center', color: '#92400e', fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 12, marginTop: 12 },
});
