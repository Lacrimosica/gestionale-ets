import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import type { WorkflowItemType } from '../../types/assembly';

interface AddAgendaItemFormProps {
  formState: {
    title: string;
    description: string;
    number: string;
    workflowType: WorkflowItemType | '';
  };
  setTitle: (val: string) => void;
  setDescription: (val: string) => void;
  setNumber: (val: string) => void;
  setWorkflowType: (val: WorkflowItemType | '') => void;
  adding: boolean;
  onAdd: () => void;
}

export const AddAgendaItemForm = ({
  formState,
  setTitle,
  setDescription,
  setNumber,
  setWorkflowType,
  adding,
  onAdd,
}: AddAgendaItemFormProps) => {
  const { t } = useTranslation();

  return (
    <div className="border border-slate-800 rounded-lg p-4 bg-slate-950/30">
      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-3">{t('assemblies.addAgendaItem', { defaultValue: 'Add agenda item' })}</p>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="number"
            min={1}
            value={formState.number}
            onChange={e => setNumber(e.target.value)}
            placeholder="N."
            className="md:col-span-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm w-16"
          />
          <input
            type="text"
            value={formState.title}
            onChange={e => setTitle(e.target.value)}
            placeholder={t('assemblies.agendaTitlePlaceholder', { defaultValue: 'Item title' })}
            className="md:col-span-3 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
          />
        </div>
        <textarea
          rows={2}
          value={formState.description}
          onChange={e => setDescription(e.target.value)}
          placeholder={t('assemblies.agendaDescPlaceholder', { defaultValue: 'Description (optional)' })}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-slate-500/30 transition-all resize-y"
        />
        <select
          value={formState.workflowType}
          onChange={e => setWorkflowType(e.target.value as WorkflowItemType | '')}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
        >
          <option value="">— Punto generico (testo libero) —</option>
          <option value="member_admission">Ammissione soci</option>
          <option value="member_resignation">Presa d'atto dimissioni</option>
          <option value="member_exclusion">Esclusione soci</option>
          <option value="budget_approval">Approvazione bilancio</option>
          <option value="board_election">Elezione direttivo</option>
        </select>
        <button
          onClick={onAdd}
          disabled={adding || !formState.title.trim()}
          className="flex items-center justify-center gap-2 w-fit bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Plus size={16} />
          {adding ? t('common.status.adding') : t('common.addItem', { defaultValue: 'Add item' })}
        </button>
      </div>
    </div>
  );
};
