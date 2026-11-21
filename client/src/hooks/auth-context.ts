import { createContext, useContext } from 'react';
import type { Permission } from '../lib/permissions';

export interface AuthUser {
  id?: string;
  email: string;
  orgId: string;
  role: string;
  permissions: Permission[];
}

interface AuthContextType {
  token: string | null;
  user: AuthUser | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
  hasPermission: (permission: Permission) => boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
