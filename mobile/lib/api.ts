import axios from 'axios';
import { API_URL } from './config';

// Token en memoria — se carga desde SecureStore al iniciar
let _token: string | null = null;
export const setApiToken = (t: string | null) => {
  _token = t;
};

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 12000,
});

api.interceptors.request.use((config) => {
  if (_token) config.headers.Authorization = `Bearer ${_token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => Promise.reject(error)
);

/**
 * El backend responde `{ status, <clave>: ... }` (p. ej. `tiendas`, `vales`, `usuarios`).
 * Se acepta también el formato antiguo `{ data: ... }`.
 */
export const pick = <T = any>(res: any, key: string, vacio: any = []): T =>
  (res?.[key] ?? res?.data?.[key] ?? (Array.isArray(vacio) ? (Array.isArray(res?.data) ? res.data : undefined) : res?.data) ?? vacio) as T;

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  },
  forgotPassword: async (email: string) => {
    const { data } = await api.post('/auth/forgot-password', { email });
    return data;
  },
  resetPassword: async (token: string, newPassword: string) => {
    const { data } = await api.post('/auth/reset-password', { token, newPassword });
    return data;
  },
  validate: async () => {
    const { data } = await api.get('/auth/validate');
    return data;
  },
  logout: async () => {
    await api.post('/auth/logout').catch(() => {});
  },
  changePassword: async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    const { data } = await api.patch('/auth/change-password', {
      currentPassword, newPassword, confirmPassword,
    });
    return data;
  },
  updateProfile: async (name: string, photo?: string) => {
    const { data } = await api.patch('/auth/profile', photo ? { name, photo } : { name });
    return data;
  },
  /** Sube la foto (el servidor la recorta y comprime) y devuelve la URL guardada. */
  uploadPhoto: async (uri: string, mimeType?: string) => {
    const form = new FormData();
    const tipo = mimeType || 'image/jpeg';
    const ext = tipo.split('/')[1] || 'jpg';
    form.append('photo', { uri, name: `foto.${ext}`, type: tipo } as any);
    const { data } = await api.post('/upload/photo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
      transformRequest: (d) => d,
    });
    return data;
  },
};

// ─── Tiendas ─────────────────────────────────────────────────────────────────
export const tiendasAPI = {
  getMisTiendas: async () => {
    const { data } = await api.get('/tiendas/mis-tiendas');
    return data;
  },
  getAll: async () => {
    const { data } = await api.get('/tiendas');
    return data;
  },
  getUsuarios: async (id: string) => {
    const { data } = await api.get(`/tiendas/${id}/usuarios`);
    return data;
  },
  addUsuario: async (id: string, userId: string, esPropietario: boolean) => {
    const { data } = await api.post(`/tiendas/${id}/usuarios`, { userId, esPropietario });
    return data;
  },
  removeUsuario: async (id: string, userId: string) => {
    const { data } = await api.delete(`/tiendas/${id}/usuarios/${userId}`);
    return data;
  },
  /** Suma al equipo un vendedor ya registrado, por su correo exacto (propietario o admin). */
  agregarVendedor: async (id: string, email: string) => {
    const { data } = await api.post(`/tiendas/${id}/vendedores`, { email });
    return data;
  },
  /** Crea la cuenta de un vendedor (recibe correo de activación) y lo deja en la tienda. */
  crearVendedor: async (id: string, name: string, email: string) => {
    const { data } = await api.post(`/tiendas/${id}/vendedores/nuevo`, { name, email });
    return data;
  },
};

// ─── Vales ───────────────────────────────────────────────────────────────────
export const valesAPI = {
  getMisVales: async () => {
    const { data } = await api.get('/vales/mis-vales');
    return data;
  },
  getCartera: async (tiendaId: string, estado?: string) => {
    const { data } = await api.get(`/vales/tienda/${tiendaId}`, {
      params: estado ? { estado } : {},
    });
    return data;
  },
  getById: async (id: string) => {
    const { data } = await api.get(`/vales/${id}`);
    return data;
  },
  crear: async (body: {
    tiendaId: string;
    clienteId: string;
    descripcion: string;
    montoTotal: number;
    fechaVencimiento?: string;
    notas?: string;
  }) => {
    const { data } = await api.post('/vales', body);
    return data;
  },
  anular: async (id: string) => {
    const { data } = await api.patch(`/vales/${id}/anular`);
    return data;
  },
  registrarAbono: async (valeId: string, monto: number, notas?: string) => {
    const { data } = await api.post(`/vales/${valeId}/abonos`, { monto, notas });
    return data;
  },
  getAbonos: async (valeId: string) => {
    const { data } = await api.get(`/vales/${valeId}/abonos`);
    return data;
  },
  /** Reparte un pago entre los vales indicados de un cliente, del más antiguo al más reciente. */
  pagoIntegral: async (body: { clienteId: string; monto: number; valeIds: string[] }) => {
    const { data } = await api.post('/vales/pago-integral', body);
    return data;
  },
  anularAbono: async (valeId: string, abonoId: string) => {
    const { data } = await api.patch(`/vales/${valeId}/abonos/${abonoId}/anular`);
    return data;
  },
};

// ─── Users ───────────────────────────────────────────────────────────────────
export const usersAPI = {
  getAll: async () => {
    const { data } = await api.get('/users');
    return data;
  },
  buscarClientes: async (q: string) => {
    const { data } = await api.get('/users/clientes/buscar', { params: { q } });
    return data;
  },
};
