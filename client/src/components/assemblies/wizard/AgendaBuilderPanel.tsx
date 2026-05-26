import { Plus, ListOrdered } from 'lucide-react';
import type { MemberCandidate } from '../../SingleMemberPicker';
import { MemberPickerField } from '../../MemberPickerField';

interface AssemblyForm {
  initialAgenda: Array<{
    number: number;
    title: string;
    workflowType: string;
  }>;
}

interface AgendaBuilderPanelProps {
  form: AssemblyForm;
  newAgendaTitle: string;
  setNewAgendaTitle: (title: string) => void;
  newAgendaWorkflow: string;
  setNewAgendaWorkflow: (workflow: string) => void;
  newAgendaMembers: string[];
  setNewAgendaMembers: (members: string[]) => void;
  addAgendaItem: (title: string, workflowType: string) => void;
  removeAgendaItem: (index: number) => void;
  applyCurrentTemplate: () => void;
  memberCandidates: MemberCandidate[];
  membersLoading: boolean;
}

export const AgendaBuilderPanel = ({
  form,
  newAgendaTitle,
  setNewAgendaTitle,
  newAgendaWorkflow,
  setNewAgendaWorkflow,
  newAgendaMembers,
  setNewAgendaMembers,
  addAgendaItem,
  removeAgendaItem,
  applyCurrentTemplate,
  memberCandidates,
  membersLoading,
}: AgendaBuilderPanelProps) => {
  return (
    <div className="md:col-span-5 bg-slate-950/30 rounded-2xl border border-slate-800 p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-purple-400">
          <ListOrdered size={16} />
          <h3 className="text-xs font-black uppercase tracking-widest">Ordine del Giorno</h3>
        </div>
        <button
          type="button"
          onClick={applyCurrentTemplate}
          className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-purple-900/30 text-purple-400 border border-purple-800/40 hover:bg-purple-900/50 transition-colors"
        >
          Template
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-[200px]">
        {form.initialAgenda.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2 opacity-50 italic">
            <ListOrdered size={24} />
            <p className="text-xs">Nessun punto aggiunto</p>
          </div>
        ) : (
          form.initialAgenda.map((item, idx) => (
            <div key={idx} className="bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg flex items-center gap-3">
              <span className="text-[10px] font-bold text-slate-600 w-4 shrink-0">{item.number}.</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-300 font-medium truncate">{item.title}</p>
                {item.workflowType && (
                  <p className="text-[10px] text-purple-400 font-mono leading-none mt-1">{item.workflowType}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeAgendaItem(idx)}
                className="text-slate-600 hover:text-red-400 transition-colors"
              >
                X
              </button>
            </div>
          ))
        )}
      </div>

      <div className="pt-4 border-t border-slate-800 space-y-3 shrink-0">
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Titolo punto odg…"
            value={newAgendaTitle}
            onChange={(e) => setNewAgendaTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addAgendaItem(newAgendaTitle, newAgendaWorkflow)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-700 outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600/30 transition-all"
          />

          {(newAgendaWorkflow === 'member_admission' || newAgendaWorkflow === 'member_resignation') && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Seleziona Soci</label>
              <MemberPickerField
                candidates={memberCandidates}
                selected={newAgendaMembers}
                onChange={setNewAgendaMembers}
                loading={membersLoading}
                placeholder="Cerca soci..."
              />
            </div>
          )}

          <div className="flex gap-2">
            <select
              value={newAgendaWorkflow}
              onChange={(e) => setNewAgendaWorkflow(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-[10px] text-slate-400 outline-none focus:border-purple-600"
            >
              <option value="">— Punto generico —</option>
              <option value="member_admission">Ammissione soci</option>
              <option value="member_resignation">Presa d'atto dimissioni</option>
              <option value="budget_approval">Bilancio</option>
              <option value="board_election">Elezione direttivo</option>
            </select>
            <button
              type="button"
              onClick={() => addAgendaItem(newAgendaTitle, newAgendaWorkflow)}
              className="px-3 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors shadow-lg shadow-purple-900/40"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
