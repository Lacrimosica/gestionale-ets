import { type DocumentSettings } from '../../hooks/useSettings';

interface DefaultContentSectionProps {
  // Phase 5: Renamed from varieDefaultText to miscellaneousDefaultText
  miscellaneousDefaultText: string | null;
  onFormChange: (field: keyof DocumentSettings, value: any) => void;
}

const DefaultContentSection = ({ miscellaneousDefaultText, onFormChange }: DefaultContentSectionProps) => {
  return (
    <div className="border border-slate-800 rounded-xl p-5 bg-slate-950/40 space-y-4">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Default Content</h3>
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Testo predefinito "Varie ed eventuali"
        </label>
        <textarea
          value={miscellaneousDefaultText ?? ''}
          onChange={(e) => onFormChange('miscellaneousDefaultText', e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all min-h-[100px]"
          placeholder="Es: Non vengono individuati ulteriori argomenti su cui sia necessaria discussione."
        />
      </div>
    </div>
  );
};

export default DefaultContentSection;
