import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import type { AttendanceRecord, EligibleMember } from '../types/assembly';

export interface UseAttendanceReturn {
  attendanceRecords: AttendanceRecord[];
  eligibleMembers: EligibleMember[];
  eligibleLoading: boolean;
  savingAttendance: string | null;
  attendanceSearch: string;
  setAttendanceRecords: (records: AttendanceRecord[]) => void;
  setEligibleMembers: (members: EligibleMember[]) => void;
  setAttendanceSearch: (search: string) => void;
  handleSetAttendance: (personId: string, mode: 'present' | 'remote' | 'proxy', delegatorId?: string) => Promise<void>;
  handleRemoveAttendance: (personId: string) => Promise<void>;
}

export const useAttendance = (id: string | null, isOpen: boolean, attendanceOpen: boolean): UseAttendanceReturn => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [eligibleMembers, setEligibleMembers] = useState<EligibleMember[]>([]);
  const [eligibleLoading, setEligibleLoading] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState<string | null>(null);
  const [attendanceSearch, setAttendanceSearch] = useState('');

  // Load eligible members when attendance or doc panel opens
  useEffect(() => {
    if ((!attendanceOpen && !isOpen) || !id || eligibleMembers.length > 0) return;
    setEligibleLoading(true);
    axios.get<EligibleMember[]>(`${API_BASE_URL}/assemblies/${id}/eligible-members`)
      .then((res) => setEligibleMembers(res.data))
      .catch(() => undefined)
      .finally(() => setEligibleLoading(false));
  }, [attendanceOpen, isOpen, id, eligibleMembers.length]);

  const handleSetAttendance = async (personId: string, mode: 'present' | 'remote' | 'proxy', delegatorId?: string) => {
    if (!id) return;
    setSavingAttendance(personId);
    try {
      const res = await axios.post<AttendanceRecord>(`${API_BASE_URL}/assemblies/${id}/attendance`, {
        personId,
        mode,
        delegatorId: delegatorId ?? null,
      });
      setAttendanceRecords((prev) => {
        const without = prev.filter((r) => r.personId !== personId);
        return [...without, res.data];
      });
    } finally {
      setSavingAttendance(null);
    }
  };

  const handleRemoveAttendance = async (personId: string) => {
    if (!id) return;
    setSavingAttendance(personId);
    try {
      await axios.delete(`${API_BASE_URL}/assemblies/${id}/attendance/${personId}`);
      setAttendanceRecords((prev) => prev.filter((r) => r.personId !== personId));
    } finally {
      setSavingAttendance(null);
    }
  };

  return {
    attendanceRecords,
    eligibleMembers,
    eligibleLoading,
    savingAttendance,
    attendanceSearch,
    setAttendanceRecords,
    setEligibleMembers,
    setAttendanceSearch,
    handleSetAttendance,
    handleRemoveAttendance,
  };
};
