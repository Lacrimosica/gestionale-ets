import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, ChevronDown, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../config';

const IMPORTABLE_TABLES = [
  { key: 'people', labelKey: 'settings.import.tables.people' },
  { key: 'volunteer_periods', labelKey: 'settings.import.tables.volunteer_periods' },
  { key: 'member_periods', labelKey: 'settings.import.tables.member_periods' },
  { key: 'board', labelKey: 'settings.import.tables.board', expandTo: ['board_generations', 'board_members'] },
  { key: 'assemblies', labelKey: 'settings.import.tables.assemblies' },
  { key: 'convocations', labelKey: 'settings.import.tables.convocations' },
  { key: 'organization_settings', labelKey: 'settings.import.tables.organization_settings' },
  { key: 'compliance_documents', labelKey: 'settings.import.tables.compliance_documents' },
  { key: 'compliance_roles', labelKey: 'settings.import.tables.compliance_roles' },
] as const;

interface Props {
  expanded: boolean;
  onToggle: () => void;
}

export const ImportSection = ({ expanded, onToggle }: Props) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(IMPORTABLE_TABLES.map(t => t.key))
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string; details?: Record<string, number> } | null>(null);

  const toggle = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === 'application/zip' || file.name.endsWith('.zip'))) {
      setSelectedFile(file);
      setMessage(null);
    } else {
      setMessage({ type: 'error', text: t('settings.import.invalidFileType') });
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setMessage({ type: 'error', text: t('settings.import.noFileSelected') });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Expand 'board' into its component tables
      const expandedSelected = new Set<string>();
      for (const key of selected) {
        const table = IMPORTABLE_TABLES.find(t => t.key === key);
        if (table && 'expandTo' in table && table.expandTo) {
          table.expandTo.forEach(t => expandedSelected.add(t));
        } else {
          expandedSelected.add(key);
        }
      }

      const response = await axios.post(`${API_BASE_URL}/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setMessage({
          type: 'success',
          text: t('settings.import.success'),
          details: response.data.rowCounts,
        });
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (error) {
      const errorMsg = (error as { response?: { data?: { error?: string } } }).response?.data?.error || t('settings.import.error');
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-3">
          <Upload className="text-cyan-400" size={20} />
          <div className="text-left">
            <h2 className="text-lg font-semibold text-white">{t('settings.import.title')}</h2>
            <p className="text-sm text-slate-500">{t('settings.import.description')}</p>
          </div>
        </div>
        <ChevronDown
          size={20}
          className={`text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="space-y-4 pt-2">
          <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-3 flex gap-2">
            <AlertCircle className="text-amber-300 flex-shrink-0" size={18} />
            <p className="text-sm text-amber-200">{t('settings.import.warning')}</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm text-slate-400">{t('settings.import.selectFile')}</label>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,application/zip"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 px-4 py-2 border border-dashed border-slate-600 hover:border-slate-400 text-slate-200 text-sm rounded-lg transition-colors"
              >
                {selectedFile ? selectedFile.name : t('settings.import.chooseFile')}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-slate-400">{t('settings.import.selectTables')}</p>
            <div className="space-y-2">
              {IMPORTABLE_TABLES.map(({ key, labelKey }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.has(key)}
                    onChange={() => toggle(key)}
                    className="w-4 h-4 accent-cyan-400"
                  />
                  <span className="text-sm text-slate-200">{t(labelKey)}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={handleImport}
            disabled={loading || !selectedFile || selected.size === 0}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Upload size={16} />
            )}
            {loading ? t('settings.import.importing') : t('settings.import.importButton')}
          </button>

          {message && (
            <div
              className={`text-sm px-3 py-2 rounded-lg ${
                message.type === 'success'
                  ? 'bg-emerald-900/30 border border-emerald-700/50 text-emerald-300'
                  : 'bg-red-900/30 border border-red-700/50 text-red-300'
              }`}
            >
              <p>{message.text}</p>
              {message.details && message.type === 'success' && (
                <div className="mt-2 space-y-1 text-xs opacity-90">
                  {Object.entries(message.details).map(([table, count]) => (
                    <p key={table}>
                      {table}: {count} {count === 1 ? 'row' : 'rows'}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
