/** Paleta y tipografía de marca (docs/marca.md). Fuente: marca/. */
export const colores = {
  azul: '#2563EB',
  azulHover: '#1D4ED8',
  azulPresionado: '#1E40AF',
  azulSuave: '#DBEAFE',
  verde: '#059669',
  verdeSuave: '#D1FAE5',
  verdeTexto: '#065F46',
  rojo: '#DC2626',
  rojoSuave: '#FEE2E2',
  rojoTexto: '#991B1B',
  ambar: '#D97706',
  ambarSuave: '#FEF3C7',
  ambarTexto: '#92400E',
  texto: '#1F2937',
  textoSecundario: '#4B5563',
  textoMinimo: '#6B7280',
  borde: '#E5E7EB',
  fondo: '#F8FAFC',
  superficie: '#FFFFFF',
  gris: '#F3F4F6',
} as const;

/** Color de cada estado visible del vale (lib/estado-vale.ts). */
export const colorEstado: Record<string, string> = {
  pendiente: colores.ambar,
  parcial: colores.azul,
  pagado: colores.verde,
  anulado: colores.textoMinimo,
  mora: colores.rojo,
};

export const fuentes = {
  regular: 'PlusJakartaSans-Regular',
  semibold: 'PlusJakartaSans-SemiBold',
  extrabold: 'PlusJakartaSans-ExtraBold',
} as const;

export const archivosFuentes = {
  [fuentes.regular]: require('../assets/fuentes/PlusJakartaSans-Regular.ttf'),
  [fuentes.semibold]: require('../assets/fuentes/PlusJakartaSans-SemiBold.ttf'),
  [fuentes.extrabold]: require('../assets/fuentes/PlusJakartaSans-ExtraBold.ttf'),
};
