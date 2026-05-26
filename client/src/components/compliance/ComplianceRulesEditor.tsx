import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import type { ComplianceRules } from '../../hooks/useCompliance';
import DeleteConfirmationModal from '../DeleteConfirmationModal';
import { DocTypesSection } from './DocTypesSection';
import { RolesSection } from './RolesSection';
import { BaseRequirementsSection } from './BaseRequirementsSection';
import type { DocTypeForm, RoleForm } from './ComplianceEditorShared';

interface ComplianceRulesEditorProps {
  initialRules: ComplianceRules;
  onSave: (rules: ComplianceRules) => Promise<void>;
}

export const ComplianceRulesEditor = ({
  initialRules,
  onSave,
}: ComplianceRulesEditorProps) => {
  const { t } = useTranslation();
  const [rules, setRules] = useState<ComplianceRules>(
    structuredClone(initialRules),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState<
    { type: 'role' | 'docType'; key: string } | null
  >(null);
  const [deleteConfirmValue, setDeleteConfirmValue] = useState('');

  // ── Doc type handlers ──────────────────────────────────────────────────

  const updateDocType = (
    key: string,
    patch: Partial<ComplianceRules['documentTypes'][string]>,
  ) => {
    setRules((prev) => ({
      ...prev,
      documentTypes: {
        ...prev.documentTypes,
        [key]: { ...prev.documentTypes[key], ...patch },
      },
    }));
  };

  const deleteDocType = (key: string) => {
    setRules((prev) => {
      const dtCopy = { ...prev.documentTypes };
      delete dtCopy[key];
      // Also remove from base requirements and role requiredDocuments
      const baseReqs = {
        isVolunteer: prev.baseRequirements.isVolunteer.filter((d) => d !== key),
        isSocio: prev.baseRequirements.isSocio.filter((d) => d !== key),
        isBoard: prev.baseRequirements.isBoard.filter((d) => d !== key),
      };
      const rolesUpdated = Object.fromEntries(
        Object.entries(prev.roles).map(([rk, rv]) => [
          rk,
          {
            ...rv,
            requiredDocuments: (rv.requiredDocuments ?? []).filter(
              (d) => d !== key,
            ),
          },
        ]),
      );
      return {
        ...prev,
        documentTypes: dtCopy,
        baseRequirements: baseReqs,
        roles: rolesUpdated,
      };
    });
  };

  const addDocType = (form: DocTypeForm) => {
    const key = form.key.toLowerCase();
    const parsedVersions = form.versions
      ? form.versions
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
      : undefined;
    const parsedConsentTypes = form.consentTypes
      ? form.consentTypes
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
      : undefined;

    setRules((prev) => ({
      ...prev,
      documentTypes: {
        ...prev.documentTypes,
        [key]: {
          label: form.label,
          description: form.description,
          consentTypes:
            parsedConsentTypes && parsedConsentTypes.length > 0
              ? parsedConsentTypes
              : undefined,
          versions: parsedVersions,
          currentVersion: form.currentVersion || undefined,
        },
      },
    }));
  };

  // ── Role handlers ─────────────────────────────────────────────────────

  const updateRole = (
    key: string,
    patch: Partial<ComplianceRules['roles'][string]>,
  ) => {
    setRules((prev) => ({
      ...prev,
      roles: { ...prev.roles, [key]: { ...prev.roles[key], ...patch } },
    }));
  };

  const deleteRole = (key: string) => {
    setRules((prev) => {
      const rolesCopy = { ...prev.roles };
      delete rolesCopy[key];
      // Remove this role from any other role's inherits
      const cleaned = Object.fromEntries(
        Object.entries(rolesCopy).map(([rk, rv]) => [
          rk,
          {
            ...rv,
            inherits: (rv.inherits ?? []).filter((k) => k !== key),
          },
        ]),
      );
      return { ...prev, roles: cleaned };
    });
  };

  const addRole = (form: RoleForm) => {
    const key = form.key.toLowerCase();
    setRules((prev) => ({
      ...prev,
      roles: {
        ...prev.roles,
        [key]: {
          label: form.label,
          description: form.description,
          requiredDocuments: form.requiredDocuments,
          inherits: form.inherits.length > 0 ? form.inherits : undefined,
        },
      },
    }));
  };

  // ── Base requirement handlers ─────────────────────────────────────────

  const toggleBaseReq = (
    context: 'isVolunteer' | 'isSocio' | 'isBoard',
    docKey: string,
  ) => {
    setRules((prev) => {
      const current = prev.baseRequirements[context];
      const updated = current.includes(docKey)
        ? current.filter((k) => k !== docKey)
        : [...current, docKey];
      return {
        ...prev,
        baseRequirements: { ...prev.baseRequirements, [context]: updated },
      };
    });
  };

  // ── Delete confirmation ──────────────────────────────────────────────

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'role') deleteRole(deleteTarget.key);
    else deleteDocType(deleteTarget.key);
    setDeleteTarget(null);
    setDeleteConfirmValue('');
  };

  const handleDeleteCancel = () => {
    setDeleteTarget(null);
    setDeleteConfirmValue('');
  };

  // ── Save ─────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await onSave(rules);
      setMessage(t('settings.compliance.save.successMessage'));
    } catch {
      setMessage(t('settings.compliance.save.errorMessage'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <DocTypesSection
        rules={rules}
        onUpdateDocType={updateDocType}
        onDeleteDocType={deleteDocType}
        onAddDocType={addDocType}
        onDeleteRequest={setDeleteTarget}
      />

      <RolesSection
        rules={rules}
        onUpdateRole={updateRole}
        onDeleteRole={deleteRole}
        onAddRole={addRole}
        onDeleteRequest={setDeleteTarget}
      />

      <BaseRequirementsSection rules={rules} onToggleBaseReq={toggleBaseReq} />

      <DeleteConfirmationModal
        isOpen={!!deleteTarget}
        title={deleteTarget?.type === 'role' ? t('settings.compliance.delete.deleteRole') : t('settings.compliance.delete.deleteDocumentType')}
        description={
          deleteTarget?.type === 'role'
            ? t('settings.compliance.delete.roleConfirmation')
            : t('settings.compliance.delete.documentTypeConfirmation')
        }
        expectedText={deleteTarget?.key ?? ''}
        value={deleteConfirmValue}
        onChange={setDeleteConfirmValue}
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        submitLabel={t('settings.compliance.delete.delete')}
      />

      {/* ── Save Bar ─────────────────────────────────────────────────────────── */}
      <div className="sticky bottom-4 flex items-center justify-end gap-4 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-xl px-4 py-3 shadow-xl shadow-black/40">
        {message && (
          <p
            className={`text-sm ${
              message.includes('Error') ? 'text-red-400' : 'text-emerald-400'
            }`}
          >
            {message}
          </p>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-emerald-900/30"
        >
          <Save size={14} />
          {saving ? t('settings.compliance.save.savingButton') : t('settings.compliance.save.saveComplianceRules')}
        </button>
      </div>
    </div>
  );
};

export default ComplianceRulesEditor;
