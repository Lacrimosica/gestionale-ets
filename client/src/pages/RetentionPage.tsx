import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Trash2, AlertTriangle, Lock, RefreshCw, Loader2, BookOpen, FileCheck, User } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { useAuth } from '../hooks/useAuth';
import { PERMISSIONS } from '../lib/permissions';

interface RetentionPerson {
  id: string;
  firstName: string;
  lastName: string;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  // Phase 5: New English-named fields
  isInVolunteerRegistryPhysical: boolean;
  volunteerRegistryStartDate: string | null;
  volunteerRegistryEndDate: string | null;
  appearsInRuntsProceedings: boolean;
  // Keep old Italian names for backward compatibility during transition
  inLibroVolontariCartaceo: boolean;
  libroVolontariStartDate: string | null;
  libroVolontariEndDate: string | null;
  appearsInRuntsVerbale: boolean;
  canBeRemoved: boolean;
  needsRegularization: boolean;
}

interface RetentionData {
  canRemove: RetentionPerson[];
  regularize: RetentionPerson[];
  anchored: RetentionPerson[];
  totals: { canRemove: number; regularize: number; anchored: number; total: number };
}

const PersonRow = ({ p }: { p: RetentionPerson }) => {
  const { t } = useTranslation();
  const missingFields: string[] = [];
  if (!p.taxId) missingFields.push('CF');
  if (!p.email) missingFields.push('Email');
  if (!p.phone) missingFields.push('Tel');

  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-800/40 last:border-0">
      <Link
        to={`/people/${p.id}`}
        className="text-sm text-slate-200 hover:text-white font-medium transition-colors"
      >
        {p.lastName} {p.firstName}
      </Link>
      <div className="flex items-center gap-2 flex-wrap justify-end">
        {/* Phase 5: Use new field names with fallback to old */}
        {(p.appearsInRuntsProceedings ?? p.appearsInRuntsVerbale) && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/50">
            RUNTS
          </span>
        )}
        {(p.isInVolunteerRegistryPhysical ?? p.inLibroVolontariCartaceo) && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-950/40 text-blue-400 border border-blue-800/50 flex items-center gap-1">
            <BookOpen size={9} /> {t('retention.libroVol')}
          </span>
        )}
        {missingFields.length > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-400 border border-amber-800/50">
            {t('retention.missing')}: {missingFields.join(', ')}
          </span>
        )}
      </div>
    </div>
  );
};

interface GroupCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  count: number;
  people: RetentionPerson[];
  borderColor: string;
  headerColor: string;
  countColor: string;
}

const GroupCard = ({ icon, title, subtitle, count, people, borderColor, headerColor, countColor }: GroupCardProps) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const preview = expanded ? people : people.slice(0, 5);

  return (
    <div className={`rounded-xl border ${borderColor} bg-slate-900/40 overflow-hidden`}>
      <div className={`p-4 flex items-start gap-3 ${headerColor}`}>
        <div className="mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-white">{title}</span>
            <span className={`text-2xl font-black ${countColor}`}>{count}</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        </div>
      </div>

      {count > 0 && (
        <div className="px-4 pb-3">
          {preview.map((p) => (
            <PersonRow key={p.id} p={p} />
          ))}
          {people.length > 5 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-xs text-slate-500 hover:text-slate-300 mt-2 transition-colors"
            >
              {expanded ? t('retention.showLess') : t('retention.showAll', { count: people.length })}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const RetentionPage = () => {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const [data, setData] = useState<RetentionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [recomputing, setRecomputing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEdit = hasPermission(PERMISSIONS.peopleEdit);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get<RetentionData>(`${API_BASE_URL}/compliance/retention`);
      setData(res.data);
    } catch {
      setError(t('common.status.errorLoading', { defaultValue: 'Errore nel caricamento' }));
    } finally {
      setLoading(false);
    }
  };

  const handleRecompute = async () => {
    setRecomputing(true);
    setError(null);
    try {
      await axios.post(`${API_BASE_URL}/compliance/recompute`);
      await loadData();
    } catch {
      setError(t('common.status.errorSaving', { defaultValue: 'Errore durante il ricalcolo' }));
    } finally {
      setRecomputing(false);
    }
  };

  // Load on first render
  useEffect(() => { loadData(); }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <Trash2 size={20} className="text-red-400" />
            {t('retention.title', { defaultValue: 'Eliminabilità persone' })}
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            {t('retention.subtitle', { defaultValue: 'Analisi degli obblighi di conservazione dei dati. Indica chi può essere rimosso dalla storia dell\'associazione, chi richiede regolarizzazione e chi è permanentemente ancorato.' })}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            {t('common.actions.refresh', { defaultValue: 'Aggiorna' })}
          </button>
          {canEdit && (
            <button
              onClick={handleRecompute}
              disabled={recomputing || loading}
              className="flex items-center gap-1.5 text-xs font-bold bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-all"
            >
              {recomputing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              {t('retention.recompute', { defaultValue: 'Ricalcola tutto' })}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Legend */}
      <div className="text-xs text-slate-500 bg-slate-900/40 border border-slate-800/50 rounded-lg px-4 py-3 space-y-1">
        <p className="font-bold text-slate-400 mb-2">{t('retention.legendTitle')}</p>
        <p><span className="text-red-400 font-bold">{t('retention.groups.canRemove')}</span> — {t('retention.legend.canRemoveDesc')}</p>
        <p><span className="text-amber-400 font-bold">{t('retention.groups.regularize')}</span> — {t('retention.legend.regularizeDesc')}</p>
        <p><span className="text-slate-300 font-bold">{t('retention.groups.anchored')}</span> — {t('retention.legend.anchoredDesc')}</p>
        <p className="pt-1 text-slate-600">{t('retention.legend.flagNote', { runts: 'RUNTS', libro: t('retention.libroVol') })}</p>
      </div>

      {/* Totals summary */}
      {data && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: t('retention.totals.total'), value: data.totals.total, color: 'text-slate-300' },
            { label: t('retention.totals.canRemove'), value: data.totals.canRemove, color: 'text-red-400' },
            { label: t('retention.totals.regularize'), value: data.totals.regularize, color: 'text-amber-400' },
            { label: t('retention.totals.anchored'), value: data.totals.anchored, color: 'text-slate-400' },
          ].map((item) => (
            <div key={item.label} className="bg-slate-900/40 border border-slate-800/50 rounded-lg p-3 text-center">
              <div className={`text-2xl font-black ${item.color}`}>{item.value}</div>
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wide mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Groups */}
      {loading && !data ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-slate-600" />
        </div>
      ) : data ? (
        <div className="space-y-4">
          <GroupCard
            icon={<Trash2 size={16} className="text-red-400" />}
            title={t('retention.groups.canRemove', { defaultValue: 'Possono essere rimossi' })}
            subtitle={t('retention.groups.canRemoveDesc', { defaultValue: 'Nessun obbligo di conservazione. È sicuro eliminare questi record.' })}
            count={data.totals.canRemove}
            people={data.canRemove}
            borderColor="border-red-900/40"
            headerColor="bg-red-950/20"
            countColor="text-red-400"
          />
          <GroupCard
            icon={<AlertTriangle size={16} className="text-amber-400" />}
            title={t('retention.groups.regularize', { defaultValue: 'Regolarizzazione necessaria' })}
            subtitle={t('retention.groups.regularizeDesc', { defaultValue: 'Obblighi di conservazione attivi ma dati anagrafici incompleti. Completare prima di poter valutare la rimozione.' })}
            count={data.totals.regularize}
            people={data.regularize}
            borderColor="border-amber-900/40"
            headerColor="bg-amber-950/20"
            countColor="text-amber-400"
          />
          <GroupCard
            icon={<Lock size={16} className="text-slate-400" />}
            title={t('retention.groups.anchored', { defaultValue: 'Permanentemente ancorati' })}
            subtitle={t('retention.groups.anchoredDesc', { defaultValue: 'Obblighi di conservazione attivi. Dati completi — nessuna azione richiesta.' })}
            count={data.totals.anchored}
            people={data.anchored}
            borderColor="border-slate-700/40"
            headerColor="bg-slate-800/20"
            countColor="text-slate-400"
          />
        </div>
      ) : null}

      {/* Person libro volontari note */}
      <div className="text-xs text-slate-600 border-t border-slate-800/40 pt-4">
        <p className="flex items-start gap-1.5">
          <FileCheck size={12} className="mt-0.5 shrink-0" />
          {t('retention.libroNote', { defaultValue: 'Il campo "Libro Volontari Cartaceo" e le date di iscrizione/uscita si configurano nel profilo di ogni persona.' })}
        </p>
        <p className="flex items-start gap-1.5 mt-1">
          <User size={12} className="mt-0.5 shrink-0" />
          {t('retention.runtsNote', { defaultValue: 'Il flag "Depositato su RUNTS" si imposta nel verbale dell\'assemblea. Il ricalcolo aggiorna automaticamente i flag di tutte le persone presenti.' })}
        </p>
      </div>
    </div>
  );
};

export default RetentionPage;
