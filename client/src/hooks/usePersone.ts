import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

import { API_BASE_URL } from '../config';

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  taxId?: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  birthPlace?: string;
  birthCountry?: string;
  gender?: string;
  profession?: string;
  memberNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const usePersone = () => {
  const { t } = useTranslation();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPeople = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/people`);
      setPeople(response.data);
      setError(null);
    } catch (err) {
      setError(t('people.errorLoading', { defaultValue: 'Error loading people' }));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addPerson = async (data: Partial<Person>) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/people`, data);
      setPeople(prev => [...prev, response.data]);
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || t('common.errorAdding', { defaultValue: 'Error adding entry' }));
    }
  };

  useEffect(() => {
    fetchPeople();
  }, []);

  return { people, loading, error, refresh: fetchPeople, addPerson };
};
