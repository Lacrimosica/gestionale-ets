import { useTranslation } from 'react-i18next';
import { FileText, AlertCircle } from 'lucide-react';
import type { BoardGeneration } from './wizardTypes';

// Local type definition to avoid circular imports
interface AssemblyForm {
  type: string;
  subtype: string;
  mode: 'in_person' | 'remote' | 'hybrid';
  location: string;
  meetLink: string;
  boardGenerationId: string;
  hasSecondCall: boolean;
  secondCallLocation: string;
}

interface AssemblyTypeSectionProps {
  form: AssemblyForm;
  setForm: (f: any) => void;
  generations: BoardGeneration[];
  getGenerationLabel?: (genId: string, genName: string) => string;
}

export const AssemblyTypeSection = ({
  form,
  setForm,
  generations,
  getGenerationLabel,
}: AssemblyTypeSectionProps) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-purple-400">
        <FileText size={16} />
        <h3 className="text-xs font-black uppercase tracking-widest">Informazioni Generali</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5 text-sm">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('common.fields.type')}</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as any })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:ring-2 focus:ring-purple-600 outline-none"
          >
            <option value="ordinary">{t('assemblies.types.ordinary')}</option>
            <option value="extraordinary">{t('assemblies.types.extraordinary')}</option>
            <option value="board_council">{t('assemblies.types.board_council')}</option>
            <option value="constitution">{t('assemblies.types.constitution')}</option>
          </select>
        </div>

        {form.type === 'extraordinary' ? (
          <div className="space-y-1.5 text-sm animate-in fade-in slide-in-from-top-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipologia straordinaria</label>
            <select
              value={form.subtype}
              onChange={(e) => setForm({ ...form, subtype: e.target.value })}
              className="w-full bg-slate-950 border border-amber-900/40 rounded-lg px-3 py-2 text-slate-200 focus:ring-2 focus:ring-amber-600 outline-none"
            >
              <option value="generic">Generica</option>
              <option value="statute_modification">Modifica Statuto</option>
              <option value="dissolution">Scioglimento</option>
              <option value="merger_split">Fusione / Scissione</option>
            </select>
          </div>
        ) : form.type === 'board_council' ? (
          <div className="space-y-1.5 text-sm animate-in fade-in slide-in-from-top-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipologia riunione CD</label>
            <select
              value={form.subtype}
              onChange={(e) => setForm({ ...form, subtype: e.target.value })}
              className="w-full bg-slate-950 border border-blue-900/40 rounded-lg px-3 py-2 text-slate-200 focus:ring-2 focus:ring-blue-600 outline-none"
            >
              <option value="ordinary">Ordinaria</option>
              <option value="extraordinary">Straordinaria (urgente)</option>
            </select>
          </div>
        ) : null}
      </div>

      {/* Subtype info banners */}
      {form.type === 'extraordinary' && form.subtype === 'statute_modification' && (
        <div className="flex items-start gap-2 bg-amber-900/10 border border-amber-800/30 rounded-lg p-3 text-xs text-amber-300 animate-in fade-in">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>Le modifiche statutarie devono essere registrate presso l'Agenzia delle Entrate entro 30 giorni dalla delibera. Quorum spesso più elevato — verificare lo Statuto.</span>
        </div>
      )}
      {form.type === 'extraordinary' && form.subtype === 'dissolution' && (
        <div className="flex items-start gap-2 bg-red-900/10 border border-red-800/30 rounded-lg p-3 text-xs text-red-300 animate-in fade-in">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>La delibera di scioglimento va registrata presso RUNTS e Agenzia delle Entrate entro 30 giorni. Prevedere nomina del liquidatore e devoluzione del patrimonio residuo.</span>
        </div>
      )}
      {form.type === 'extraordinary' && form.subtype === 'merger_split' && (
        <div className="flex items-start gap-2 bg-amber-900/10 border border-amber-800/30 rounded-lg p-3 text-xs text-amber-300 animate-in fade-in">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>La delibera di fusione/scissione deve essere comunicata al RUNTS entro 30 giorni. Verificare i requisiti di quorum rafforzato nello Statuto.</span>
        </div>
      )}

      {/* Board generation picker */}
      {form.type === 'board_council' && (
        <div className="space-y-1.5 text-sm">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('board.generation')}</label>
          <select
            value={form.boardGenerationId}
            onChange={(e) => setForm({ ...form, boardGenerationId: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:ring-2 focus:ring-purple-600 outline-none"
          >
            <option value="">{t('common.fields.select')}</option>
            {generations.map((g) => (
              <option key={g.id} value={g.id}>{getGenerationLabel ? getGenerationLabel(g.id, g.name) : g.name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};
