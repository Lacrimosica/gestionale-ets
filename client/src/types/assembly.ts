import type { WorkflowType, VotingResult, DimissioneSocio } from '../hooks/useDocuments';

// Workflow types for ODG items
export type WorkflowItemType = 'member_admission' | 'member_resignation' | 'member_exclusion' | 'budget_approval' | 'board_election';

export interface WorkflowItemData {
  members?: string[];
  budgetYear?: number;
  voting?: VotingResult[];
  resignationDate?: string;
}

export interface AgendaItem {
  id: string;
  number: number;
  title: string;
  description?: string | null;
  resolution?: string | null;
  workflowType?: WorkflowItemType | null;
  workflowData?: WorkflowItemData | null;
}

export interface ConvocationDetail {
  id: string;
  assemblyId: string;
  secondAssemblyId?: string | null;
  date: string;
  documentLink?: string | null;
  notes?: string | null;
  assembly1: AssemblyDetailData | null;
  assembly2: AssemblyDetailData | null;
  agendaItems: AgendaItem[];
}

export interface AssemblySummary {
  id: string;
  type: string;
  subtype?: string | null;
  totalNumber: number;
  referenceNumber: number;
  referenceYear?: number | null;
  firstCallDate?: string | null;
}

export interface AttendanceRecord {
  id: string;
  personId: string;
  mode: 'present' | 'remote' | 'proxy';
  delegatorId?: string | null;
}

export interface EligibleMember {
  personId: string;
  firstName: string;
  lastName: string;
}

export interface AssemblyDetailData extends AssemblySummary {
  subtype?: string | null;
  convocationDate?: string | null;
  firstCallTime?: string | null;
  endTime?: string | null;
  secondCallDate?: string | null;
  secondCallTime?: string | null;
  location: string;
  mode: string;
  assemblyStatus?: string | null;
  presidentId?: string | null;
  secretaryId?: string | null;
  presidentName: string;
  secretaryName: string;
  notes?: string | null;
  meetLink?: string | null;
  googleDocsLink?: string | null;
  pdfLink?: string | null;
  depositedOnRunts?: boolean | null;
  runtsDepositDate?: string | null;
  modalityFormulaPrima?: string | null;
  modalityFormulaApertura?: string | null;
  agendaItems: AgendaItem[];
  participants?: AttendanceRecord[];
  // Pairing info from backend
  convocationId?: string | null;
  pairedAssemblyId?: string | null;
}

// Document generation configuration
export interface GenConfig {
  isOpen: boolean;
  activeWorkflows: WorkflowType[];
  selectedAgendaItemIds: string[];
  includeResignations: boolean;

  // Logistics & Locations
  city: string;      // Placeholder {CITTA}
  venue: string;     // Placeholder {SEDE_ASSOCIAZIONE}
  secondCallDate: string;
  secondCallTime: string;

  // Attendance (ETS context: "Soci")
  sociTotali: string;
  sociPresenti: string;
  sociOnline: string;
  inPresenzaPrima: string;
  inDelegaPrima: string;
  inPresenzaSeconda: string;
  inDelegaSeconda: string;

  // Roles & Formulas
  signatoryRole: string;
  formulaPrima: string;
  formulaSeconda: string;
  formulaApertura: string;

  // Voting & Content
  voting: Record<string, VotingResult[]>; // Keyed by workflow type or point ID
  testoVarie: string;

  // Generation flags
  generateConvocation: boolean;
  generateMinutes1a: boolean;
  generateMinutes2a: boolean;
  generateGoogleDoc: boolean;
  generatePdf: boolean;

  // Workflow-specific data
  data: {
    newMembers: string[];
    budgetYear: string;
    newBoard: string[];
    excludedMembers: string[];
    resignations: DimissioneSocio[];
  };
  outputFolderOverride: string;
}

// Candidate list item (members for picking)
export type Candidate = { id: string; nome: string; label?: string };

// Member event for linking (admission/resignation periods)
export type LinkedMemberEvent = {
  id: string;
  personId: string;
  admissionDate?: string;
  resignationDate?: string;
  firstName: string;
  lastName: string;
};

// Modality option for assembly mode selection
export type ModalityOption = { id: string; type: string; mode: string; label?: string; value?: string };
