import { useState, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export type WorkflowType =
  | 'member_admission'
  | 'budget_approval'
  | 'board_election'
  | 'member_exclusion'
  | 'member_resignation';

export const WORKFLOW_LABELS: Record<WorkflowType, string> = {
  member_admission: 'Ammissione soci',
  budget_approval: 'Approvazione bilancio',
  board_election: 'Elezione direttivo',
  member_exclusion: 'Esclusione soci',
  member_resignation: "Presa d'atto dimissioni",
};

export const WORKFLOW_AGENDA_SUGGESTIONS: Record<WorkflowType, string> = {
  member_admission: "Approvazione dell'ammissione di nuovi associati",
  budget_approval: 'Approvazione rendiconto gestionale',
  board_election: "Elezione dell'organo sociale: Consiglio Direttivo",
  member_exclusion: 'Proposta di esclusione associati',
  member_resignation: "Presa d'atto dimissioni",
};

export type DimissioneSocio = {
  name: string;
  date: string;
};

export type AgendaItemExtra = {
  id?: string;
  title: string;
  body?: string;
};

export type VotingResult = {
  title?: string;
  outcome: string;
  details?: string;
};

export type GenerateInput = {
  workflowTypes?: WorkflowType[];
  assemblyId?: string;
  assemblyNumber: number;
  firstCallStart: string;
  secondCallStart: string;
  endTime?: string;
  totalMembers: number;
  presentMembers: number;
  onlineMembers?: number;
  inPersonMembersFirst?: number;
  proxyMembersFirst?: number;
  inPersonMembersSecond?: number;
  proxyMembersSecond?: number;
  president: string;
  secretary: string;
  signatoryRole: string;
  firstCallModality: string;
  secondCallModality: string;
  minutesOpeningModality: string;
  voteOutcome?: string;
  votingResults?: Record<string, VotingResult[]>;
  city?: string;
  venue?: string;
  outputFolderIdOverride?: string;
  // generation flags
  generateConvocation?: boolean;
  generateMinutes1a?: boolean;
  generateMinutes2a?: boolean;
  generateGoogleDoc?: boolean;
  generatePdf?: boolean;
  // workflow-specific
  newMembers?: string;
  budgetYear?: number;
  newBoard?: string;
  excludedMembers?: string;
  resignations?: DimissioneSocio[];
  extraAgendaItems?: AgendaItemExtra[];
  varieOverrideText?: string;
};

export type DocumentLinks = {
  driveUrl: string;
  pdfUrl: string;
};

export type GenerateResult = {
  ok: true;
  generationId: string;
  documents: {
    convocation?: DocumentLinks;
    minutes1a?: DocumentLinks;
    minutes2a?: DocumentLinks;
  };
};

export type GenerationLogRecord = {
  id: string;
  assemblyId?: string | null;
  workflowType: string;
  assemblyNumber: number;
  firstCallDate: string;
  triggeredBy: string;
  status: 'success' | 'error';
  errorMessage?: string | null;
  convocazioneDriveUrl?: string | null;
  verbale1aDriveUrl?: string | null;
  verbale2aDriveUrl?: string | null;
  convocazionePdfUrl?: string | null;
  verbale1aPdfUrl?: string | null;
  verbale2aPdfUrl?: string | null;
  notes?: string | null;
  createdAt: string;
};

export function useDocuments() {
  const [history, setHistory] = useState<GenerationLogRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const { data } = await axios.get<GenerationLogRecord[]>(
        `${API_BASE_URL}/documents/history?limit=100`,
      );
      setHistory(data);
    } catch (err: any) {
      setHistoryError(err?.response?.data?.error ?? err.message ?? 'Errore nel caricamento');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const generateDocuments = useCallback(async (input: GenerateInput): Promise<GenerateResult> => {
    const { data } = await axios.post<GenerateResult>(
      `${API_BASE_URL}/documents/generate`,
      input,
    );
    return data;
  }, []);

  const updateNotes = useCallback(async (id: string, notes: string) => {
    const { data } = await axios.patch<GenerationLogRecord>(
      `${API_BASE_URL}/documents/history/${id}`,
      { notes },
    );
    setHistory((prev) => prev.map((r) => (r.id === id ? data : r)));
  }, []);

  const deleteRecord = useCallback(async (id: string) => {
    await axios.delete(`${API_BASE_URL}/documents/history/${id}`);
    setHistory((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return {
    history,
    historyLoading,
    historyError,
    loadHistory,
    generateDocuments,
    updateNotes,
    deleteRecord,
  };
}
