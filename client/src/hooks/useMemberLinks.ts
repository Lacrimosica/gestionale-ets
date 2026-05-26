import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export type LinkedMemberEvent = {
  id: string;
  personId: string;
  admissionDate?: string;
  resignationDate?: string;
  firstName: string;
  lastName: string;
};

export interface UseMemberLinksReturn {
  memberLinks: { admissions: LinkedMemberEvent[]; resignations: LinkedMemberEvent[] };
  unlinkedPeriods: { admissions: LinkedMemberEvent[]; resignations: LinkedMemberEvent[] };
  memberLinksLoading: boolean;
  showAdmissionPicker: boolean;
  showResignationPicker: boolean;
  admissionPickerSearch: string;
  resignationPickerSearch: string;
  linkingPeriodId: string | null;
  unlinkingPeriodId: string | null;
  setMemberLinks: (links: { admissions: LinkedMemberEvent[]; resignations: LinkedMemberEvent[] }) => void;
  setUnlinkedPeriods: (periods: { admissions: LinkedMemberEvent[]; resignations: LinkedMemberEvent[] }) => void;
  setShowAdmissionPicker: (show: boolean) => void;
  setShowResignationPicker: (show: boolean) => void;
  setAdmissionPickerSearch: (search: string) => void;
  setResignationPickerSearch: (search: string) => void;
  loadMemberLinks: () => Promise<void>;
  handleLinkAdmission: (periodId: string) => Promise<void>;
  handleUnlinkAdmission: (periodId: string) => Promise<void>;
  handleLinkResignation: (periodId: string) => Promise<void>;
  handleUnlinkResignation: (periodId: string) => Promise<void>;
  dateDiffDays: (d1: string, d2: string) => number;
}

export const useMemberLinks = (id: string | null): UseMemberLinksReturn => {
  const [memberLinks, setMemberLinks] = useState<{ admissions: LinkedMemberEvent[]; resignations: LinkedMemberEvent[] }>({ admissions: [], resignations: [] });
  const [unlinkedPeriods, setUnlinkedPeriods] = useState<{ admissions: LinkedMemberEvent[]; resignations: LinkedMemberEvent[] }>({ admissions: [], resignations: [] });
  const [memberLinksLoading, setMemberLinksLoading] = useState(false);
  const [showAdmissionPicker, setShowAdmissionPicker] = useState(false);
  const [showResignationPicker, setShowResignationPicker] = useState(false);
  const [admissionPickerSearch, setAdmissionPickerSearch] = useState('');
  const [resignationPickerSearch, setResignationPickerSearch] = useState('');
  const [linkingPeriodId, setLinkingPeriodId] = useState<string | null>(null);
  const [unlinkingPeriodId, setUnlinkingPeriodId] = useState<string | null>(null);

  const loadMemberLinks = useCallback(async () => {
    if (!id) return;
    setMemberLinksLoading(true);
    try {
      const [linksRes, unlinkedRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/assemblies/${id}/member-links`),
        axios.get(`${API_BASE_URL}/periods/members/unlinked`),
      ]);
      setMemberLinks(linksRes.data);
      setUnlinkedPeriods(unlinkedRes.data);
    } catch {
      // silent
    } finally {
      setMemberLinksLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadMemberLinks();
  }, [loadMemberLinks]);

  const dateDiffDays = (d1: string, d2: string) =>
    Math.abs(new Date(d1).getTime() - new Date(d2).getTime()) / (1000 * 60 * 60 * 24);

  const handleLinkAdmission = async (periodId: string) => {
    setLinkingPeriodId(periodId);
    try {
      await axios.patch(`${API_BASE_URL}/periods/members/${periodId}/set-assembly`, { admissionAssemblyId: id });
      await loadMemberLinks();
      setShowAdmissionPicker(false);
      setAdmissionPickerSearch('');
    } finally {
      setLinkingPeriodId(null);
    }
  };

  const handleUnlinkAdmission = async (periodId: string) => {
    setUnlinkingPeriodId(periodId);
    try {
      await axios.patch(`${API_BASE_URL}/periods/members/${periodId}/set-assembly`, { admissionAssemblyId: null });
      await loadMemberLinks();
    } finally {
      setUnlinkingPeriodId(null);
    }
  };

  const handleLinkResignation = async (periodId: string) => {
    setLinkingPeriodId(periodId);
    try {
      await axios.patch(`${API_BASE_URL}/periods/members/${periodId}/set-assembly`, { exitAssemblyId: id });
      await loadMemberLinks();
      setShowResignationPicker(false);
      setResignationPickerSearch('');
    } finally {
      setLinkingPeriodId(null);
    }
  };

  const handleUnlinkResignation = async (periodId: string) => {
    setUnlinkingPeriodId(periodId);
    try {
      await axios.patch(`${API_BASE_URL}/periods/members/${periodId}/set-assembly`, { exitAssemblyId: null });
      await loadMemberLinks();
    } finally {
      setUnlinkingPeriodId(null);
    }
  };

  return {
    memberLinks,
    unlinkedPeriods,
    memberLinksLoading,
    showAdmissionPicker,
    showResignationPicker,
    admissionPickerSearch,
    resignationPickerSearch,
    linkingPeriodId,
    unlinkingPeriodId,
    setMemberLinks,
    setUnlinkedPeriods,
    setShowAdmissionPicker,
    setShowResignationPicker,
    setAdmissionPickerSearch,
    setResignationPickerSearch,
    loadMemberLinks,
    handleLinkAdmission,
    handleUnlinkAdmission,
    handleLinkResignation,
    handleUnlinkResignation,
    dateDiffDays,
  };
};
