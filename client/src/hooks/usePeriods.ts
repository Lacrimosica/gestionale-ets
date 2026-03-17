import { useState } from 'react';
import axios from 'axios';

import { API_BASE_URL } from '../config';

export interface VolunteerPeriod {
  id: string;
  personId: string;
  status: 'active' | 'resigned' | 'suspended';
  enrollmentDate: string;
  exitDate?: string;
  exitReason?: string;
  notes?: string;
  createdAt: string;
}

export interface MemberPeriod {
  id: string;
  personId: string;
  volunteerPeriodId: string;
  admissionDate: string;
  resignationDate?: string;
  exitReason?: string;
  admissionAssemblyId?: string;
  exitAssemblyId?: string;
  notes?: string;
  createdAt: string;
}

export const usePeriods = (personId?: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startVolunteering = async (data: Partial<VolunteerPeriod>) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}/periods/volunteers`, { ...data, personId });
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const endVolunteering = async (periodId: string, data: { exitDate: string; exitReason: string }) => {
    try {
      setLoading(true);
      await axios.patch(`${API_BASE_URL}/periods/volunteers/${periodId}/exit`, data);
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const startMembership = async (data: Partial<MemberPeriod>) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}/periods/members`, { ...data, personId });
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const endMembership = async (periodId: string, data: { resignationDate: string; exitReason?: string }) => {
    try {
      setLoading(true);
      await axios.patch(`${API_BASE_URL}/periods/members/${periodId}/resignation`, data);
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const getActiveVolunteers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/periods/volunteers/active`);
      return response.data;
    } catch (err: any) {
      setError('Error loading volunteers');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getActiveMembers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/periods/members/active`);
      return response.data;
    } catch (err: any) {
      setError('Error loading members');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getAllMembers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/periods/members`);
      return response.data;
    } catch (err: any) {
      setError('Error loading members');
      return [];
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, startVolunteering, endVolunteering, startMembership, endMembership, getActiveVolunteers, getActiveMembers, getAllMembers };
};
