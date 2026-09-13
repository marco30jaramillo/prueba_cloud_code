export type UserRole = 'superuser' | 'administrador' | 'vendedor' | 'cliente';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  mustChangePassword?: boolean;
}

export interface AuthResponse {
  status: string;
  message: string;
  user?: User;
  token?: string;
}

export interface ApiError {
  status: string;
  statusCode: number;
  error: string;
  message: string;
  details?: Record<string, any>;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isInitialized: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
}

export interface RoleSchema {
  roleType: UserRole;
  description: string;
  permissions: string[];
  formFields: string[];
  constraints: Record<string, any>;
}
