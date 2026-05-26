import { useTranslation } from 'react-i18next';
import OverlayModal from '../ui/OverlayModal';
import ModalField from '../ui/ModalField';
import type { FlagFormState } from './useComplianceTab';

interface FlagFormModalProps {
  isOpen: boolean;
  isEditing: boolean;
  form: FlagFormState;
  onFormChange: (field: keyof FlagFormState, value: any) => void;
  onSave: () => Promise<void>;
  onClose: () => void;
}

const FlagFormModal = ({ isOpen, isEditing, form, onFormChange, onSave, onClose }: FlagFormModalProps) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <OverlayModal
      title={isEditing ? t('compliance.editFlag', { defaultValue: 'Edit Flag' }) : t('compliance.addFlag', { defaultValue: 'Add Flag' })}
      onClose={onClose}
      onConfirm={onSave}
      confirmLabel={t('common.actions.save')}
    >
      <ModalField label={t('compliance.flagLabel', { defaultValue: 'Label' })}>
        <input
          type="text"
          value={form.label}
          onChange={e => onFormChange('label', e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
        />
      </ModalField>
      <ModalField label={t('compliance.flagSeverity', { defaultValue: 'Severity' })}>
        <select
          value={form.severity}
          onChange={e => onFormChange('severity', e.target.value as any)}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
        >
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
        </select>
      </ModalField>
      <ModalField label={t('common.fields.notes')}>
        <input
          type="text"
          value={form.note}
          onChange={e => onFormChange('note', e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
        />
      </ModalField>
    </OverlayModal>
  );
};

export default FlagFormModal;
