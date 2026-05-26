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
  isStudent?: boolean;
  isEmployee?: boolean;
  memberNumber?: string;
  notes?: string;
  cfValidation?: string | null; // null = never checked, "OK", or JSON array of error strings
  userId?: string | null; // optional link to user account
  // Retention / data-lifecycle flags
  // Phase 5: New English-named fields
  isInVolunteerRegistryPhysical?: number | boolean;
  volunteerRegistryStartDate?: string | null;
  volunteerRegistryEndDate?: string | null;
  appearsInRuntsProceedings?: number | boolean;
  // Keep old Italian names during transition for backward compatibility
  inLibroVolontariCartaceo?: number | boolean;
  libroVolontariStartDate?: string | null;
  libroVolontariEndDate?: string | null;
  appearsInRuntsVerbale?: number | boolean;
  canBeRemoved?: number | boolean;
  needsRegularization?: number | boolean;
  isPresumedNonExistent?: number | boolean;
  createdAt: string;
  updatedAt: string;
  // Status flags embedded by the list API
  isActiveMember?: number;
  isMember?: number;
  isVolunteer?: number;
  isResigned?: number;
  activeMemberPeriodId?: string | null;
}

export const usePeople = (filter?: string) => {
  const { t } = useTranslation();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPeople = async () => {
    try {
      setLoading(true);
      const params = filter && filter !== 'all' ? `?filter=${encodeURIComponent(filter)}` : '';
      const response = await axios.get(`${API_BASE_URL}/people${params}`);
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
  }, [filter]);

  return { people, loading, error, refresh: fetchPeople, addPerson };
};
