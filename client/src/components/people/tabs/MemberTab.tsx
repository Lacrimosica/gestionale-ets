import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, History, UserMinus, Edit2, Trash2, PlusCircle } from 'lucide-react';
import { formatDate } from '../../../lib/date-utils';
import EditPeriodModal from '../modals/EditPeriodModal';
import PeriodModal from '../modals/PeriodModal';

interface MemberPeriod {
  id: string;
  admissionDate: string;
  resignationDate?: string;
  exitReason?: string;
  notes?: string;
}

interface VolunteerPeriod {
  id: string;
  enrollmentDate: string;
  exitDate?: string;
}

interface Person {
  id: string;
  memberPeriods?: MemberPeriod[];
  volunteerPeriods?: VolunteerPeriod[];
}

interface MemberTabProps {
  person: Person;
  canEdit: boolean;
  startMembership: (data: any) => Promise<void>;
  endMembership: (periodId: string, data: any) => Promise<void>;
  updateMemberPeriod: (periodId: string, data: any) => Promise<void>;
  refresh: () => Promise<void>;
  refreshCompliance: () => Promise<void>;
  onRequestDelete: (config: any) => void;
}

interface PeriodFormData {
  date: string;
  endDate: string;
  reason: string;
  notes: string;
}

type ModalType = 'soc_start' | 'soc_end' | 'soc_edit' | null;

const MemberTab = ({
  person,
  canEdit,
  startMembership,
  endMembership,
  updateMemberPeriod,
  refresh,
  refreshCompliance,
  onRequestDelete,
}: MemberTabProps) => {
  const { t } = useTranslation();
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [periodForm, setPeriodForm] = useState<PeriodFormData>({ date: '', endDate: '', reason: '', notes: '' });
  const [modalDate, setModalDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const activeVolPeriod = person.volunteerPeriods?.find(p => !p.exitDate);
  const activeSocioPeriod = person.memberPeriods?.find(p => !p.resignationDate);

  const openEditMemberModal = (period: MemberPeriod) => {
    setSelectedPeriodId(period.id);
    setPeriodForm({
      date: period.admissionDate,
      endDate: period.resignationDate || '',
      reason: period.exitReason || '',
      notes: period.notes || ''
    });
    setModalType('soc_edit');
  };

  const handleEditPeriodConfirm = async (modalType: 'vol_edit' | 'soc_edit' | null) => {
    if (modalType === 'soc_edit' && selectedPeriodId) {
      await updateMemberPeriod(selectedPeriodId, {
        admissionDate: periodForm.date,
        resignationDate: periodForm.endDate || undefined,
        exitReason: periodForm.reason || undefined,
        notes: periodForm.notes || undefined
      });
      await refresh();
      setModalType(null);
    }
  };

  const handlePeriodModalConfirm = async (modalType: 'vol_start' | 'vol_end' | 'soc_start' | 'soc_end' | null, modalDate: string) => {
    if (modalType === 'soc_start' && activeVolPeriod) {
      await startMembership({ admissionDate: modalDate, volunteerPeriodId: activeVolPeriod.id });
      await refresh();
      await refreshCompliance();
    } else if (modalType === 'soc_end' && activeSocioPeriod) {
      await endMembership(activeSocioPeriod.id, { resignationDate: modalDate, exitReason: 'resignation' });
      await refresh();
      await refreshCompliance();
    }
    setModalType(null);
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white flex items-center space-x-2">
          <ShieldCheck className="text-blue-400" />
          <span>{t('people.membershipHistory', { defaultValue: 'Membership History' })}</span>
        </h3>
        {canEdit && (!activeSocioPeriod ? (
          <button
            onClick={() => {
              if (!activeVolPeriod) {
                alert(t('people.alerts.needActiveVolunteer', { defaultValue: 'The person must have an active volunteer period to be admitted as a member.' }));
                return;
              }
              setModalDate(new Date().toISOString().split('T')[0]);
              setModalType('soc_start');
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title={!activeVolPeriod ? t('people.alerts.needActiveVolunteer') : undefined}
            disabled={!activeVolPeriod}
          >
            <PlusCircle size={18} />
            <span>{t('people.newAdmission', { defaultValue: 'New Admission' })}</span>
          </button>
        ) : (
          <button
            onClick={() => {
              setModalDate(new Date().toISOString().split('T')[0]);
              setModalType('soc_end');
            }}
            className="bg-red-600/20 hover:bg-red-600/30 text-red-500 border border-red-900/50 px-4 py-2 rounded-lg flex items-center space-x-2 font-bold transition-all"
          >
            <UserMinus size={18} />
            <span>{t('people.registerResignation', { defaultValue: 'Register Resignation' })}</span>
          </button>
        ))}
      </div>

      <div className="space-y-4 mt-6">
        {person.memberPeriods?.map(p => (
          <div key={p.id} className="border border-slate-800 bg-slate-950/50 p-4 rounded-xl flex items-center justify-between group">
            <div className="flex items-center space-x-4">
              <div className={`p-2 rounded-lg ${!p.resignationDate ? 'bg-blue-900/30 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
                {!p.resignationDate ? <ShieldCheck size={20} /> : <History size={20} />}
              </div>
              <div>
                <div className="font-bold text-white">{!p.resignationDate ? t('people.activeMember', { defaultValue: 'Active Member' }) : t('people.resignedMember', { defaultValue: 'Resigned Member' })}</div>
                <div className="text-sm text-slate-400">
                  {formatDate(p.admissionDate)}
                  {p.resignationDate ? ` → ${formatDate(p.resignationDate)}` : ` → ${t('common.status.today')}`}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {canEdit && (
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity mr-4">
                  <button onClick={() => openEditMemberModal(p)} className="p-1.5 text-slate-400 hover:text-blue-400">
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => onRequestDelete({
                      isOpen: true,
                      type: 'member_period',
                      id: p.id,
                      title: t('people.deleteMemberPeriod', { defaultValue: 'Delete Member Period' }),
                      message: t('people.deleteMemberPeriodConfirm', { defaultValue: 'Are you sure you want to delete this membership period?' }),
                      confirmPhrase: 'DELETE',
                      confirmValue: '',
                      isLoading: false
                    })}
                    className="p-1.5 text-slate-600 hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
              {p.exitReason && (
                <div className="text-xs text-slate-500 italic">{t('people.reason')}: {p.exitReason}</div>
              )}
            </div>
          </div>
        ))}
        {(!person.memberPeriods || person.memberPeriods.length === 0) && (
          <div className="text-center py-12 text-slate-500 italic">
            {t('people.noMemberRecords', { defaultValue: 'No member records for this person.' })}
          </div>
        )}
      </div>

      <EditPeriodModal
        isOpen={modalType === 'soc_edit'}
        modalType={modalType === 'soc_edit' ? 'soc_edit' : null}
        periodForm={periodForm}
        setPeriodForm={setPeriodForm}
        onClose={() => setModalType(null)}
        onConfirm={handleEditPeriodConfirm}
      />

      <PeriodModal
        isOpen={modalType === 'soc_start' || modalType === 'soc_end'}
        modalType={modalType === 'soc_start' || modalType === 'soc_end' ? modalType : null}
        modalDate={modalDate}
        setModalDate={setModalDate}
        onClose={() => setModalType(null)}
        onConfirm={handlePeriodModalConfirm}
        activeVolPeriod={activeVolPeriod}
        activeSocioPeriod={activeSocioPeriod}
      />
    </div>
  );
};

export default MemberTab;
