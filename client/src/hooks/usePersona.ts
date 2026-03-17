import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import type { Person } from './usePersone';
import type { VolunteerPeriod, MemberPeriod } from './usePeriods';

import { API_BASE_URL } from '../config';

export interface PersonDetails extends Person {
  volunteerPeriods: VolunteerPeriod[];
  memberPeriods: MemberPeriod[];
  boardRoles?: { member: any; generation: any }[];
}

export const usePersona = (id: string) => {
  const { t } = useTranslation();
  const [person, setPerson] = useState<PersonDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/people/${id}`);
      setPerson(res.data);
      setError(null);
    } catch (err: any) {
      setError(t('people.errorLoadingDetails', { defaultValue: 'Error loading details' }));
    } finally {
      setLoading(false);
    }
  };

  const updatePerson = async (data: Partial<PersonDetails>) => {
    try {
      const res = await axios.patch(`${API_BASE_URL}/people/${id}`, data);
      setPerson((prev) => (prev ? { ...prev, ...res.data } : null));
      return res.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || t('common.errorUpdating', { defaultValue: 'Error updating' }));
    }
  };

  const deletePerson = async () => {
    try {
      await axios.delete(`${API_BASE_URL}/people/${id}`);
      return true;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || t('common.errorDeleting', { defaultValue: 'Error deleting' }));
    }
  };

  useEffect(() => {
    if (id) fetchDetails();
  }, [id]);

  return { person, loading, error, refresh: fetchDetails, updatePerson, deletePerson };
};
