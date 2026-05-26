import { useState, useEffect } from 'react';
import axios from 'axios';

import { API_BASE_URL } from '../config';

export interface Convocation {
  id: string;
  assemblyId: string;
  secondAssemblyId?: string | null;
  date: string;
  content?: string | null;
  documentLink?: string | null;
  proxyFormLink?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const useConvocations = (assemblyId?: string) => {
  const [list, setList] = useState<Convocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchList = async () => {
    try {
      setLoading(true);
      const url = assemblyId
        ? `${API_BASE_URL}/convocations?assemblyId=${assemblyId}`
        : `${API_BASE_URL}/convocations`;
      const res = await axios.get<Convocation[]>(url);
      setList(res.data);
      setError(null);
    } catch (err) {
      setError('Error loading convocations');
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [assemblyId]);

  const create = async (data: Partial<Convocation>) => {
    const res = await axios.post<Convocation>(`${API_BASE_URL}/convocations`, {
      ...data,
      assemblyId: data.assemblyId || assemblyId,
    });
    await fetchList();
    return res.data;
  };

  const update = async (id: string, data: Partial<Convocation>) => {
    await axios.patch(`${API_BASE_URL}/convocations/${id}`, data);
    await fetchList();
  };

  const remove = async (id: string) => {
    await axios.delete(`${API_BASE_URL}/convocations/${id}`);
    await fetchList();
  };

  return { convocations: list, loading, error, refresh: fetchList, create, update, remove };
};
