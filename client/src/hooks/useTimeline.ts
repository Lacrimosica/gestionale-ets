import { useState, useEffect } from 'react';
import axios from 'axios';

import { API_BASE_URL } from '../config';

export interface TimelineAgendaItem {
  number: number;
  title: string;
  description?: string | null;
}

export interface TimelineEntry {
  id: string;
  type: 'assembly' | 'member_admission' | 'member_resignation';
  label: string;
  start: string;
  end: string;
  subType?: string;
  status?: string;
  totalNumber?: number;
  referenceNumber?: number;
  referenceYear?: number | null;
  googleDocsLink?: string;
  pdfLink?: string;
  location?: string;
  president?: string;
  agendaItems?: TimelineAgendaItem[];
}

export interface MembershipHistory {
  id: string;
  firstName: string;
  lastName: string;
  admission: string;
  resignation: string | null;
}

export const useTimeline = () => {
  const [data, setData] = useState<{ events: TimelineEntry[], membershipHistory: MembershipHistory[] }>({
    events: [],
    membershipHistory: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/timeline`);
      setData(response.data);
      setError(null);
    } catch (err: any) {
      setError('Error loading timeline');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { data, loading, error, refresh: fetchData };
};
