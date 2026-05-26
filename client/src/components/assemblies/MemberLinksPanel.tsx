import { useTranslation } from 'react-i18next';
import { AlertTriangle, Loader2, Unlink, Plus, Search, Link2, UserMinus, UserPlus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { PERMISSIONS } from '../../lib/permissions';
import { useMemberLinks } from '../../hooks/useMemberLinks';
import { formatLongDate } from '../../lib/date-utils';

interface MemberLinksPanelProps {
  id: string;
  assemblyDate: string;
}

function formatDate(d: string) {
  try { return formatLongDate(d); } catch { return d; }
}

export const MemberLinksPanel = ({ id, assemblyDate }: MemberLinksPanelProps) => {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const {
    memberLinks,
    unlinkedPeriods,
    memberLinksLoading,
    showAdmissionPicker,
    showResignationPicker,
    admissionPickerSearch,
    resignationPickerSearch,
    linkingPeriodId,
    unlinkingPeriodId,
    setShowAdmissionPicker,
    setShowResignationPicker,
    setAdmissionPickerSearch,
    setResignationPickerSearch,
    handleLinkAdmission,
    handleUnlinkAdmission,
    handleLinkResignation,
    handleUnlinkResignation,
    dateDiffDays,
  } = useMemberLinks(id);

  if (!hasPermission(PERMISSIONS.peopleView)) return null;

  return (
    <div id="member-links-panel" className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden scroll-mt-24">
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-wider text-slate-400">
          {t('assemblies.memberLinks', { defaultValue: 'Soci ammessi / dimessi' })}
        </p>
        {memberLinksLoading && <Loader2 size={14} className="animate-spin text-slate-500" />}
      </div>

      <div className="p-6 space-y-6">
        {/* Admissions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <UserPlus size={13} /> Ammissioni collegate ({memberLinks.admissions.length})
            </p>
            {hasPermission(PERMISSIONS.peopleEdit) && (
              <button
                type="button"
                onClick={() => { setShowAdmissionPicker(!showAdmissionPicker); setShowResignationPicker(false); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:text-white bg-emerald-900/20 hover:bg-emerald-800/40 border border-emerald-800/50 hover:border-emerald-600 rounded-lg transition-colors"
              >
                <Plus size={13} /> Collega ammissione
              </button>
            )}
          </div>

          {memberLinks.admissions.length === 0 && !showAdmissionPicker && (
            <p className="text-slate-600 text-sm">Nessuna ammissione collegata a questa assemblea.</p>
          )}

          {memberLinks.admissions.map((m) => {
            const diff = assemblyDate && m.admissionDate ? dateDiffDays(m.admissionDate, assemblyDate) : 0;
            return (
              <div key={m.id} className="flex items-center justify-between px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-slate-200 text-sm font-medium">{m.firstName} {m.lastName}</span>
                  <span className="text-slate-500 text-xs">{m.admissionDate ? formatDate(m.admissionDate) : '—'}</span>
                  {diff > 30 && (
                    <span className="flex items-center gap-1 text-amber-400 text-xs" title={`Data ammissione distante ${Math.round(diff)} giorni dalla data assemblea`}>
                      <AlertTriangle size={12} /> {Math.round(diff)}gg
                    </span>
                  )}
                </div>
                {hasPermission(PERMISSIONS.peopleEdit) && (
                  <button
                    type="button"
                    disabled={unlinkingPeriodId === m.id}
                    onClick={() => handleUnlinkAdmission(m.id)}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-400 transition-colors disabled:opacity-40"
                    title="Scollega"
                  >
                    {unlinkingPeriodId === m.id ? <Loader2 size={13} className="animate-spin" /> : <Unlink size={13} />}
                  </button>
                )}
              </div>
            );
          })}

          {/* Admission picker */}
          {showAdmissionPicker && (
            <div className="border border-emerald-800/40 rounded-xl bg-slate-950/60 p-4 space-y-3">
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2">
                <Search size={14} className="text-slate-500 shrink-0" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Cerca socio..."
                  value={admissionPickerSearch}
                  onChange={(e) => setAdmissionPickerSearch(e.target.value)}
                  className="bg-transparent text-sm text-white outline-none flex-1 placeholder:text-slate-600"
                />
              </div>
              {unlinkedPeriods.admissions.length === 0 ? (
                <p className="text-slate-600 text-sm">Nessuna ammissione senza assemblea collegata.</p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {unlinkedPeriods.admissions
                    .filter((m) => `${m.firstName} ${m.lastName}`.toLowerCase().includes(admissionPickerSearch.toLowerCase()))
                    .map((m) => {
                      const diff = assemblyDate && m.admissionDate ? dateDiffDays(m.admissionDate, assemblyDate) : 0;
                      return (
                        <div key={m.id} className="flex items-center justify-between px-3 py-2 hover:bg-slate-800 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="text-slate-200 text-sm">{m.firstName} {m.lastName}</span>
                            <span className="text-slate-500 text-xs">{m.admissionDate ? formatDate(m.admissionDate) : '—'}</span>
                            {diff > 30 && (
                              <span className="flex items-center gap-1 text-amber-400 text-xs" title="Data lontana dalla data assemblea">
                                <AlertTriangle size={12} /> {Math.round(diff)}gg
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            disabled={linkingPeriodId === m.id}
                            onClick={() => handleLinkAdmission(m.id)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-400 hover:text-white bg-emerald-900/30 hover:bg-emerald-700/50 border border-emerald-800/50 rounded-md transition-colors disabled:opacity-40"
                          >
                            {linkingPeriodId === m.id ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
                            Collega
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Resignations */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <UserMinus size={13} /> Dimissioni collegate ({memberLinks.resignations.length})
            </p>
            {hasPermission(PERMISSIONS.peopleEdit) && (
              <button
                type="button"
                onClick={() => { setShowResignationPicker(!showResignationPicker); setShowAdmissionPicker(false); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-400 hover:text-white bg-rose-900/20 hover:bg-rose-800/40 border border-rose-800/50 hover:border-rose-600 rounded-lg transition-colors"
              >
                <Plus size={13} /> Collega dimissione
              </button>
            )}
          </div>

          {memberLinks.resignations.length === 0 && !showResignationPicker && (
            <p className="text-slate-600 text-sm">Nessuna dimissione collegata a questa assemblea.</p>
          )}

          {memberLinks.resignations.map((m) => {
            const diff = assemblyDate && m.resignationDate ? dateDiffDays(m.resignationDate, assemblyDate) : 0;
            return (
              <div key={m.id} className="flex items-center justify-between px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-slate-200 text-sm font-medium">{m.firstName} {m.lastName}</span>
                  <span className="text-slate-500 text-xs">{m.resignationDate ? formatDate(m.resignationDate) : '—'}</span>
                  {diff > 30 && (
                    <span className="flex items-center gap-1 text-amber-400 text-xs" title={`Data dimissione distante ${Math.round(diff)} giorni dalla data assemblea`}>
                      <AlertTriangle size={12} /> {Math.round(diff)}gg
                    </span>
                  )}
                </div>
                {hasPermission(PERMISSIONS.peopleEdit) && (
                  <button
                    type="button"
                    disabled={unlinkingPeriodId === m.id}
                    onClick={() => handleUnlinkResignation(m.id)}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-400 transition-colors disabled:opacity-40"
                    title="Scollega"
                  >
                    {unlinkingPeriodId === m.id ? <Loader2 size={13} className="animate-spin" /> : <Unlink size={13} />}
                  </button>
                )}
              </div>
            );
          })}

          {/* Resignation picker */}
          {showResignationPicker && (
            <div className="border border-rose-800/40 rounded-xl bg-slate-950/60 p-4 space-y-3">
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2">
                <Search size={14} className="text-slate-500 shrink-0" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Cerca socio..."
                  value={resignationPickerSearch}
                  onChange={(e) => setResignationPickerSearch(e.target.value)}
                  className="bg-transparent text-sm text-white outline-none flex-1 placeholder:text-slate-600"
                />
              </div>
              {unlinkedPeriods.resignations.length === 0 ? (
                <p className="text-slate-600 text-sm">Nessuna dimissione senza assemblea collegata.</p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {unlinkedPeriods.resignations
                    .filter((m) => `${m.firstName} ${m.lastName}`.toLowerCase().includes(resignationPickerSearch.toLowerCase()))
                    .map((m) => {
                      const diff = assemblyDate && m.resignationDate ? dateDiffDays(m.resignationDate, assemblyDate) : 0;
                      return (
                        <div key={m.id} className="flex items-center justify-between px-3 py-2 hover:bg-slate-800 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="text-slate-200 text-sm">{m.firstName} {m.lastName}</span>
                            <span className="text-slate-500 text-xs">{m.resignationDate ? formatDate(m.resignationDate) : '—'}</span>
                            {diff > 30 && (
                              <span className="flex items-center gap-1 text-amber-400 text-xs" title="Data lontana dalla data assemblea">
                                <AlertTriangle size={12} /> {Math.round(diff)}gg
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            disabled={linkingPeriodId === m.id}
                            onClick={() => handleLinkResignation(m.id)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-400 hover:text-white bg-rose-900/30 hover:bg-rose-700/50 border border-rose-800/50 rounded-md transition-colors disabled:opacity-40"
                          >
                            {linkingPeriodId === m.id ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
                            Collega
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
