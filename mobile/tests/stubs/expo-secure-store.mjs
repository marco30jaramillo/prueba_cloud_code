// Sustituto en memoria de expo-secure-store (el real exige módulo nativo).
// Solo para pruebas; la app usa el paquete real.
const memoria = new Map();
export const __estado = { fallar: false };

const verificar = () => {
  if (__estado.fallar) throw new Error('SecureStore no disponible (simulado)');
};

export const setItemAsync = async (clave, valor) => {
  verificar();
  memoria.set(clave, valor);
};
export const getItemAsync = async (clave) => {
  verificar();
  return memoria.has(clave) ? memoria.get(clave) : null;
};
export const deleteItemAsync = async (clave) => {
  verificar();
  memoria.delete(clave);
};
export const __claves = () => [...memoria.keys()];
export const __limpiar = () => memoria.clear();
