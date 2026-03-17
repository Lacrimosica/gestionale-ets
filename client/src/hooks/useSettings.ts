import { useEffect, useState } from 'react';
import axios from 'axios';
import type { Permission } from '../lib/permissions';

import { API_BASE_URL } from '../config';

export interface SettingsUser {
  id: string;
  email: string;
  role: string;
  permissions: Permission[];
  isCoreAdmin?: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

interface CreateSettingsUserInput {
  email: string;
  password: string;
  role: string;
  permissions: Permission[];
}

interface UpdateSettingsUserInput {
  email: string;
  role: string;
  permissions: Permission[];
}

export const useSettingsUsers = (enabled: boolean) => {
  const [users, setUsers] = useState<SettingsUser[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      const response = await axios.get<SettingsUser[]>(`${API_BASE_URL}/settings/users`);
      setUsers(response.data);
      setError(null);
    } catch {
      setError('Errore nel caricamento degli utenti amministrativi.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [enabled]);

  const createUser = async (payload: CreateSettingsUserInput) => {
    const response = await axios.post<SettingsUser>(`${API_BASE_URL}/settings/users`, payload);
    await refresh();
    return response.data;
  };

  const updateUser = async (id: string, payload: UpdateSettingsUserInput) => {
    const response = await axios.put<SettingsUser>(`${API_BASE_URL}/settings/users/${id}`, payload);
    await refresh();
    return response.data;
  };

  const deleteUser = async (id: string) => {
    await axios.delete(`${API_BASE_URL}/settings/users/${id}`);
    await refresh();
  };

  return {
    users,
    loading,
    error,
    refresh,
    createUser,
    updateUser,
    deleteUser,
  };
};

export const changePassword = async (currentPassword: string, newPassword: string) => {
  await axios.post(`${API_BASE_URL}/settings/change-password`, {
    currentPassword,
    newPassword,
  });
};

export const resetUserPassword = async (userId: string, newPassword: string) => {
  await axios.post(`${API_BASE_URL}/settings/users/${userId}/reset-password`, {
    newPassword,
  });
};
