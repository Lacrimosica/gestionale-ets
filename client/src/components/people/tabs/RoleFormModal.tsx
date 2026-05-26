import { useTranslation } from 'react-i18next';
import OverlayModal from '../ui/OverlayModal';
import ModalField from '../ui/ModalField';
import type { RoleFormState } from './useComplianceTab';

interface RoleFormModalProps {
  isOpen: boolean;
  isEditing: boolean;
  form: RoleFormState;
  rules?: any;
  onFormChange: (field: keyof RoleFormState, value: any) => void;
  onSave: () => Promise<void>;
  onClose: () => void;
}

const RoleFormModal = ({ isOpen, isEditing, form, rules, onFormChange, onSave, onClose }: RoleFormModalProps) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!rules) {
      alert(t('compliance.rulesNotConfigured', { defaultValue: 'Compliance rules are not configured. Please contact an administrator.' }));
      return;
    }
    await onSave();
  };

  return (
    <OverlayModal
      title={isEditing ? t('compliance.editRole', { defaultValue: 'Edit Role' }) : t('people.addRole')}
      onClose={onClose}
      onConfirm={handleSave}
      confirmLabel={isEditing ? t('common.actions.saveChanges') : t('common.actions.save')}
    >
      {!rules && (
        <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-200 mb-4">
          {t('compliance.rulesNotConfigured', { defaultValue: 'Compliance rules are not configured. Please contact an administrator.' })}
        </div>
      )}
      <ModalField label={t('people.role', { defaultValue: 'Role' })}>
        <select
          value={form.roleType}
          onChange={(e) => onFormChange('roleType', e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
          disabled={!rules}
        >
          {rules && Object.entries(rules.roles).map(([value, role]: [string, any]) => (
            <option key={value} value={value}>
              {t(role.label)} {role.description ? `(${role.description})` : ''}
            </option>
          ))}
        </select>
      </ModalField>
      <ModalField label={t('common.fields.startDate', { defaultValue: 'Start Date' })}>
        <input
          type="date"
          value={form.startDate}
          onChange={e => onFormChange('startDate', e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
        />
      </ModalField>
      <ModalField label={t('common.fields.endDate', { defaultValue: 'End Date' })}>
        <input
          type="date"
          value={form.endDate}
          onChange={e => onFormChange('endDate', e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
        />
      </ModalField>
      <ModalField label={t('common.fields.notes')}>
        <textarea
          value={form.notes}
          onChange={e => onFormChange('notes', e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm min-h-[80px]"
        />
      </ModalField>
    </OverlayModal>
  );
};

export default RoleFormModal;
