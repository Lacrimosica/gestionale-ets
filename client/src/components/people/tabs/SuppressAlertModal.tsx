import { useTranslation } from 'react-i18next';
import OverlayModal from '../ui/OverlayModal';
import ModalField from '../ui/ModalField';
import type { FormFieldValue, SuppressionFormState } from './useComplianceTab';

interface SuppressAlertModalProps {
  isOpen: boolean;
  form: SuppressionFormState;
  onFormChange: (field: keyof SuppressionFormState, value: FormFieldValue) => void;
  onSave: () => Promise<void>;
  onClose: () => void;
}

const SuppressAlertModal = ({ isOpen, form, onFormChange, onSave, onClose }: SuppressAlertModalProps) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <OverlayModal
      title={t('people.suppressAlert', { defaultValue: 'Suppress Alert' })}
      onClose={onClose}
      onConfirm={onSave}
      confirmLabel={t('common.actions.suppress', { defaultValue: 'Suppress' })}
    >
      <ModalField label={t('people.suppressReason', { defaultValue: 'Reason' })}>
        <input
          type="text"
          value={form.reason}
          onChange={e => onFormChange('reason', e.target.value)}
          className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-fg text-sm"
        />
      </ModalField>
      <ModalField label={t('common.fields.notes')}>
        <input
          type="text"
          value={form.note}
          onChange={e => onFormChange('note', e.target.value)}
          className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-fg text-sm"
        />
      </ModalField>
    </OverlayModal>
  );
};

export default SuppressAlertModal;
