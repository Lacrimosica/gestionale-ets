import type { DeleteRequest } from '../../../types/delete-request';
import type { VolunteerPeriod } from '../../../hooks/usePeriods';
import type { PersonDetails as Person } from '../../../hooks/usePerson';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { History, UserCheck, UserMinus, BookOpen, Edit2, Trash2, Check, X, Loader2, PlusCircle } from 'lucide-react';
import { API_BASE_URL } from '../../../config';
import { formatDate } from '../../../lib/date-utils';
import EditPeriodModal from '../modals/EditPeriodModal';
import PeriodModal from '../modals/PeriodModal';

interface VolunteerTabProps {
  person: Person;
  canEdit: boolean;
  id: string;
  startVolunteering: (data: Partial<VolunteerPeriod>) => Promise<void>;
  endVolunteering: (periodId: string, data: { exitDate: string; exitReason: string }) => Promise<void>;
  updateVolunteerPeriod: (periodId: string, data: Partial<VolunteerPeriod>) => Promise<void>;
  refresh: () => Promise<void>;
  refreshCompliance: () => Promise<void>;
  onRequestDelete: (config: DeleteRequest) => void;
}

interface PeriodFormData {
  date: string;
  endDate: string;
  reason: string;
  notes: string;
}

type ModalType = 'vol_start' | 'vol_end' | 'vol_edit' | null;

const VolunteerTab = ({
  person,
  canEdit,
  id,
  startVolunteering,
  endVolunteering,
  updateVolunteerPeriod,
  refresh,
  refreshCompliance,
  onRequestDelete,
}: VolunteerTabProps) => {
  const { t } = useTranslation();
  const [isEditingLibro, setIsEditingLibro] = useState(false);
  // Phase 5: Updated field names in form state
  const [libroForm, setLibroForm] = useState({ isInVolunteerRegistryPhysical: false, volunteerRegistryStartDate: '', volunteerRegistryEndDate: '' });
  const [savingLibro, setSavingLibro] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [periodForm, setPeriodForm] = useState<PeriodFormData>({ date: '', endDate: '', reason: '', notes: '' });
  const [modalDate, setModalDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const activeVolPeriod = person.volunteerPeriods?.find(p => !p.exitDate);

  const openLibroEdit = () => {
    // Phase 5: Use new field names with fallback to old names
    setLibroForm({
      isInVolunteerRegistryPhysical: !!(person?.isInVolunteerRegistryPhysical ?? person?.inLibroVolontariCartaceo),
      volunteerRegistryStartDate: person?.volunteerRegistryStartDate ?? person?.libroVolontariStartDate ?? '',
      volunteerRegistryEndDate: person?.volunteerRegistryEndDate ?? person?.libroVolontariEndDate ?? '',
    });
    setIsEditingLibro(true);
  };

  const handleSaveLibro = async () => {
    if (!id) return;
    setSavingLibro(true);
    try {
      // Phase 5: Send new field names to API
      await axios.patch(`${API_BASE_URL}/people/${id}`, {
        isInVolunteerRegistryPhysical: libroForm.isInVolunteerRegistryPhysical ? 1 : 0,
        volunteerRegistryStartDate: libroForm.volunteerRegistryStartDate || null,
        volunteerRegistryEndDate: libroForm.volunteerRegistryEndDate || null,
      });
      await refresh();
      setIsEditingLibro(false);
    } catch {
      // silent
    } finally {
      setSavingLibro(false);
    }
  };

  const openEditVolunteerModal = (period: VolunteerPeriod) => {
    setSelectedPeriodId(period.id);
    setPeriodForm({
      date: period.enrollmentDate,
      endDate: period.exitDate || '',
      reason: period.exitReason || '',
      notes: period.notes || ''
    });
    setModalType('vol_edit');
  };

  const handleEditPeriodConfirm = async (modalType: 'vol_edit' | 'soc_edit' | null) => {
    if (modalType === 'vol_edit' && selectedPeriodId) {
      await updateVolunteerPeriod(selectedPeriodId, {
        enrollmentDate: periodForm.date,
        exitDate: periodForm.endDate || undefined,
        exitReason: periodForm.reason || undefined,
        notes: periodForm.notes || undefined
      });
      await refresh();
      setModalType(null);
    }
  };

  const handlePeriodModalConfirm = async (modalType: 'vol_start' | 'vol_end' | 'soc_start' | 'soc_end' | null, modalDate: string) => {
    if (modalType === 'vol_start') {
      await startVolunteering({ enrollmentDate: modalDate });
      await refresh();
      await refreshCompliance();
    } else if (modalType === 'vol_end' && activeVolPeriod) {
      await endVolunteering(activeVolPeriod.id, { exitDate: modalDate, exitReason: 'resignation' });
      await refresh();
      await refreshCompliance();
    }
    setModalType(null);
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-fg flex items-center space-x-2">
          <History className="text-accent-400" />
          <span>{t('people.volunteerHistory', { defaultValue: 'Volunteer History' })}</span>
        </h3>
        {canEdit && (!activeVolPeriod ? (
          <button
            onClick={() => {
              setModalDate(new Date().toISOString().split('T')[0]);
              setModalType('vol_start');
            }}
            className="bg-accent-600 hover:bg-accent-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2 font-bold transition-all"
          >
            <PlusCircle size={18} />
            <span>{t('people.newPeriod', { defaultValue: 'New Period' })}</span>
          </button>
        ) : (
          <button
            onClick={() => {
              setModalDate(new Date().toISOString().split('T')[0]);
              setModalType('vol_end');
            }}
            className="bg-danger-600/20 hover:bg-danger-600/30 text-danger-500 border border-danger-900/50 px-4 py-2 rounded-lg flex items-center space-x-2 font-bold transition-all"
          >
            <UserMinus size={18} />
            <span>{t('people.closePeriod', { defaultValue: 'Close Period' })}</span>
          </button>
        ))}
      </div>

      <div className="space-y-4 mt-6">
        {person.volunteerPeriods?.map(p => (
          <div key={p.id} className="border border-neutral-800 bg-neutral-950/50 p-4 rounded-xl flex items-center justify-between group">
            <div className="flex items-center space-x-4">
              <div className={`p-2 rounded-lg ${!p.exitDate ? 'bg-success-900/30 text-success-400' : 'bg-neutral-800 text-neutral-500'}`}>
                {!p.exitDate ? <UserCheck size={20} /> : <History size={20} />}
              </div>
              <div>
                <div className="font-bold text-fg">{!p.exitDate ? t('people.activePeriod', { defaultValue: 'Active Period' }) : t('people.concludedPeriod', { defaultValue: 'Concluded Period' })}</div>
                <div className="text-sm text-neutral-400">
                  {formatDate(p.enrollmentDate)}
                  {p.exitDate ? ` → ${formatDate(p.exitDate)}` : ` → ${t('common.status.today')}`}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {canEdit && (
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity mr-4">
                  <button onClick={() => openEditVolunteerModal(p)} className="p-1.5 text-neutral-400 hover:text-accent-400">
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => onRequestDelete({
                      isOpen: true,
                      type: 'volunteer_period',
                      id: p.id,
                      title: t('people.deleteVolunteerPeriod', { defaultValue: 'Delete Volunteer Period' }),
                      message: t('people.deleteVolunteerPeriodConfirm', { defaultValue: 'Are you sure you want to delete this volunteering period?' }),
                      confirmPhrase: 'DELETE',
                      confirmValue: '',
                      isLoading: false
                    })}
                    className="p-1.5 text-neutral-600 hover:text-danger-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
              {p.exitReason && (
                <div className="text-xs text-neutral-500 italic">{t('people.reason', { defaultValue: 'Reason' })}: {p.exitReason}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Libro Volontari Cartaceo ─────────────────────────── */}
      <div className="pt-6 border-t border-neutral-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2">
            <BookOpen size={14} />
            {t('retention.libroTitle', { defaultValue: 'Physical Volunteer Register (Libro Volontari)' })}
          </h3>
          {canEdit && !isEditingLibro && (
            <button
              onClick={openLibroEdit}
              className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-fg transition-colors"
            >
              <Edit2 size={13} />
              {t('common.actions.edit')}
            </button>
          )}
        </div>

        {isEditingLibro ? (
          <div className="bg-neutral-950/60 border border-neutral-700/60 rounded-xl p-5 space-y-4">
            <label
              className="flex items-center gap-3 cursor-pointer group select-none"
              onClick={() => setLibroForm(prev => ({ ...prev, isInVolunteerRegistryPhysical: !prev.isInVolunteerRegistryPhysical }))}
            >
              <div
                className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${libroForm.isInVolunteerRegistryPhysical ? 'bg-accent-600 border-accent-500' : 'bg-neutral-900 border-neutral-600 group-hover:border-neutral-400'}`}
              >
                {libroForm.isInVolunteerRegistryPhysical && <Check size={13} className="text-fg" />}
              </div>
              <span className="text-sm font-semibold text-neutral-200">
                {t('retention.inLibro', { defaultValue: 'Appears in the physical volunteer register' })}
              </span>
            </label>

            {!!libroForm.isInVolunteerRegistryPhysical && (
              <div className="grid grid-cols-2 gap-4 pl-8">
                <div className="space-y-1">
                  <label className="text-xs text-neutral-500 font-bold uppercase tracking-tighter">
                    {t('retention.libroStartDate', { defaultValue: 'Entry date (start)' })}
                  </label>
                  <input
                    type="date"
                    value={libroForm.volunteerRegistryStartDate}
                    onChange={e => setLibroForm(prev => ({ ...prev, volunteerRegistryStartDate: e.target.value }))}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-fg text-sm focus:border-accent-500 focus:ring-1 focus:ring-accent-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-neutral-500 font-bold uppercase tracking-tighter">
                    {t('retention.libroEndDate', { defaultValue: 'Exit date (leave blank if still active)' })}
                  </label>
                  <input
                    type="date"
                    value={libroForm.volunteerRegistryEndDate}
                    onChange={e => setLibroForm(prev => ({ ...prev, volunteerRegistryEndDate: e.target.value }))}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-fg text-sm focus:border-accent-500 focus:ring-1 focus:ring-accent-500 outline-none"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSaveLibro}
                disabled={savingLibro}
                className="flex items-center gap-1.5 bg-accent-600 hover:bg-accent-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all"
              >
                {savingLibro ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {t('common.actions.save')}
              </button>
              <button
                onClick={() => setIsEditingLibro(false)}
                className="flex items-center gap-1.5 text-neutral-400 hover:text-fg px-4 py-2 rounded-lg text-sm transition-colors"
              >
                <X size={14} />
                {t('common.actions.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-neutral-950/40 border border-neutral-800/50 rounded-xl p-4 flex items-center gap-4">
            {/* Phase 5: Use new field names with fallback to old */}
            <div className={`p-2 rounded-lg border ${(person.isInVolunteerRegistryPhysical ?? person.inLibroVolontariCartaceo)
              ? 'bg-accent-900/20 text-accent-400 border-accent-800/40'
              : 'bg-neutral-800/40 text-neutral-600 border-neutral-700/40'
              }`}>
              <BookOpen size={18} />
            </div>
            <div>
              <div className={`text-sm font-semibold ${(person.isInVolunteerRegistryPhysical ?? person.inLibroVolontariCartaceo) ? 'text-accent-300' : 'text-neutral-500'
                }`}>
                {(person.isInVolunteerRegistryPhysical ?? person.inLibroVolontariCartaceo)
                  ? t('retention.inLibroYes', { defaultValue: 'In the physical volunteer register' })
                  : t('retention.inLibroNo', { defaultValue: 'Not in the physical volunteer register' })}
              </div>
              {!!(person.isInVolunteerRegistryPhysical ?? person.inLibroVolontariCartaceo) && (
                <div className="text-xs text-neutral-400 mt-0.5">
                  {(person.volunteerRegistryStartDate ?? person.libroVolontariStartDate) ? formatDate(person.volunteerRegistryStartDate ?? person.libroVolontariStartDate!) : '—'}
                  {' → '}
                  {(person.volunteerRegistryEndDate ?? person.libroVolontariEndDate)
                    ? formatDate(person.volunteerRegistryEndDate ?? person.libroVolontariEndDate!)
                    : t('common.status.ongoing')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <EditPeriodModal
        isOpen={modalType === 'vol_edit'}
        modalType={modalType === 'vol_edit' ? 'vol_edit' : null}
        periodForm={periodForm}
        setPeriodForm={setPeriodForm}
        onClose={() => setModalType(null)}
        onConfirm={handleEditPeriodConfirm}
      />

      <PeriodModal
        isOpen={modalType === 'vol_start' || modalType === 'vol_end'}
        modalType={modalType === 'vol_start' || modalType === 'vol_end' ? modalType : null}
        modalDate={modalDate}
        setModalDate={setModalDate}
        onClose={() => setModalType(null)}
        onConfirm={handlePeriodModalConfirm}
        activeVolPeriod={activeVolPeriod}
      />
    </div>
  );
};

export default VolunteerTab;
