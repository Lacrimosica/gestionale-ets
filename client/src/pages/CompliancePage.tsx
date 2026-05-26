import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, BellOff, ExternalLink, Search, ShieldAlert } from 'lucide-react';
import { useCompliance, type ComplianceAlert } from '../hooks/useCompliance';
import { useListState } from '../hooks/useListState';
import PaginationControls from '../components/PaginationControls';

const getFixUrl = (alert: { personId: string; group: string }) => {
  const profileGroups = ['compliance.groups.incomplete_profile', 'compliance.groups.missing_contacts'];
  const tab = profileGroups.includes(alert.group) ? 'profile' : 'compliance';
  return `/people/${alert.personId}?tab=${tab}`;
};

const severityClasses: Record<string, string> = {
  critical: 'border-red-900/60 bg-red-950/30 text-red-200',
  warning: 'border-amber-900/60 bg-amber-950/30 text-amber-200',
  info: 'border-blue-900/60 bg-blue-950/30 text-blue-200',
};

const CompliancePage = () => {
  const { t } = useTranslation();
  const { summary, alerts, suppressedAlerts, loading, suppressAlert, releaseSuppression } = useCompliance();
  const [showSuppressed, setShowSuppressed] = useState(false);
  const [suppressionTarget, setSuppressionTarget] = useState<{ key: string; personaId: string } | null>(null);
  const [suppressionReason, setSuppressionReason] = useState('');
  const [suppressionNote, setSuppressionNote] = useState('');

  const baseAlerts = useMemo(
    () => (showSuppressed ? suppressedAlerts : alerts.filter((alert) => !alert.suppression)),
    [alerts, suppressedAlerts, showSuppressed]
  );

  const { state, setPage, setPageSize, setSearchTerm, setSort, setFilter, processList } = useListState<ComplianceAlert>({
    initialSortBy: 'personName',
    initialSortOrder: 'asc',
    pageSize: 10,
  });

  const { items, totalItems, totalPages, currentPage, pageSize } = processList(baseAlerts, (item, filter) => {
    if (filter === 'critical') return item.severity === 'critical';
    if (filter === 'warning') return item.severity === 'warning';
    if (filter === 'info') return item.severity === 'info';
    if (filter === 'anagrafica') return item.group === 'compliance.groups.incomplete_profile' || item.group === 'compliance.groups.missing_contacts';
    if (filter === 'privacy') return item.group === 'compliance.groups.privacy';
    if (filter === 'nda') return item.group === 'compliance.groups.missing_nda';
    if (filter === 'documenti') return item.group === 'compliance.groups.problematic_documents' || item.group === 'compliance.groups.missing_form';
    return true;
  });

  const filters = [
    { id: 'all', label: t('common.status.all') },
    { id: 'critical', label: 'Critical' },
    { id: 'warning', label: 'Warning' },
    { id: 'nda', label: 'NDA' },
    { id: 'privacy', label: 'Privacy' },
    { id: 'documenti', label: t('common.fields.documents') },
    { id: 'anagrafica', label: t('people.personalDetails') },
  ];

  const handleSuppress = async () => {
    if (!suppressionTarget || !suppressionReason.trim()) return;
    await suppressAlert(suppressionTarget.key, suppressionReason.trim(), suppressionNote.trim() || undefined, undefined, suppressionTarget.personaId);
    setSuppressionTarget(null);
    setSuppressionReason('');
    setSuppressionNote('');
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">{t('nav.compliance')}</h1>
          <p className="text-slate-400 mt-2">{t('compliance.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowSuppressed((value) => !value)}
          className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-all ${
            showSuppressed
              ? 'border-slate-600 bg-slate-800 text-white'
              : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
          }`}
        >
          {showSuppressed ? t('compliance.alerts.activeAlerts') : t('compliance.alerts.suppressedAlerts')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          icon={<ShieldAlert size={20} className="text-red-300" />}
          label={t('compliance.alerts.activeAlerts')}
          value={summary?.totalActiveAlerts ?? 0}
        />
        <SummaryCard
          icon={<BellOff size={20} className="text-slate-300" />}
          label={t('compliance.alerts.suppressedAlerts')}
          value={summary?.totalSuppressedAlerts ?? 0}
        />
        <SummaryCard
          icon={<AlertTriangle size={20} className="text-amber-300" />}
          label={t('compliance.alerts.activeAlerts')} // Should probably be 'Open Groups' in common.json
          value={summary?.groups.length ?? 0}
        />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col gap-4 mb-6">
          <h2 className="text-xl font-semibold text-white">
          {showSuppressed ? t('compliance.alerts.suppressedAlerts') : t('compliance.alerts.activeAlerts')}
          </h2>

          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setFilter(filter.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
                  state.filter === filter.id
                    ? 'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-900/20'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                placeholder={t('common.fields.searchPlaceholder')}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent transition-all"
                value={state.searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="text-sm text-slate-500 font-medium">
              <span className="text-amber-400 font-bold">{totalItems}</span> {t('common.status.resultsFound', { count: totalItems })}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-slate-500 py-12 text-center">{t('common.status.loading')}</div>
        ) : items.length === 0 ? (
          <div className="text-slate-500 py-12 text-center border border-dashed border-slate-800 rounded-xl">
            {t('compliance.alerts.noActiveAlerts')}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider">
                  <SortableHeader label={t('people.person')} active={state.sortBy === 'personName'} order={state.sortOrder} onClick={() => setSort('personName')} />
                  <SortableHeader label={t('common.fields.label')} active={state.sortBy === 'title'} order={state.sortOrder} onClick={() => setSort('title')} />
                  <SortableHeader label="Group" active={state.sortBy === 'group'} order={state.sortOrder} onClick={() => setSort('group')} />
                  <SortableHeader label="Severity" active={state.sortBy === 'severity'} order={state.sortOrder} onClick={() => setSort('severity')} />
                  <th className="px-6 py-4 font-semibold">{t('common.fields.details')}</th>
                  <th className="px-6 py-4 font-semibold text-right">{t('common.fields.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {items.map((alert) => (
                  <tr key={alert.key} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <Link to={`/people/${alert.personId}`} className="font-semibold text-slate-200 hover:text-white">
                        {alert.personName}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-slate-200">
                      {t(alert.title, { label: t(alert.labelKey || '') })}
                    </td>
                    <td className="px-6 py-4 text-slate-400">{t(alert.group)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold uppercase ${severityClasses[alert.severity]}`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400 max-w-md">{alert.description}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={getFixUrl(alert)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-900/40 border border-blue-700/50 text-sm font-medium text-blue-300 hover:bg-blue-800/50 hover:text-blue-200 transition-colors"
                        >
                          <ExternalLink size={13} />
                          {t('compliance.alerts.fix', { defaultValue: 'Fix' })}
                        </Link>
                        {alert.suppression ? (
                          <button
                            onClick={() => releaseSuppression(alert.suppression!.id)}
                            className="px-3 py-2 rounded-lg bg-slate-950/50 border border-slate-700 text-sm font-medium text-white hover:bg-slate-900"
                          >
                            {t('compliance.alerts.reactivate')}
                          </button>
                        ) : (
                          <button
                            onClick={() => setSuppressionTarget({ key: alert.key, personaId: alert.personId })}
                            className="px-3 py-2 rounded-lg bg-slate-950/50 border border-slate-700 text-sm font-medium text-white hover:bg-slate-900"
                          >
                            {t('compliance.alerts.suppress')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          accentClassName="text-amber-400"
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {suppressionTarget && (
        <ModalCard
          title={t('compliance.alerts.suppressAlert')}
          onClose={() => {
            setSuppressionTarget(null);
            setSuppressionReason('');
            setSuppressionNote('');
          }}
          onConfirm={handleSuppress}
          confirmLabel={t('compliance.alerts.suppress')}
          confirmDisabled={!suppressionReason.trim()}
        >
          <div className="space-y-4">
            <Field label={t('compliance.alerts.reason')}>
              <input
                value={suppressionReason}
                onChange={(e) => setSuppressionReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
              />
            </Field>
            <Field label={t('common.fields.notes')}>
              <textarea
                value={suppressionNote}
                onChange={(e) => setSuppressionNote(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm min-h-[100px]"
              />
            </Field>
          </div>
        </ModalCard>
      )}
    </div>
  );
};

const SortableHeader = ({ label, active, order, onClick }: { label: string; active: boolean; order: 'asc' | 'desc'; onClick: () => void }) => (
  <th className="px-6 py-4 font-semibold cursor-pointer hover:text-white transition-colors group" onClick={onClick}>
    <div className="flex items-center space-x-2">
      <span>{label}</span>
      {active ? (order === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-20 group-hover:opacity-100" />}
    </div>
  </th>
);

const ModalCard = ({
  title,
  children,
  onClose,
  onConfirm,
  confirmLabel,
  confirmDisabled,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  confirmDisabled?: boolean;
}) => {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">{t('common.actions.close')}</button>
        </div>
        {children}
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-700">{t('common.actions.cancel')}</button>
          <button onClick={onConfirm} disabled={confirmDisabled} className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-semibold">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="space-y-1">
    <label className="text-xs text-slate-500 font-bold uppercase tracking-tighter">{label}</label>
    {children}
  </div>
);

const SummaryCard = ({ icon, label, value }: { icon: ReactNode; label: string; value: number }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
    <div className="flex items-center justify-between mb-4">
      {icon}
      <span className="text-xs text-slate-500 uppercase tracking-wider">Today</span>
    </div>
    <div className="text-sm text-slate-400">{label}</div>
    <div className="text-3xl font-bold text-white mt-1">{value}</div>
  </div>
);

export default CompliancePage;
