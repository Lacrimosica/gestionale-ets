import type { DocTypeForm, RoleForm } from './ComplianceEditorShared';

export const emptyDocTypeForm = (): DocTypeForm => ({
  key: '',
  label: '',
  description: '',
  consentTypes: '',
  versions: '',
  currentVersion: '',
});

export const emptyRoleForm = (): RoleForm => ({
  key: '',
  label: '',
  description: '',
  requiredDocuments: [],
  inherits: [],
});
