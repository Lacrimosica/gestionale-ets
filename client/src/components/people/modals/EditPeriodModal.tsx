import { useTranslation } from 'react-i18next';
import OverlayModal from '../ui/OverlayModal';
import ModalField from '../ui/ModalField';

type ModalType = 'vol_edit' | 'soc_edit' | null;

interface PeriodFormData {
  date: string;
  endDate: string;
  reason: string;
  notes: string;
}

interface EditPeriodModalProps {
  isOpen: boolean;
  modalType: ModalType;
  periodForm: PeriodFormData;
  setPeriodForm: (form: PeriodFormData | ((prev: PeriodFormData) => PeriodFormData)) => void;
  onClose: () => void;
  onConfirm: (modalType: ModalType) => Promise<void>;
}

const EditPeriodModal = ({
  isOpen,
  modalType,
  periodForm,
  setPeriodForm,
  onClose,
  onConfirm,
}: EditPeriodModalProps) => {
  const { t } = useTranslation();

  if (!isOpen || (modalType !== 'vol_edit' && modalType !== 'soc_edit')) {
    return null;
  }

  return (
    <OverlayModal
      title={modalType === 'vol_edit' ? t('people.editVolunteerPeriod', { defaultValue: 'Edit Volunteer Period' }) : t('people.editMemberPeriod', { defaultValue: 'Edit Member Period' })}
      onClose={onClose}
      onConfirm={async () => {
        await onConfirm(modalType);
      }}
      confirmLabel={t('common.actions.save')}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ModalField label={modalType === 'vol_edit' ? t('people.enrollmentDate', { defaultValue: 'Enrollment Date' }) : t('people.admissionDate', { defaultValue: 'Admission Date' })}>
          <input type="date" value={periodForm.date} onChange={e => setPeriodForm(prev => ({ ...prev, date: e.target.value }))} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
        </ModalField>
        <ModalField label={modalType === 'vol_edit' ? t('people.exitDate', { defaultValue: 'Exit Date' }) : t('people.resignationDate', { defaultValue: 'Resignation Date' })}>
          <input type="date" value={periodForm.endDate} onChange={e => setPeriodForm(prev => ({ ...prev, endDate: e.target.value }))} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
        </ModalField>
      </div>
      <ModalField label={t('people.exitReason', { defaultValue: 'Exit/Resignation Reason' })}>
        <input value={periodForm.reason} onChange={e => setPeriodForm(prev => ({ ...prev, reason: e.target.value }))} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
      </ModalField>
      <ModalField label={t('common.fields.notes')}>
        <textarea value={periodForm.notes} onChange={e => setPeriodForm(prev => ({ ...prev, notes: e.target.value }))} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm min-h-[80px]" />
      </ModalField>
    </OverlayModal>
  );
};

export default EditPeriodModal;
