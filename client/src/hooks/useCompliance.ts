import { useEffect, useState } from 'react';
import axios from 'axios';

import { API_BASE_URL } from '../config';

export const COMPLIANCE_ROLE_TYPES = [
  { value: 'dialogue', label: 'Dialogue' },
  { value: 'it_team', label: 'IT' },
  { value: 'it_lead', label: 'IT Lead' },
  { value: 'hr_team', label: 'HR' },
  { value: 'treasury_team', label: 'Treasury' },
  { value: 'explore', label: 'Explore' },
  { value: 'bond', label: 'Bond' },
  { value: 'social', label: 'Social' },
] as const;

export const DOCUMENT_TYPES = [
  { value: 'nda_dia', label: 'NDA Dialogue' },
  { value: 'nda_dir', label: 'NDA Board' },
  { value: 'nda_hr', label: 'NDA HR' },
  { value: 'nda_tesoreria', label: 'NDA Treasury' },
  { value: 'nda_it', label: 'NDA IT' },
  { value: 'privacy', label: 'Privacy' },
  { value: 'enrollment_form', label: 'Enrollment Form' },
  { value: 'member_form', label: 'Member Form' },
] as const;

export interface ComplianceFlag {
  id: string;
  code: string;
  label: string;
  severity: 'critical' | 'warning' | 'info';
  isProblematic: boolean;
  note?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceDocument {
  id: string;
  personId: string;
  documentType: string;
  version?: string | null;
  driveUrl?: string | null;
  signedAt?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  isCurrent: boolean;
  isSigned: boolean;
  isDated: boolean;
  isComplete: boolean;
  dataProcessingConsent?: boolean | null;
  thirdPartyCommunicationConsent?: boolean | null;
  imageUseConsent?: boolean | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  flags: ComplianceFlag[];
}

export interface ComplianceRole {
  id: string;
  personId: string;
  roleType: string;
  label: string;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceAlert {
  key: string;
  code: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  group: string;
  personId: string;
  personName: string;
  entityType: 'person' | 'document' | 'role';
  entityId?: string;
  suppression?: {
    id: string;
    reason: string;
    note?: string | null;
    untilDate?: string | null;
    suppressedAt: string;
    suppressedBy?: string | null;
  } | null;
}

export interface CompliancePersonData {
  roles: ComplianceRole[];
  documents: ComplianceDocument[];
  privacyStatus: {
    version?: string | null;
    dataProcessingConsent: boolean;
    thirdPartyCommunicationConsent: boolean;
    imageUseConsent: boolean;
    documentId: string;
    driveUrl?: string | null;
  } | null;
  alerts: ComplianceAlert[];
  suppressedAlerts: ComplianceAlert[];
}

export const useCompliance = (personId?: string) => {
  const [personData, setPersonData] = useState<CompliancePersonData | null>(null);
  const [summary, setSummary] = useState<{ totalActiveAlerts: number; totalSuppressedAlerts: number; groups: { group: string; count: number }[] } | null>(null);
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [suppressedAlerts, setSuppressedAlerts] = useState<ComplianceAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPersonCompliance = async () => {
    if (!personId) return null;
    const response = await axios.get(`${API_BASE_URL}/compliance/person/${personId}`);
    setPersonData(response.data);
    return response.data as CompliancePersonData;
  };

  const fetchSummary = async () => {
    const response = await axios.get(`${API_BASE_URL}/compliance/summary`);
    setSummary(response.data);
    return response.data;
  };

  const fetchAlerts = async (includeSuppressed = true) => {
    const response = await axios.get(`${API_BASE_URL}/compliance/alerts`, {
      params: { includeSuppressed },
    });
    setAlerts(response.data.alerts);
    setSuppressedAlerts(response.data.suppressed);
    return response.data;
  };

  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const tasks = [fetchSummary(), fetchAlerts(true)];
      if (personId) tasks.push(fetchPersonCompliance());
      await Promise.all(tasks);
    } catch (err) {
      setError('Error loading compliance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [personId]);

  const createRole = async (data: Record<string, unknown>) => {
    await axios.post(`${API_BASE_URL}/compliance/roles`, data);
    await refresh();
  };

  const updateRole = async (id: string, data: Record<string, unknown>) => {
    await axios.patch(`${API_BASE_URL}/compliance/roles/${id}`, data);
    await refresh();
  };

  const deleteRole = async (id: string) => {
    await axios.delete(`${API_BASE_URL}/compliance/roles/${id}`);
    await refresh();
  };

  const createDocument = async (data: Record<string, unknown>) => {
    await axios.post(`${API_BASE_URL}/compliance/documents`, data);
    await refresh();
  };

  const updateDocument = async (id: string, data: Record<string, unknown>) => {
    await axios.patch(`${API_BASE_URL}/compliance/documents/${id}`, data);
    await refresh();
  };

  const deleteDocument = async (id: string) => {
    await axios.delete(`${API_BASE_URL}/compliance/documents/${id}`);
    await refresh();
  };

  const createFlag = async (documentId: string, data: Record<string, unknown>) => {
    await axios.post(`${API_BASE_URL}/compliance/documents/${documentId}/flags`, data);
    await refresh();
  };

  const updateFlag = async (id: string, data: Record<string, unknown>) => {
    await axios.patch(`${API_BASE_URL}/compliance/flags/${id}`, data);
    await refresh();
  };

  const deleteFlag = async (id: string) => {
    await axios.delete(`${API_BASE_URL}/compliance/flags/${id}`);
    await refresh();
  };

  const suppressAlert = async (alertKey: string, reason: string, note?: string, untilDate?: string, targetPersonId?: string) => {
    await axios.post(`${API_BASE_URL}/compliance/suppressions`, {
      alertKey,
      personId: targetPersonId ?? personId,
      reason,
      note,
      untilDate,
    });
    await refresh();
  };

  const releaseSuppression = async (suppressionId: string) => {
    await axios.post(`${API_BASE_URL}/compliance/suppressions/${suppressionId}/release`);
    await refresh();
  };

  return {
    personData,
    summary,
    alerts,
    suppressedAlerts,
    loading,
    error,
    refresh,
    createRole,
    updateRole,
    deleteRole,
    createDocument,
    updateDocument,
    deleteDocument,
    createFlag,
    updateFlag,
    deleteFlag,
    suppressAlert,
    releaseSuppression,
  };
};
