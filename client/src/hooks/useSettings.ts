import { useEffect, useState } from 'react';
import axios from 'axios';
import type { Permission } from '../lib/permissions';

import { API_BASE_URL } from '../config';

export interface SettingsUser {
  id: string;
  email: string;
  orgId: string;
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

export interface organizationAddress {
  id: string;
  address: string;
  effectiveFrom: string;
  notes: string | null;
  createdAt: string;
}

export const useAddresses = (enabled: boolean) => {
  const [addresses, setAddresses] = useState<organizationAddress[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      const response = await axios.get<organizationAddress[]>(`${API_BASE_URL}/settings/addresses`);
      setAddresses(response.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [enabled]);

  const createAddress = async (payload: { address: string; effectiveFrom: string; notes?: string }) => {
    await axios.post(`${API_BASE_URL}/settings/addresses`, payload);
    await refresh();
  };

  const updateAddress = async (id: string, payload: { address: string; effectiveFrom: string; notes?: string }) => {
    await axios.patch(`${API_BASE_URL}/settings/addresses/${id}`, payload);
    await refresh();
  };

  const deleteAddress = async (id: string) => {
    await axios.delete(`${API_BASE_URL}/settings/addresses/${id}`);
    await refresh();
  };

  return { addresses, loading, refresh, createAddress, updateAddress, deleteAddress };
};

export interface DocumentSettings {
  city: string | null;
  statuteArticleConvocation: string | null;
  statuteArticleProxies: string | null;
  statuteArticleMembers: string | null;
  statuteArticleBoardVote: string | null;
  statuteArticleBoardElection: string | null;
  maxProxies: number | null;
  outputFolderId: string | null;
  templateConvocationId: string | null;
  templateMinutes1aId: string | null;
  templateMinutes2aId: string | null;
  templateConvocationExtraordinaryStatuteId: string | null;
  templateConvocationExtraordinaryDissolutionId: string | null;
  templateConvocationBoardId: string | null;
  templateMinutesBoardId: string | null;
  // Phase 5: Renamed from varieDefaultText to miscellaneousDefaultText
  miscellaneousDefaultText: string | null;
  // Keep old name during transition for backward compatibility
  varieDefaultText: string | null;
}

export interface ModalityOption {
  id: string;
  type: 'convocation' | 'minutes_opening';
  mode: 'in_person' | 'remote' | 'hybrid' | 'any';
  label: string;
  value: string;
  isDefault: number;
  createdAt: string;
}

export const useDocumentSettings = (enabled: boolean) => {
  const [settings, setSettings] = useState<DocumentSettings | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      const res = await axios.get<DocumentSettings>(`${API_BASE_URL}/settings/documents`);
      setSettings(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [enabled]);

  const save = async (patch: Partial<DocumentSettings>) => {
    const res = await axios.patch<DocumentSettings>(`${API_BASE_URL}/settings/documents`, patch);
    setSettings(res.data);
    return res.data;
  };

  return { settings, loading, refresh, save };
};

export const useModalityOptions = (enabled: boolean) => {
  const [options, setOptions] = useState<ModalityOption[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      const res = await axios.get<ModalityOption[]>(`${API_BASE_URL}/settings/modality-options`);
      setOptions(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [enabled]);

  const create = async (payload: { type: string; mode?: string; label: string; value: string; isDefault?: boolean }) => {
    await axios.post(`${API_BASE_URL}/settings/modality-options`, payload);
    await refresh();
  };

  const update = async (id: string, patch: { label?: string; value?: string; isDefault?: boolean; mode?: string }) => {
    await axios.patch(`${API_BASE_URL}/settings/modality-options/${id}`, patch);
    await refresh();
  };

  const remove = async (id: string) => {
    await axios.delete(`${API_BASE_URL}/settings/modality-options/${id}`);
    await refresh();
  };

  return { options, loading, refresh, create, update, remove };
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
