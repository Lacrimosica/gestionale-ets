import { useState, useEffect } from 'react';
import axios from 'axios';

import { API_BASE_URL } from '../config';

export type ExtraordinarySubtype = 'generic' | 'statute_modification' | 'dissolution' | 'merger_split';
export type BoardCouncilSubtype = 'ordinary' | 'extraordinary';

export interface Assembly {
  id: string;
  type: 'ordinary' | 'extraordinary' | 'board_council' | 'constitution';
  subtype?: ExtraordinarySubtype | BoardCouncilSubtype | null;
  totalNumber: number;
  referenceNumber: number;
  referenceYear?: number;
  convocationDate?: string;
  firstCallDate: string;
  oraFirstCall?: string;
  secondCallDate?: string;
  oraSecondCall?: string;
  location: string;
  mode: string;
  boardGenerationId?: string;
  assemblyStatus?: string;
  president: string;
  secretary: string;
  notes?: string;
  googleDocsLink?: string;
  pdfLink?: string;
  createdAt: string;
  updatedAt: string;
  // Pairing info (populated by GET /assemblies list)
  convocationId?: string | null;
  pairedAssemblyId?: string | null;
  pairedAssemblyNumber?: number | null;
  isPrimaryAssembly?: boolean | null;
}

export const useAssemblies = () => {
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssemblies = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/assemblies`);
      setAssemblies(response.data);
      setError(null);
    } catch (err: any) {
      setError('Error loading assemblies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssemblies();
  }, []);

  const createAssembly = async (data: Partial<Assembly>) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}/assemblies`, data);
      await fetchAssemblies();
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const deleteAssembly = async (id: string) => {
    try {
      setLoading(true);
      await axios.delete(`${API_BASE_URL}/assemblies/${id}`);
      await fetchAssemblies();
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Error deleting assembly');
    } finally {
      setLoading(false);
    }
  };

  const deleteAssemblies = async (ids: string[]) => {
    try {
      setLoading(true);
      await Promise.all(ids.map((assemblyId) => axios.delete(`${API_BASE_URL}/assemblies/${assemblyId}`)));
      await fetchAssemblies();
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Error deleting assemblies');
    } finally {
      setLoading(false);
    }
  };

  return { assemblies, loading, error, refresh: fetchAssemblies, createAssembly, deleteAssembly, deleteAssemblies };
};
