import { useTranslation } from 'react-i18next';
import OverlayModal from '../ui/OverlayModal';
import ModalField from '../ui/ModalField';
import CheckboxField from '../ui/CheckboxField';
import type { DocumentFormState } from './useComplianceTab';

interface DocumentFormModalProps {
  isOpen: boolean;
  isEditing: boolean;
  form: DocumentFormState;
  rules?: any;
  onFormChange: (field: keyof DocumentFormState, value: any) => void;
  onConsentChange: (consentType: string, status: 'granted' | 'withdrawn' | 'pending') => void;
  onSave: () => Promise<void>;
  onClose: () => void;
}

const DocumentFormModal = ({
  isOpen,
  isEditing,
  form,
  rules,
  onFormChange,
  onConsentChange,
  onSave,
  onClose,
}: DocumentFormModalProps) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!rules) {
      alert(t('compliance.rulesNotConfigured', { defaultValue: 'Compliance rules are not configured. Please contact an administrator.' }));
      return;
    }
    await onSave();
  };

  const docTypeConfig = rules?.documentTypes[form.documentType];
  const activeConsentTypes: string[] =
    docTypeConfig?.consentTypes && docTypeConfig.consentTypes.length > 0
      ? docTypeConfig.consentTypes
      : docTypeConfig?.hasConsents
        ? ['third_party', 'image_use']
        : [];

  return (
    <OverlayModal
      title={isEditing ? t('compliance.editDocument', { defaultValue: 'Edit Document' }) : t('compliance.addDocument')}
      onClose={onClose}
      onConfirm={handleSave}
      confirmLabel={isEditing ? t('common.actions.saveChanges') : t('common.actions.save')}
    >
      {!rules && (
        <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-200 mb-4">
          {t('compliance.rulesNotConfigured', { defaultValue: 'Compliance rules are not configured. Please contact an administrator.' })}
        </div>
      )}
      <ModalField label={t('compliance.documentType', { defaultValue: 'Document Type' })}>
        <select
          value={form.documentType}
          onChange={e => onFormChange('documentType', e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
          disabled={!rules}
        >
          {rules && Object.entries(rules.documentTypes).map(([value, doc]: [string, any]) => (
            <option key={value} value={value}>{t(doc.label)}</option>
          ))}
        </select>
      </ModalField>
      <ModalField label={t('common.fields.version')}>
        <input
          type="text"
          value={form.version}
          onChange={e => onFormChange('version', e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
        />
      </ModalField>
      <ModalField label={t('common.fields.signedAt', { defaultValue: 'Signed At' })}>
        <input
          type="date"
          value={form.signedAt}
          onChange={e => onFormChange('signedAt', e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
        />
      </ModalField>
      <ModalField label="Drive URL">
        <input
          type="text"
          value={form.driveUrl}
          onChange={e => onFormChange('driveUrl', e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
        />
      </ModalField>
      <div className="space-y-2">
        <CheckboxField
          label={t('compliance.states.isCurrent', { defaultValue: 'Is Current' })}
          checked={form.isCurrent}
          onChange={v => onFormChange('isCurrent', v)}
        />
        <CheckboxField
          label={t('compliance.states.isSigned', { defaultValue: 'Is Signed' })}
          checked={form.isSigned}
          onChange={v => onFormChange('isSigned', v)}
        />
        <CheckboxField
          label={t('compliance.states.isDated', { defaultValue: 'Is Dated' })}
          checked={form.isDated}
          onChange={v => onFormChange('isDated', v)}
        />
        <CheckboxField
          label={t('compliance.states.isComplete', { defaultValue: 'Is Complete' })}
          checked={form.isComplete}
          onChange={v => onFormChange('isComplete', v)}
        />
        <CheckboxField
          label={t('compliance.states.isDigital', { defaultValue: 'Is Digital' })}
          checked={form.isDigital}
          onChange={v => onFormChange('isDigital', v)}
        />
      </div>

      {activeConsentTypes.length > 0 && (
        <ModalField label={t('compliance.consents', { defaultValue: 'Consents' })}>
          <div className="space-y-2">
            {activeConsentTypes.map((consentType) => (
              <div key={consentType} className="border border-slate-700 rounded-lg p-3 bg-slate-900">
                <div className="text-sm font-semibold text-white mb-2">
                  {t(`people.consents.${consentType}`, { defaultValue: consentType })}
                </div>
                <div className="flex gap-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name={`consent-${consentType}`}
                      checked={form.consentStatuses[consentType] === 'granted'}
                      onChange={() => onConsentChange(consentType, 'granted')}
                      className="w-4 h-4"
                    />
                    <span className="text-emerald-400">{t('common.status.granted', { defaultValue: 'Granted' })}</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name={`consent-${consentType}`}
                      checked={form.consentStatuses[consentType] === 'withdrawn'}
                      onChange={() => onConsentChange(consentType, 'withdrawn')}
                      className="w-4 h-4"
                    />
                    <span className="text-red-400">{t('common.status.withdrawn', { defaultValue: 'Withdrawn' })}</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name={`consent-${consentType}`}
                      checked={form.consentStatuses[consentType] === 'pending'}
                      onChange={() => onConsentChange(consentType, 'pending')}
                      className="w-4 h-4"
                    />
                    <span className="text-slate-400">{t('common.status.pending', { defaultValue: 'Pending' })}</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </ModalField>
      )}

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

export default DocumentFormModal;
