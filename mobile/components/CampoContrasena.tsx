import { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, type TextInputProps } from 'react-native';
import { Icon } from '@/components/Icon';

/** Campo de contraseña con botón para mostrar u ocultar lo escrito. */
export function CampoContrasena(props: TextInputProps) {
  const [ver, setVer] = useState(false);
  return (
    <View style={styles.fila}>
      <TextInput
        {...props}
        style={[styles.input, props.style]}
        secureTextEntry={!ver}
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor="#6b7280"
      />
      <TouchableOpacity
        style={styles.ojo}
        onPress={() => setVer((v) => !v)}
        accessibilityLabel={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        <Icon name={ver ? 'ocultar' : 'ver'} size={22} color="#4b5563" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { position: 'relative', justifyContent: 'center' },
  input: {
    borderWidth: 1.5,
    borderColor: '#dbeafe',
    borderRadius: 12,
    padding: 13,
    paddingRight: 52,
    fontSize: 15,
    color: '#1f2937',
    backgroundColor: '#f8fafc',
  },
  ojo: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 48, justifyContent: 'center', alignItems: 'center' },
});
