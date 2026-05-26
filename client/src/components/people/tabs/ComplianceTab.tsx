import { useTranslation } from 'react-i18next';
import { useComplianceTab } from './useComplianceTab';
import ComplianceRolesSection from './ComplianceRolesSection';
import PrivacyStatusSection from './PrivacyStatusSection';
import ComplianceDocumentsSection from './ComplianceDocumentsSection';
import AlertsSection from './AlertsSection';
import RoleFormModal from './RoleFormModal';
import DocumentFormModal from './DocumentFormModal';
import FlagFormModal from './FlagFormModal';
import SuppressAlertModal from './SuppressAlertModal';

interface ComplianceData {
  roles?: any[];
  documents?: any[];
  alerts?: any[];
  suppressedAlerts?: any[];
  privacyStatus?: any;
}

interface Rules {
  roles?: Record<string, any>;
  documentTypes?: Record<string, any>;
}

interface ComplianceTabProps {
  compliance?: ComplianceData;
  rules?: Rules;
  id: string;
  canEdit: boolean;
  createRole: (data: any) => Promise<void>;
  updateRole: (id: string, data: any) => Promise<void>;
  createDocument: (data: any) => Promise<void>;
  updateDocument: (id: string, data: any) => Promise<void>;
  createFlag: (data: any) => Promise<void>;
  updateFlag: (id: string, data: any) => Promise<void>;
  suppressAlert: (data: any) => Promise<void>;
  releaseSuppression: (id: string) => Promise<void>;
  refreshCompliance: () => Promise<void>;
  onRequestDelete: (config: any) => void;
}

const ComplianceTab = ({
  compliance,
  rules,
  id,
  canEdit,
  createRole,
  updateRole,
  createDocument,
  updateDocument,
  createFlag,
  updateFlag,
  suppressAlert,
  releaseSuppression,
  refreshCompliance,
  onRequestDelete,
}: ComplianceTabProps) => {
  const { t } = useTranslation();
  const {
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
  } = useComplianceTab(rules);

  const handleRoleFormChange = (field: string, value: any) => {
    setRoleForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleDocumentFormChange = (field: string, value: any) => {
    setDocumentForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleDocumentConsentChange = (consentType: string, status: 'granted' | 'withdrawn' | 'pending') => {
    setDocumentForm((prev) => ({
      ...prev,
      consentStatuses: { ...prev.consentStatuses, [consentType]: status },
    }));
  };

  const handleFlagFormChange = (field: string, value: any) => {
    setFlagForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSuppressionFormChange = (field: string, value: any) => {
    setSuppressionForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveRole = async () => {
    const payload = {
      personId: id,
      roleType: roleForm.roleType,
      startDate: roleForm.startDate || null,
      endDate: roleForm.endDate || null,
      notes: roleForm.notes || null,
    };
    if (selectedRoleId) {
      await updateRole(selectedRoleId, payload);
    } else {
      await createRole(payload);
    }
    await refreshCompliance();
    closeComplianceModal();
  };

  const handleSaveDocument = async () => {
    const docTypeConfig = rules?.documentTypes?.[documentForm.documentType];
    const activeConsentTypes: string[] =
      docTypeConfig?.consentTypes && docTypeConfig.consentTypes.length > 0
        ? docTypeConfig.consentTypes
        : docTypeConfig?.hasConsents
          ? ['third_party', 'image_use']
          : [];

    const consents = activeConsentTypes.map((consentType) => ({
      consentType,
      status: documentForm.consentStatuses[consentType] ?? 'pending',
      grantedAt: documentForm.consentStatuses[consentType] === 'granted' ? (documentForm.signedAt || new Date().toISOString().split('T')[0]) : undefined,
      withdrawnAt: documentForm.consentStatuses[consentType] === 'withdrawn' ? new Date().toISOString().split('T')[0] : undefined,
    }));

    const payload = {
      personId: id,
      documentType: documentForm.documentType,
      version: documentForm.version || null,
      driveUrl: documentForm.driveUrl || null,
      signedAt: documentForm.signedAt || null,
      isCurrent: documentForm.isCurrent ? 1 : 0,
      isSigned: documentForm.isSigned ? 1 : 0,
      isDated: documentForm.isDated ? 1 : 0,
      isComplete: documentForm.isComplete ? 1 : 0,
      isDigital: documentForm.isDigital ? 1 : 0,
      consents,
      notes: documentForm.notes || null,
    };

    if (selectedDocumentId) {
      await updateDocument(selectedDocumentId, payload);
    } else {
      await createDocument(payload);
    }
    await refreshCompliance();
    closeComplianceModal();
  };

  const handleSaveFlag = async () => {
    if (!selectedDocumentId) return;
    const payload = {
      documentId: selectedDocumentId,
      label: flagForm.label,
      severity: flagForm.severity,
      note: flagForm.note || null,
    };
    if (selectedFlagId) {
      await updateFlag(selectedFlagId, payload);
    } else {
      await createFlag(payload);
    }
    await refreshCompliance();
    closeComplianceModal();
  };

  const handleSuppress = async () => {
    if (!selectedAlertKey) return;
    await suppressAlert({
      personId: id,
      alertKey: selectedAlertKey,
      reason: suppressionForm.reason,
      note: suppressionForm.note || null,
    });
    await refreshCompliance();
    closeComplianceModal();
  };

  const handleDeleteRole = (roleId: string) => {
    onRequestDelete({
      isOpen: true,
      type: 'role',
      id: roleId,
      title: t('people.deleteRole', { defaultValue: 'Delete Role' }),
      message: t('people.deleteRoleConfirm', { defaultValue: 'Are you sure you want to delete this role?' }),
      confirmPhrase: 'DELETE',
      confirmValue: '',
      isLoading: false
    });
  };

  const handleDeleteDocument = (documentId: string) => {
    onRequestDelete({
      isOpen: true,
      type: 'document',
      id: documentId,
      title: t('compliance.deleteDocument', { defaultValue: 'Delete Document' }),
      message: t('compliance.deleteDocumentConfirm', { defaultValue: 'Delete this document?' }),
      confirmPhrase: 'DELETE',
      confirmValue: '',
      isLoading: false
    });
  };

  const handleDeleteFlag = (flagId: string) => {
    onRequestDelete({
      isOpen: true,
      type: 'flag',
      id: flagId,
      title: t('compliance.deleteFlag', { defaultValue: 'Delete Flag' }),
      message: t('compliance.deleteFlagConfirm', { defaultValue: 'Delete this flag?' }),
      confirmPhrase: 'DELETE',
      confirmValue: '',
      isLoading: false
    });
  };

  return (
    <div className="p-8 space-y-8">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ComplianceRolesSection
          roles={compliance?.roles}
          canEdit={canEdit}
          onAddRole={() => openRoleModal()}
          onEditRole={(role) => openRoleModal(role)}
          onDeleteRole={handleDeleteRole}
        />
        <PrivacyStatusSection privacyStatus={compliance?.privacyStatus} />
      </div>

      <ComplianceDocumentsSection
        documents={compliance?.documents}
        rules={rules}
        canEdit={canEdit}
        onAddDocument={() => openDocumentModal()}
        onEditDocument={(document) => openDocumentModal(document)}
        onDeleteDocument={handleDeleteDocument}
        onFlagDocument={(docId) => openFlagModal(docId)}
        onEditFlag={(docId, flag) => openFlagModal(docId, flag)}
        onDeleteFlag={handleDeleteFlag}
      />

      <AlertsSection
        alerts={compliance?.alerts}
        suppressedAlerts={compliance?.suppressedAlerts}
        canEdit={canEdit}
        onSuppressAlert={(alertKey) => openSuppressModal(alertKey)}
        onReleaseSuppression={(suppressionId) => releaseSuppression(suppressionId)}
      />

      <RoleFormModal
        isOpen={complianceModal === 'role'}
        isEditing={!!selectedRoleId}
        form={roleForm}
        rules={rules}
        onFormChange={handleRoleFormChange}
        onSave={handleSaveRole}
        onClose={closeComplianceModal}
      />

      <DocumentFormModal
        isOpen={complianceModal === 'document'}
        isEditing={!!selectedDocumentId}
        form={documentForm}
        rules={rules}
        onFormChange={handleDocumentFormChange}
        onConsentChange={handleDocumentConsentChange}
        onSave={handleSaveDocument}
        onClose={closeComplianceModal}
      />

      <FlagFormModal
        isOpen={complianceModal === 'flag'}
        isEditing={!!selectedFlagId}
        form={flagForm}
        onFormChange={handleFlagFormChange}
        onSave={handleSaveFlag}
        onClose={closeComplianceModal}
      />

      <SuppressAlertModal
        isOpen={complianceModal === 'suppress'}
        form={suppressionForm}
        onFormChange={handleSuppressionFormChange}
        onSave={handleSuppress}
        onClose={closeComplianceModal}
      />
    </div>
  );
};

export default ComplianceTab;
