import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, ChevronDown } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../config';

const EXPORTABLE_TABLES = [
  { key: 'people', labelKey: 'settings.export.tables.people' },
  { key: 'volunteer_periods', labelKey: 'settings.export.tables.volunteer_periods' },
  { key: 'member_periods', labelKey: 'settings.export.tables.member_periods' },
  { key: 'board', labelKey: 'settings.export.tables.board', expandTo: ['board_generations', 'board_members'] },
  { key: 'assemblies', labelKey: 'settings.export.tables.assemblies' },
  { key: 'convocations', labelKey: 'settings.export.tables.convocations' },
  { key: 'organization_settings', labelKey: 'settings.export.tables.organization_settings' },
  { key: 'compliance_documents', labelKey: 'settings.export.tables.compliance_documents' },
  { key: 'compliance_roles', labelKey: 'settings.export.tables.compliance_roles' },
] as const;

interface Props {
  expanded: boolean;
  onToggle: () => void;
}

export const ExportSection = ({ expanded, onToggle }: Props) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Set<string>>(
    new Set(EXPORTABLE_TABLES.map(t => t.key))
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const handleExport = async () => {
    if (selected.size === 0) return;

    // Expand 'board' into its component tables
    const expandedSelected: string[] = [];
    for (const key of selected) {
      const table = EXPORTABLE_TABLES.find(t => t.key === key);
      if (table && 'expandTo' in table && table.expandTo) {
        expandedSelected.push(...table.expandTo);
      } else {
        expandedSelected.push(key);
      }
    }

    setLoading(true);
    setMessage(null);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/export`,
        { tables: expandedSelected },
        { responseType: 'blob' }
      );
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: t('settings.export.success') });
    } catch {
      setMessage({ type: 'error', text: t('settings.export.error') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-xl space-y-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-3">
          <Download className="text-info-400" size={20} />
          <div className="text-left">
            <h2 className="text-lg font-semibold text-fg">{t('settings.export.title')}</h2>
            <p className="text-sm text-neutral-500">{t('settings.export.description')}</p>
          </div>
        </div>
        <ChevronDown
          size={20}
          className={`text-neutral-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="space-y-4 pt-2">
          <p className="text-sm text-neutral-400">{t('settings.export.selectTables')}</p>
          <div className="space-y-2">
            {EXPORTABLE_TABLES.map(({ key, labelKey }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.has(key)}
                  onChange={() => toggle(key)}
                  className="w-4 h-4 accent-info-400"
                />
                <span className="text-sm text-neutral-200">{t(labelKey)}</span>
              </label>
            ))}
          </div>

          <button
            onClick={handleExport}
            disabled={loading || selected.size === 0}
            className="flex items-center gap-2 px-4 py-2 bg-info-600 hover:bg-info-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Download size={16} />
            )}
            {loading ? t('settings.export.exporting') : t('settings.export.exportButton')}
          </button>

          {message && (
            <div
              className={`text-sm px-3 py-2 rounded-lg ${
                message.type === 'success'
                  ? 'bg-success-900/30 border border-success-700/50 text-success-300'
                  : 'bg-danger-900/30 border border-danger-700/50 text-danger-300'
              }`}
            >
              {message.text}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
