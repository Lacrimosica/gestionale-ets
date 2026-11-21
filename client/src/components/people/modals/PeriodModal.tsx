import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

type ModalType = 'vol_start' | 'vol_end' | 'soc_start' | 'soc_end' | null;

interface VolunteerPeriod {
  id: string;
  enrollmentDate: string;
  exitDate?: string;
  exitReason?: string;
  notes?: string;
}

interface MemberPeriod {
  id: string;
  admissionDate: string;
  resignationDate?: string;
  exitReason?: string;
  notes?: string;
}

interface PeriodModalProps {
  isOpen: boolean;
  modalType: ModalType;
  modalDate: string;
  setModalDate: (date: string) => void;
  onClose: () => void;
  onConfirm: (modalType: ModalType, modalDate: string) => Promise<void>;
  activeVolPeriod?: VolunteerPeriod;
  activeSocioPeriod?: MemberPeriod;
}

const PeriodModal = ({
  isOpen,
  modalType,
  modalDate,
  setModalDate,
  onClose,
  onConfirm,
}: PeriodModalProps) => {
  const { t } = useTranslation();

  if (!isOpen || !modalType) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-fg">
            {modalType === 'vol_start' && t('people.newVolunteerPeriod', { defaultValue: 'New Volunteer Period' })}
            {modalType === 'vol_end' && t('people.closeVolunteerPeriod', { defaultValue: 'Close Volunteer Period' })}
            {modalType === 'soc_start' && t('people.newMemberAdmission', { defaultValue: 'New Member Admission' })}
            {modalType === 'soc_end' && t('people.registerResignation', { defaultValue: 'Register Resignation' })}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-neutral-800 text-neutral-400"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-neutral-400 font-semibold uppercase tracking-wide">
              {t('common.fields.date')}
            </label>
            <input
              type="date"
              value={modalDate}
              onChange={(e) => setModalDate(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-fg text-sm focus:border-accent-500 focus:ring-1 focus:ring-accent-500 outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 text-sm font-medium hover:bg-neutral-700"
          >
            {t('common.actions.cancel')}
          </button>
          <button
            onClick={async () => {
              await onConfirm(modalType, modalDate);
            }}
            className="px-4 py-2 rounded-lg bg-accent-600 hover:bg-accent-500 text-white text-sm font-semibold shadow-lg shadow-accent-900/30"
          >
            {t('common.actions.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PeriodModal;
