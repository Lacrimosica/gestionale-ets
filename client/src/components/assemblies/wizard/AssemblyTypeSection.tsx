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
      <div className="flex items-center gap-2 text-special-400">
        <FileText size={16} />
        <h3 className="text-xs font-black uppercase tracking-widest">{t('assemblies.creation.generalInfo')}</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5 text-sm">
          <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">{t('common.fields.type')}</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as any })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 focus:ring-2 focus:ring-special-600 outline-none"
          >
            <option value="ordinary">{t('assemblies.types.ordinary')}</option>
            <option value="extraordinary">{t('assemblies.types.extraordinary')}</option>
            <option value="board_council">{t('assemblies.types.board_council')}</option>
            <option value="constitution">{t('assemblies.types.constitution')}</option>
          </select>
        </div>

        {form.type === 'extraordinary' ? (
          <div className="space-y-1.5 text-sm animate-in fade-in slide-in-from-top-1">
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">{t('assemblies.creation.extraordinaryType')}</label>
            <select
              value={form.subtype}
              onChange={(e) => setForm({ ...form, subtype: e.target.value })}
              className="w-full bg-neutral-950 border border-warning-900/40 rounded-lg px-3 py-2 text-neutral-200 focus:ring-2 focus:ring-warning-600 outline-none"
            >
              <option value="generic">{t('assemblies.creation.generic')}</option>
              <option value="statute_modification">{t('assemblies.creation.statuteModification')}</option>
              <option value="dissolution">{t('assemblies.creation.dissolution')}</option>
              <option value="merger_split">{t('assemblies.creation.mergerSplit')}</option>
            </select>
          </div>
        ) : form.type === 'board_council' ? (
          <div className="space-y-1.5 text-sm animate-in fade-in slide-in-from-top-1">
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">{t('assemblies.creation.boardMeetingType')}</label>
            <select
              value={form.subtype}
              onChange={(e) => setForm({ ...form, subtype: e.target.value })}
              className="w-full bg-neutral-950 border border-accent-900/40 rounded-lg px-3 py-2 text-neutral-200 focus:ring-2 focus:ring-accent-600 outline-none"
            >
              <option value="ordinary">{t('assemblies.creation.ordinary')}</option>
              <option value="extraordinary">{t('assemblies.creation.extraordinaryUrgent')}</option>
            </select>
          </div>
        ) : null}
      </div>

      {/* Subtype info banners */}
      {form.type === 'extraordinary' && form.subtype === 'statute_modification' && (
        <div className="flex items-start gap-2 bg-warning-900/10 border border-warning-800/30 rounded-lg p-3 text-xs text-warning-300 animate-in fade-in">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{t('assemblies.creation.statuteInfo')}</span>
        </div>
      )}
      {form.type === 'extraordinary' && form.subtype === 'dissolution' && (
        <div className="flex items-start gap-2 bg-danger-900/10 border border-danger-800/30 rounded-lg p-3 text-xs text-danger-300 animate-in fade-in">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{t('assemblies.creation.dissolutionInfo')}</span>
        </div>
      )}
      {form.type === 'extraordinary' && form.subtype === 'merger_split' && (
        <div className="flex items-start gap-2 bg-warning-900/10 border border-warning-800/30 rounded-lg p-3 text-xs text-warning-300 animate-in fade-in">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{t('assemblies.creation.mergerSplitInfo')}</span>
        </div>
      )}

      {/* Board generation picker */}
      {form.type === 'board_council' && (
        <div className="space-y-1.5 text-sm">
          <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">{t('board.generation')}</label>
          <select
            value={form.boardGenerationId}
            onChange={(e) => setForm({ ...form, boardGenerationId: e.target.value })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 focus:ring-2 focus:ring-special-600 outline-none"
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
