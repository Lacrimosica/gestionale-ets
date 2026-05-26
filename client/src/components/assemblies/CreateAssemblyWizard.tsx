import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { X, Check, Loader2, Plus } from 'lucide-react';
import { useAssemblyForm } from '../../hooks/useAssemblyForm';
import { useBoardGenerations } from '../../hooks/useBoardGenerations';
import { useAddresses } from '../../hooks/useSettings';
import { normalizeRole } from '../../lib/board-roles';
import type { MemberCandidate } from '../SingleMemberPicker';
import { API_BASE_URL } from '../../config';
import { formatDate } from '../../lib/date-utils';
import { AssemblyTypeSection } from './wizard/AssemblyTypeSection';
import { AssemblyCallScheduleSection } from './wizard/AssemblyCallScheduleSection';
import { AssemblyRolesSection } from './wizard/AssemblyRolesSection';
import { AgendaBuilderPanel } from './wizard/AgendaBuilderPanel';

interface CreateAssemblyWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (assemblyId: string) => void;
  memberCandidates: MemberCandidate[];
  membersLoading: boolean;
}

export const CreateAssemblyWizard = ({
  isOpen,
  onClose,
  onCreated,
  memberCandidates,
  membersLoading,
}: CreateAssemblyWizardProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { generations, getMembers } = useBoardGenerations();
  const { addresses } = useAddresses(true);
  const {
    form,
    setForm,
    newAgendaTitle,
    setNewAgendaTitle,
    newAgendaWorkflow,
    setNewAgendaWorkflow,
    newAgendaMembers,
    setNewAgendaMembers,
    addAgendaItem,
    removeAgendaItem,
    applyCurrentTemplate,
    computeConvocationDate,
  } = useAssemblyForm();

  const [creating, setCreating] = useState(false);
  const [boardMembers, setBoardMembers] = useState<Record<string, any[]>>({});
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!isOpen || generations.length === 0 || fetchedRef.current) return;

    const fetchBoardMembers = async () => {
      const membersByGen: Record<string, any[]> = {};
      for (const gen of generations) {
        try {
          const members = await getMembers(gen.id);
          membersByGen[gen.id] = members;
        } catch (err) {
          console.error(`Failed to fetch members for generation ${gen.id}`, err);
          membersByGen[gen.id] = [];
        }
      }
      setBoardMembers(membersByGen);
      fetchedRef.current = true;
    };
    fetchBoardMembers();
  }, [isOpen, generations, getMembers]);

  const getGenerationLabel = (genId: string, genName: string) => {
    const members = boardMembers[genId] || [];
    const president = members.find(m => normalizeRole(m.member?.role) === 'president');
    const vicePresident = members.find(m => normalizeRole(m.member?.role) === 'vice_president');

    const presName = president?.person?.lastName;
    const vpName = vicePresident?.person?.lastName;

    if (presName || vpName) {
      let suffix = ' -';
      if (presName) suffix += ` P. ${presName}`;
      if (vpName) suffix += ` / VP. ${vpName}`;
      return `${genName}${suffix}`;
    }
    return genName;
  };

  if (!isOpen) return null;

  const handleClose = () => {
    fetchedRef.current = false;
    onClose();
  };

  const handleCreate = async () => {
    const needsFirstCallLocation = form.mode === 'in_person' || form.mode === 'hybrid';
    const needsSecondCallLocation = form.secondCallMode === 'in_person' || form.secondCallMode === 'hybrid';
    const isValid = (needsFirstCallLocation ? form.location : true) && form.presidentId && form.secretaryId && (!form.hasSecondCall || (form.secondCallDate && form.secondCallTime && (needsSecondCallLocation ? form.secondCallLocation : true)));
    if (!isValid) return;
    if (form.type === 'board_council' && !form.boardGenerationId) return;

    setCreating(true);
    try {
      // 1. Create Primary Assembly (Backend will automatically create a Convocation because we send convocationDate)
      const res1 = await axios.post(`${API_BASE_URL}/assemblies`, {
        type: form.type,
        subtype: form.subtype || null,
        firstCallDate: form.firstCallDate,
        firstCallTime: form.firstCallTime || null,
        convocationDate: form.type !== 'constitution' ? (form.convocationDate || null) : null,
        location: form.location,
        mode: form.mode,
        meetLink: form.meetLink || null,
        presidentId: form.presidentId,
        secretaryId: form.secretaryId,
        boardGenerationId: form.boardGenerationId || null,
      });
      const a1 = res1.data;
      const a1Id = a1.id;

      // The backend returns pairing info if it created/found a convocation
      const convId = a1.convocationId;

      if (form.hasSecondCall) {
        // 2. Create Secondary Assembly
        const res2 = await axios.post(`${API_BASE_URL}/assemblies`, {
          type: form.type,
          subtype: form.subtype || null,
          firstCallDate: form.secondCallDate,
          firstCallTime: form.secondCallTime,
          location: form.secondCallLocation,
          mode: form.secondCallMode,
          presidentId: form.presidentId,
          secretaryId: form.secretaryId,
          boardGenerationId: form.boardGenerationId || null,
        });
        const a2Id = res2.data.id;

        // 3. Link A2 to the existing Convocation
        if (convId) {
          await axios.patch(`${API_BASE_URL}/convocations/${convId}`, {
            secondAssemblyId: a2Id,
          });
        }
      }

      // 4. Add Agenda Items (use convId from A1)
      if (convId && form.initialAgenda.length > 0) {
        for (const item of form.initialAgenda) {
          await axios.post(`${API_BASE_URL}/convocations/${convId}/agenda`, {
            number: item.number,
            title: item.title,
            workflowType: item.workflowType || null,
          });
        }
      }

      handleClose();
      navigate(`/assemblies/${a1Id}`);
      onCreated?.(a1Id);
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const isButtonDisabled = creating
    || ((form.mode === 'in_person' || form.mode === 'hybrid') && !form.location)
    || !form.presidentId
    || !form.secretaryId
    || (form.type === 'board_council' && !form.boardGenerationId)
    || (form.hasSecondCall && (!form.secondCallDate || ((form.secondCallMode === 'in_person' || form.secondCallMode === 'hybrid') && !form.secondCallLocation)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-600/20 p-2 rounded-lg text-purple-400">
              <Plus size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{t('assemblies.newAssembly')}</h2>
              <p className="text-xs text-slate-500">Configurazione guidata nuova assemblea</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar flex-1">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* LEFT SIDE: CONFIGURATION */}
            <div className="md:col-span-7 space-y-8">
              <AssemblyTypeSection
                form={form}
                setForm={setForm}
                generations={generations}
                getGenerationLabel={getGenerationLabel}
              />

              <AssemblyCallScheduleSection
                form={form}
                setForm={setForm}
                computeConvocationDate={computeConvocationDate}
                addresses={addresses}
              />

              <AssemblyRolesSection
                form={form}
                setForm={setForm}
                memberCandidates={memberCandidates}
                membersLoading={membersLoading}
              />
            </div>

            {/* RIGHT SIDE: AGENDA BUILDER */}
            <AgendaBuilderPanel
              form={form}
              newAgendaTitle={newAgendaTitle}
              setNewAgendaTitle={setNewAgendaTitle}
              newAgendaWorkflow={newAgendaWorkflow}
              setNewAgendaWorkflow={setNewAgendaWorkflow}
              newAgendaMembers={newAgendaMembers}
              setNewAgendaMembers={setNewAgendaMembers}
              addAgendaItem={addAgendaItem}
              removeAgendaItem={removeAgendaItem}
              applyCurrentTemplate={applyCurrentTemplate}
              memberCandidates={memberCandidates}
              membersLoading={membersLoading}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4 text-[10px] text-slate-500">
            <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded border border-slate-800">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              1ª call: {form.firstCallDate ? formatDate(form.firstCallDate) : '??'}
            </div>
            {form.hasSecondCall && (
              <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                2ª call: {form.secondCallDate ? formatDate(form.secondCallDate) : '??'}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleClose}
              className="px-6 py-2 rounded-lg font-bold text-slate-400 hover:text-white transition-all text-sm"
            >
              {t('common.actions.cancel')}
            </button>
            <button
              onClick={handleCreate}
              disabled={isButtonDisabled}
              className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-8 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-purple-900/20 text-sm"
            >
              {creating ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              <span>{creating ? t('common.status.loading') : t('common.actions.create')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
