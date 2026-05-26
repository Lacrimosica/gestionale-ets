import { type DocumentSettings } from '../../hooks/useSettings';

interface GoogleDriveTemplatesSectionProps {
  templates: {
    outputFolderId: string | null;
    templateConvocationId: string | null;
    templateConvocationExtraordinaryStatuteId: string | null;
    templateConvocationExtraordinaryDissolutionId: string | null;
    templateMinutes1aId: string | null;
    templateMinutes2aId: string | null;
    templateConvocationBoardId: string | null;
    templateMinutesBoardId: string | null;
  };
  onFormChange: (field: keyof DocumentSettings, value: any) => void;
}

const GoogleDriveTemplatesSection = ({ templates, onFormChange }: GoogleDriveTemplatesSectionProps) => {
  const assemblyFields = [
    ['templateConvocationId', 'Convocazione Assemblea Ordinaria'],
    ['templateConvocationExtraordinaryStatuteId', 'Convocazione Assemblea Straordinaria — Modifica Statuto'],
    ['templateConvocationExtraordinaryDissolutionId', 'Convocazione Assemblea Straordinaria — Scioglimento'],
    ['templateMinutes1aId', 'Verbale 1a convocazione (deserta)'],
    ['templateMinutes2aId', 'Verbale 2a convocazione'],
  ] as [keyof DocumentSettings, string][];

  const boardFields = [
    ['templateConvocationBoardId', 'Convocazione Riunione del Consiglio Direttivo'],
    ['templateMinutesBoardId', 'Verbale Riunione del Consiglio Direttivo'],
  ] as [keyof DocumentSettings, string][];

  return (
    <div className="border border-slate-800 rounded-xl p-5 bg-slate-950/40 space-y-4">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Google Drive</h3>
      <p className="text-xs text-slate-500">Paste the Google Doc file IDs (from the URL) for each template, and the output folder ID.</p>

      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest pt-1">Assemblee dei Soci</p>
      {assemblyFields.map(([field, label]) => (
        <label key={field} className="block">
          <span className="block text-xs text-slate-500 mb-1">{label}</span>
          <input
            value={(templates[field as keyof typeof templates] as string) ?? ''}
            onChange={(e) => onFormChange(field, e.target.value)}
            placeholder="1BxiMV..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm font-mono"
          />
        </label>
      ))}

      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest pt-2">Consiglio Direttivo</p>
      {boardFields.map(([field, label]) => (
        <label key={field} className="block">
          <span className="block text-xs text-slate-500 mb-1">{label}</span>
          <input
            value={(templates[field as keyof typeof templates] as string) ?? ''}
            onChange={(e) => onFormChange(field, e.target.value)}
            placeholder="1BxiMV..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm font-mono"
          />
        </label>
      ))}

      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest pt-2">Cartella di output</p>
      <label className="block">
        <span className="block text-xs text-slate-500 mb-1">Output folder ID</span>
        <input
          value={(templates.outputFolderId as string) ?? ''}
          onChange={(e) => onFormChange('outputFolderId', e.target.value)}
          placeholder="1BxiMV..."
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm font-mono"
        />
      </label>
    </div>
  );
};

export default GoogleDriveTemplatesSection;
