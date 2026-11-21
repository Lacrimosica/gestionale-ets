import { useState, useEffect } from 'react';
import axios from 'axios';
import { getPermissionsForRole, type Permission } from '../lib/permissions';
import { AuthContext, type AuthUser } from './auth-context';

const setAxiosAuthHeader = (token: string | null) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    return;
  }

  delete axios.defaults.headers.common['Authorization'];
};

setAxiosAuthHeader(localStorage.getItem('token'));

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('user');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        permissions: parsed.permissions?.length ? parsed.permissions : getPermissionsForRole(parsed.role),
      };
    } catch {
      return null;
    }
  });

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAxiosAuthHeader(null);
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      setAxiosAuthHeader(token);
    } else {
      localStorage.removeItem('token');
      setAxiosAuthHeader(null);
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  // Handle unauthorized responses
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use((config) => {
      const latestToken = localStorage.getItem('token');
      if (latestToken) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${latestToken}`;
      }
      return config;
    });

    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          sessionStorage.setItem('session_expired', '1');
          logout();
        }
        return Promise.reject(error);
      }
    );
    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  const login = (newToken: string, newUser: AuthUser) => {
    localStorage.setItem('token', newToken);
    setAxiosAuthHeader(newToken);
    setToken(newToken);
    setUser({
      ...newUser,
      permissions: newUser.permissions?.length ? newUser.permissions : getPermissionsForRole(newUser.role),
    });
  };

  const hasPermission = (permission: Permission) => {
    if (!user) return false;
    return user.permissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated: !!token && !!user, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};
