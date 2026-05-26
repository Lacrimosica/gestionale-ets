import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Save, Loader2, ArrowLeftRight } from 'lucide-react';
import { API_BASE_URL } from '../../config';
import type { ConvocationDetail } from '../../types/assembly';

interface ConvocationMetaPanelProps {
  convocationDetail: ConvocationDetail | null;
  onConvocationDetailChange: (detail: ConvocationDetail) => void;
  onSwapRoles: () => Promise<void>;
  isSwappingRoles: boolean;
}

export const ConvocationMetaPanel = ({
  convocationDetail,
  onConvocationDetailChange,
  onSwapRoles,
  isSwappingRoles,
}: ConvocationMetaPanelProps) => {
  const { t } = useTranslation();
  const [convDate, setConvDate] = useState('');
  const [convDocumentLink, setConvDocumentLink] = useState('');
  const [convNotes, setConvNotes] = useState('');
  const [savingConv, setSavingConv] = useState(false);

  // Initialize form fields when convocationDetail loads
  useEffect(() => {
    if (convocationDetail) {
      setConvDate(convocationDetail.date ?? '');
      setConvDocumentLink(convocationDetail.documentLink ?? '');
      setConvNotes(convocationDetail.notes ?? '');
    }
  }, [convocationDetail]);

  const handleSaveConvocationMeta = async () => {
    if (!convocationDetail?.id) return;
    setSavingConv(true);
    try {
      await axios.patch(`${API_BASE_URL}/convocations/${convocationDetail.id}`, {
        date: convDate || undefined,
        documentLink: convDocumentLink || null,
        notes: convNotes || null,
      });
      onConvocationDetailChange({
        ...convocationDetail,
        date: convDate,
        documentLink: convDocumentLink || null,
        notes: convNotes || null,
      });
    } catch {
      // silent
    } finally {
      setSavingConv(false);
    }
  };

  if (!convocationDetail) return null;

  return (
    <div id="convocazioni-panel" className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden scroll-mt-24">
      {/* Convocation metadata row */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            📧
            {t('nav.convocations')}
          </h2>
          <div className="flex items-center gap-2">
            {convocationDetail.secondAssemblyId && (
              <button
                onClick={onSwapRoles}
                disabled={isSwappingRoles}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border border-slate-700 hover:text-white"
                title="Swap 1a and 2a roles"
              >
                {isSwappingRoles ? (
                  <Loader2 size={13} className="animate-spin text-amber-500" />
                ) : (
                  <ArrowLeftRight size={13} className="text-amber-500" />
                )}
                Swap 1a / 2a
              </button>
            )}
            <button
              onClick={handleSaveConvocationMeta}
              disabled={savingConv}
              className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
            >
              {savingConv ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {t('common.actions.save')}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">
              {t('common.fields.sentAt')}
            </label>
            <input
              type="date"
              value={convDate}
              onChange={(e) => setConvDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">
              {t('common.fields.documentLink')}
            </label>
            <input
              type="url"
              value={convDocumentLink}
              onChange={(e) => setConvDocumentLink(e.target.value)}
              placeholder="https://..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">
              {t('common.fields.notes')}
            </label>
            <input
              type="text"
              value={convNotes}
              onChange={(e) => setConvNotes(e.target.value)}
              placeholder="Note…"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
