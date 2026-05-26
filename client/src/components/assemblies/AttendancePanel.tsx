import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Search, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { PERMISSIONS } from '../../lib/permissions';
import { useAttendance } from '../../hooks/useAttendance';

interface AttendancePanelProps {
  id: string;
  onRecordsChange?: () => void;
}

export const AttendancePanel = ({ id }: AttendancePanelProps) => {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const [open, setOpen] = useState(false);

  const {
    attendanceRecords,
    eligibleMembers,
    eligibleLoading,
    savingAttendance,
    attendanceSearch,
    setAttendanceSearch,
    handleSetAttendance,
    handleRemoveAttendance,
  } = useAttendance(id, false, open);

  if (!hasPermission(PERMISSIONS.assembliesView)) return null;

  const filteredMembers = eligibleMembers.filter((m) =>
    `${m.firstName} ${m.lastName}`.toLowerCase().includes(attendanceSearch.toLowerCase())
  );

  const attendingIds = new Set(attendanceRecords.map((r) => r.personId));

  return (
    <div id="attendance-panel" className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden scroll-mt-24">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-6 py-4 border-b border-slate-800 flex items-center justify-between hover:bg-slate-800/40 transition-colors"
      >
        <p className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Users size={13} />
          {t('assemblies.attendance', { defaultValue: 'Presenze' })}
          <span className="text-slate-600 font-medium normal-case">({attendanceRecords.length})</span>
        </p>
        {open ? <ChevronUp size={15} className="text-slate-500" /> : <ChevronDown size={15} className="text-slate-500" />}
      </button>

      {open && (
        <div className="p-6 space-y-4">
          {/* Search */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2">
            <Search size={14} className="text-slate-500 shrink-0" />
            <input
              type="text"
              placeholder="Cerca socio..."
              value={attendanceSearch}
              onChange={(e) => setAttendanceSearch(e.target.value)}
              className="bg-transparent text-sm text-white outline-none flex-1 placeholder:text-slate-600"
            />
          </div>

          {eligibleLoading ? (
            <div className="flex items-center gap-2 text-slate-500 text-sm py-4 justify-center">
              <Loader2 size={16} className="animate-spin" />
              Caricamento soci...
            </div>
          ) : (
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {filteredMembers.length === 0 && (
                <p className="text-slate-600 text-sm text-center py-4">Nessun socio trovato.</p>
              )}
              {filteredMembers.map((m) => {
                const record = attendanceRecords.find((r) => r.personId === m.personId);
                const isPresent = attendingIds.has(m.personId);
                const isSaving = savingAttendance === m.personId;

                return (
                  <div
                    key={m.personId}
                    className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-800/60 transition-colors"
                  >
                    <span className={`text-sm ${isPresent ? 'text-white font-medium' : 'text-slate-400'}`}>
                      {m.firstName} {m.lastName}
                    </span>
                    <div className="flex items-center gap-2">
                      {isSaving ? (
                        <Loader2 size={14} className="animate-spin text-slate-500" />
                      ) : isPresent ? (
                        <>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            record?.mode === 'remote'
                              ? 'bg-cyan-900/40 text-cyan-400 border border-cyan-800/50'
                              : record?.mode === 'proxy'
                              ? 'bg-amber-900/40 text-amber-400 border border-amber-800/50'
                              : 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/50'
                          }`}>
                            {record?.mode === 'remote' ? 'Remoto' : record?.mode === 'proxy' ? 'Delega' : 'Presente'}
                          </span>
                          {hasPermission(PERMISSIONS.assembliesEdit) && (
                            <button
                              type="button"
                              onClick={() => handleRemoveAttendance(m.personId)}
                              className="text-[10px] text-slate-600 hover:text-red-400 transition-colors"
                            >
                              Rimuovi
                            </button>
                          )}
                        </>
                      ) : (
                        hasPermission(PERMISSIONS.assembliesEdit) && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleSetAttendance(m.personId, 'present')}
                              className="text-[10px] px-2 py-0.5 rounded bg-emerald-900/30 text-emerald-400 hover:bg-emerald-800/50 border border-emerald-800/40 transition-colors"
                            >
                              Presente
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetAttendance(m.personId, 'remote')}
                              className="text-[10px] px-2 py-0.5 rounded bg-cyan-900/30 text-cyan-400 hover:bg-cyan-800/50 border border-cyan-800/40 transition-colors"
                            >
                              Remoto
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetAttendance(m.personId, 'proxy')}
                              className="text-[10px] px-2 py-0.5 rounded bg-amber-900/30 text-amber-400 hover:bg-amber-800/50 border border-amber-800/40 transition-colors"
                            >
                              Delega
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {attendanceRecords.length > 0 && (
            <div className="pt-3 border-t border-slate-800 text-xs text-slate-500 flex items-center gap-4">
              <span>Totale: <strong className="text-slate-300">{attendanceRecords.length}</strong></span>
              <span>In presenza: <strong className="text-emerald-400">{attendanceRecords.filter(r => r.mode === 'present').length}</strong></span>
              <span>Remoto: <strong className="text-cyan-400">{attendanceRecords.filter(r => r.mode === 'remote').length}</strong></span>
              <span>Delega: <strong className="text-amber-400">{attendanceRecords.filter(r => r.mode === 'proxy').length}</strong></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
