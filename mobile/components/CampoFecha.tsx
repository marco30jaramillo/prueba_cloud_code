import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Icon } from '@/components/Icon';
import { fechaLegible, inicioDelDia, noAntesDeHoy } from '@/lib/fechas';
import { colores, fuentes } from '@/lib/tema';

interface Props {
  value: Date | null;
  onChange: (fecha: Date | null) => void;
  /** Muestra «Quitar» para dejar el campo vacío (campo opcional). */
  opcional?: boolean;
}

/**
 * Fecha elegida con el calendario del sistema, sin escribirla. No deja elegir días anteriores
 * a hoy. Android abre su diálogo; iOS muestra el calendario debajo del campo.
 */
export function CampoFecha({ value, onChange, opcional }: Props) {
  const [abierto, setAbierto] = useState(false);
  const hoy = inicioDelDia();

  const alCambiar = (evento: DateTimePickerEvent, fecha?: Date) => {
    if (Platform.OS === 'android') setAbierto(false);
    if (evento.type === 'set' && fecha) onChange(noAntesDeHoy(fecha));
  };

  return (
    <View>
      <View style={styles.fila}>
        <TouchableOpacity style={styles.campo} onPress={() => setAbierto((a) => !a)} activeOpacity={0.8}>
          <Icon name="calendario" size={18} color={colores.azul} />
          <Text style={[styles.texto, !value && styles.placeholder]}>
            {value ? fechaLegible(value) : 'Sin fecha de vencimiento'}
          </Text>
        </TouchableOpacity>
        {opcional && value && (
          <TouchableOpacity onPress={() => { onChange(null); setAbierto(false); }} hitSlop={8} style={styles.quitar}>
            <Text style={styles.quitarText}>Quitar</Text>
          </TouchableOpacity>
        )}
      </View>

      {abierto && (
        <>
          <DateTimePicker
            value={value ?? hoy}
            mode="date"
            minimumDate={hoy}
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            locale="es-CO"
            onChange={alCambiar}
          />
          {Platform.OS === 'ios' && (
            <TouchableOpacity style={styles.listo} onPress={() => setAbierto(false)}>
              <Text style={styles.listoText}>Listo</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  campo: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: colores.borde, borderRadius: 12, padding: 13,
    backgroundColor: colores.superficie,
  },
  texto: { fontSize: 15, color: colores.texto, fontFamily: fuentes.semibold },
  placeholder: { color: colores.textoMinimo, fontFamily: fuentes.regular },
  quitar: { paddingVertical: 8 },
  quitarText: { color: colores.textoMinimo, fontFamily: fuentes.semibold, fontSize: 13 },
  listo: { alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 4 },
  listoText: { color: colores.azul, fontFamily: fuentes.extrabold, fontSize: 15 },
});
