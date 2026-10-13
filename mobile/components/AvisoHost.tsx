import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';
import { avisosStore, descartar, registrarHost, responder, type BotonAviso, type TonoAviso } from '@/lib/aviso';
import { colores, fuentes } from '@/lib/tema';
import { Icon, type NombreIcono } from './Icon';

const ESTILO_TONO: Record<TonoAviso, { icono: NombreIcono; color: string; fondo: string }> = {
  exito: { icono: 'exito', color: colores.verdeTexto, fondo: colores.verdeSuave },
  error: { icono: 'error', color: colores.rojoTexto, fondo: colores.rojoSuave },
  peligro: { icono: 'alerta', color: colores.rojoTexto, fondo: colores.rojoSuave },
  aviso: { icono: 'alerta', color: colores.ambarTexto, fondo: colores.ambarSuave },
  info: { icono: 'informacion', color: colores.azulPresionado, fondo: colores.azulSuave },
};

/**
 * Pinta el primer aviso de la cola (lib/aviso.ts). Va en app/_layout.tsx y además dentro de cada
 * pantalla con `presentation: 'modal'`: en iOS un Modal montado en la raíz no se ve encima de una
 * pantalla modal nativa. Si hay varios montados, solo pinta el último.
 */
export function AvisoHost() {
  const [hostId, setHostId] = useState<number | null>(null);
  useEffect(() => {
    const [id, quitar] = registrarHost();
    setHostId(id);
    return quitar;
  }, []);
  const activo = useStore(avisosStore, (s) => s.hosts[s.hosts.length - 1] === hostId);
  const aviso = useStore(avisosStore, (s) => s.cola[0]);
  if (!aviso || !activo) return null;

  const tono = ESTILO_TONO[aviso.tono];
  // El botón de cancelar va primero (a la izquierda), como en los cuadros del sistema.
  const botones = [...aviso.botones].sort((a, b) => Number(b.style === 'cancel') - Number(a.style === 'cancel'));
  const enFila = botones.length === 2;

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent onRequestClose={() => descartar(aviso)}>
      <Pressable style={styles.fondo} onPress={() => descartar(aviso)}>
        <Pressable style={styles.cuadro} onPress={() => {}} accessibilityRole="alert">
          <View style={[styles.icono, { backgroundColor: tono.fondo }]}>
            <Icon name={tono.icono} size={28} color={tono.color} />
          </View>
          <Text style={styles.titulo}>{aviso.titulo}</Text>
          {!!aviso.mensaje && <Text style={styles.mensaje}>{aviso.mensaje}</Text>}
          <View style={[styles.botones, enFila && styles.botonesFila]}>
            {botones.map((b, i) => (
              <Boton key={i} boton={b} tono={aviso.tono} enFila={enFila} onPress={() => responder(aviso.id, b)} />
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Boton({ boton, tono, enFila, onPress }: { boton: BotonAviso; tono: TonoAviso; enFila: boolean; onPress: () => void }) {
  const secundario = boton.style === 'cancel';
  const fondo = secundario
    ? colores.gris
    : boton.style === 'destructive' || tono === 'peligro'
      ? colores.rojo
      : colores.azul;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.boton, enFila && styles.botonFila, { backgroundColor: fondo }, pressed && styles.presionado]}
    >
      <Text style={[styles.textoBoton, { color: secundario ? colores.texto : colores.superficie }]}>{boton.text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  cuadro: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colores.superficie,
    borderRadius: 20,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  icono: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  titulo: {
    fontFamily: fuentes.extrabold,
    fontSize: 18,
    color: colores.texto,
    textAlign: 'center',
    marginBottom: 6,
  },
  mensaje: {
    fontFamily: fuentes.regular,
    fontSize: 15,
    lineHeight: 21,
    color: colores.textoSecundario,
    textAlign: 'center',
  },
  botones: {
    alignSelf: 'stretch',
    marginTop: 20,
    gap: 8,
  },
  botonesFila: {
    flexDirection: 'row',
  },
  boton: {
    minHeight: 46,
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonFila: {
    flex: 1,
  },
  presionado: {
    opacity: 0.85,
  },
  textoBoton: {
    fontFamily: fuentes.semibold,
    fontSize: 15,
  },
});
