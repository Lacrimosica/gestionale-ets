import { useState } from 'react';

type ModalType = 'role' | 'document' | 'flag' | 'suppress' | null;

export interface RoleFormState {
  roleType: string;
  startDate: string;
  endDate: string;
  notes: string;
  _fillPeriodId?: string;
}

export interface DocumentFormState {
  documentType: string;
  version: string;
  driveUrl: string;
  signedAt: string;
  isCurrent: boolean;
  isSigned: boolean;
  isDated: boolean;
  isComplete: boolean;
  isDigital: boolean;
  consentStatuses: Record<string, 'granted' | 'withdrawn' | 'pending'>;
  notes: string;
}

export interface FlagFormState {
  label: string;
  severity: 'info' | 'warning' | 'error';
  note: string;
}

export interface SuppressionFormState {
  reason: string;
  note: string;
}

interface ComplianceTabHookState {
  complianceModal: ModalType;
  selectedRoleId: string | null;
  selectedDocumentId: string | null;
  selectedFlagId: string | null;
  selectedAlertKey: string | null;
  roleForm: RoleFormState;
  documentForm: DocumentFormState;
  flagForm: FlagFormState;
  suppressionForm: SuppressionFormState;
}

interface ComplianceTabHookActions {
  setRoleForm: React.Dispatch<React.SetStateAction<RoleFormState>>;
  setDocumentForm: React.Dispatch<React.SetStateAction<DocumentFormState>>;
  setFlagForm: React.Dispatch<React.SetStateAction<FlagFormState>>;
  setSuppressionForm: React.Dispatch<React.SetStateAction<SuppressionFormState>>;
  openRoleModal: (role?: any) => void;
  openDocumentModal: (document?: any) => void;
  openFlagModal: (documentId: string, flag?: any) => void;
  openSuppressModal: (alertKey: string) => void;
  closeComplianceModal: () => void;
}

export function useComplianceTab(rules?: any): ComplianceTabHookState & ComplianceTabHookActions {
  const [complianceModal, setComplianceModal] = useState<ModalType>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedFlagId, setSelectedFlagId] = useState<string | null>(null);
  const [selectedAlertKey, setSelectedAlertKey] = useState<string | null>(null);

  const [roleForm, setRoleForm] = useState<RoleFormState>({
    roleType: '',
    startDate: '',
    endDate: '',
    notes: '',
    _fillPeriodId: ''
  });

  const [documentForm, setDocumentForm] = useState<DocumentFormState>({
    documentType: '',
    version: '',
    driveUrl: '',
    signedAt: '',
    isCurrent: true,
    isSigned: true,
    isDated: false,
    isComplete: true,
    isDigital: true,
    consentStatuses: {},
    notes: '',
  });

  const [flagForm, setFlagForm] = useState<FlagFormState>({ label: '', severity: 'warning', note: '' });
  const [suppressionForm, setSuppressionForm] = useState<SuppressionFormState>({ reason: '', note: '' });

  const openRoleModal = (role?: any) => {
    setSelectedRoleId(role?.id ?? null);
    setRoleForm({
      roleType: role?.roleType ?? (rules ? Object.keys(rules.roles)[0] : ''),
      startDate: role?.startDate ?? '',
      endDate: role?.endDate ?? '',
      notes: role?.notes ?? '',
    });
    setComplianceModal('role');
  };

  const openDocumentModal = (document?: any) => {
    setSelectedDocumentId(document?.id ?? null);
    const defaultDocType = document?.documentType ?? (rules ? Object.keys(rules.documentTypes)[0] : '');
    const defaultVersion = document?.version ?? (rules?.documentTypes[defaultDocType]?.currentVersion ?? '');
    const existingConsents: Record<string, 'granted' | 'withdrawn' | 'pending'> = {};
    if (document?.consentsByType) {
      for (const [type, entry] of Object.entries(document.consentsByType)) {
        existingConsents[type] = (entry as any).status;
      }
    }
    setDocumentForm({
      documentType: defaultDocType,
      version: defaultVersion,
      driveUrl: document?.driveUrl ?? '',
      signedAt: document?.signedAt ?? '',
      isCurrent: document?.isCurrent ?? true,
      isSigned: document?.isSigned ?? true,
      isDated: document?.isDated ?? false,
      isComplete: document?.isComplete ?? true,
      isDigital: document?.isDigital ?? true,
      consentStatuses: existingConsents,
      notes: document?.notes ?? '',
    });
    setComplianceModal('document');
  };

  const openFlagModal = (documentId: string, flag?: any) => {
    setSelectedDocumentId(documentId);
    setSelectedFlagId(flag?.id ?? null);
    setFlagForm({ label: flag?.label ?? '', severity: flag?.severity ?? 'warning', note: flag?.note ?? '' });
    setComplianceModal('flag');
  };

  const openSuppressModal = (alertKey: string) => {
    setSelectedAlertKey(alertKey);
    setSuppressionForm({ reason: '', note: '' });
    setComplianceModal('suppress');
  };

  const closeComplianceModal = () => {
    setComplianceModal(null);
    setSelectedRoleId(null);
    setSelectedDocumentId(null);
    setSelectedFlagId(null);
    setSelectedAlertKey(null);
  };

  return {
    complianceModal,
    selectedRoleId,
    selectedDocumentId,
    selectedFlagId,
    selectedAlertKey,
    roleForm,
    documentForm,
    flagForm,
    suppressionForm,
    setRoleForm,
    setDocumentForm,
    setFlagForm,
    setSuppressionForm,
    openRoleModal,
    openDocumentModal,
    openFlagModal,
    openSuppressModal,
    closeComplianceModal,
  };
}
