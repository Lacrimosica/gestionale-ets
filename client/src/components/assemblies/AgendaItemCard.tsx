import { useTranslation } from 'react-i18next';
import { Pencil, Trash2, ChevronDown, Check, X, Loader2 } from 'lucide-react';
import type { AgendaItem, WorkflowItemType } from '../../types/assembly';
import { WorkflowItemConfigurator } from './WorkflowItemConfigurator';
import { VotingResultsField } from './VotingResultsField';

interface AgendaItemCardProps {
  item: AgendaItem;
  isEditing: boolean;
  isExpanded: boolean;
  editForm: {
    number: string;
    title: string;
    description: string;
    workflowType: WorkflowItemType | '';
  };
  setNumber: (val: string) => void;
  setTitle: (val: string) => void;
  setDescription: (val: string) => void;
  setWorkflowType: (val: WorkflowItemType | '') => void;
  saving: boolean;
  onStartEdit: (item: AgendaItem) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: (itemId: string) => void;
  onToggleExpand: (itemId: string) => void;
  onWorkflowDataChange: (workflowData: any) => void;
  onSaveWorkflow: () => void;
  savingWorkflow: boolean;
  candidates: any[];
  candidatesLoading: boolean;
}

const WORKFLOW_LABELS_IT = {
  member_admission: 'Ammissione soci',
  member_resignation: "Presa d'atto dimissioni",
  member_exclusion: 'Esclusione soci',
  budget_approval: 'Approvazione bilancio',
  board_election: 'Elezione direttivo',
} as const;

export const AgendaItemCard = ({
  item,
  isEditing,
  isExpanded,
  editForm,
  setNumber,
  setTitle,
  setDescription,
  setWorkflowType,
  saving,
  onStartEdit,
  onSave,
  onCancel,
  onDelete,
  onToggleExpand,
  onWorkflowDataChange,
  onSaveWorkflow,
  savingWorkflow,
  candidates,
  candidatesLoading,
}: AgendaItemCardProps) => {
  const { t } = useTranslation();

  if (isEditing) {
    return (
      <li className="bg-slate-950/50 rounded-lg border border-slate-800">
        <div className="p-3 flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              value={editForm.number}
              onChange={e => setNumber(e.target.value)}
              className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm shrink-0"
            />
            <input
              type="text"
              value={editForm.title}
              onChange={e => setTitle(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm"
            />
          </div>
          <textarea
            rows={3}
            value={editForm.description}
            onChange={e => setDescription(e.target.value)}
            placeholder={t('assemblies.agendaDescPlaceholder', { defaultValue: 'Description (optional)' })}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:ring-1 focus:ring-amber-500/30 transition-all resize-y"
          />
          <select
            value={editForm.workflowType}
            onChange={e => setWorkflowType(e.target.value as WorkflowItemType | '')}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm"
          >
            <option value="">— Punto generico —</option>
            <option value="member_admission">Ammissione soci</option>
            <option value="member_resignation">Presa d'atto dimissioni</option>
            <option value="member_exclusion">Esclusione soci</option>
            <option value="budget_approval">Approvazione bilancio</option>
            <option value="board_election">Elezione direttivo</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={onSave}
              disabled={saving || !editForm.title.trim()}
              className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
            >
              <Check size={13} />
              {saving ? t('common.status.saving') : t('common.actions.save')}
            </button>
            <button
              onClick={onCancel}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white px-3 py-1.5 rounded-lg text-xs"
            >
              <X size={13} /> {t('common.actions.cancel')}
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className={`bg-slate-950/50 rounded-lg border transition-colors ${item.workflowType ? 'border-purple-800/40' : 'border-slate-800'}`}>
      <div className="p-3 flex gap-3 items-start">
        <span className="text-slate-500 font-bold shrink-0">{item.number}.</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-slate-200 font-medium">{item.title}</p>
            {item.workflowType && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-300 border border-purple-800/50 uppercase tracking-wide shrink-0">
                {WORKFLOW_LABELS_IT[item.workflowType]}
              </span>
            )}
          </div>
          {item.description && <p className="text-slate-500 text-sm mt-0.5">{item.description}</p>}
        </div>
        <div className="flex gap-2 shrink-0 mt-0.5">
          <button
            onClick={() => onToggleExpand(item.id)}
            className="text-slate-600 hover:text-purple-400 transition-colors"
            title="Configura"
          >
            <ChevronDown size={15} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={() => onStartEdit(item)}
            className="text-slate-600 hover:text-amber-400 transition-colors"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="text-slate-600 hover:text-red-400 transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className={`border-t p-3 bg-slate-950/20 space-y-3 ${item.workflowType ? 'border-purple-800/20' : 'border-slate-800/40'}`}>
          {item.workflowType && (
            <>
              <WorkflowItemConfigurator
                workflowType={item.workflowType}
                workflowData={item.workflowData ?? undefined}
                candidates={candidates}
                candidatesLoading={candidatesLoading}
                onWorkflowDataChange={onWorkflowDataChange}
              />

              {item.workflowType !== 'member_resignation' && (
                <VotingResultsField
                  votes={item.workflowData?.voting ?? []}
                  onChange={(voting) => onWorkflowDataChange({ ...item.workflowData, voting })}
                />
              )}

              <div className="flex justify-end pt-2 border-t border-slate-800/50 mt-4">
                <button
                  type="button"
                  onClick={onSaveWorkflow}
                  disabled={savingWorkflow}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-md active:scale-95 hover:shadow-emerald-900/20"
                >
                  {savingWorkflow ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  {savingWorkflow ? t('common.status.saving') : 'Salva Configurazione'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </li>
  );
};
