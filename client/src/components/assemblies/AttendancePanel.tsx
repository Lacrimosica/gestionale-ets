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
    <div id="attendance-panel" className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden scroll-mt-24">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-6 py-4 border-b border-neutral-800 flex items-center justify-between hover:bg-neutral-800/40 transition-colors"
      >
        <p className="text-xs font-black uppercase tracking-wider text-neutral-400 flex items-center gap-2">
          <Users size={13} />
          {t('assemblies.attendance', { defaultValue: 'Presenze' })}
          <span className="text-neutral-600 font-medium normal-case">({attendanceRecords.length})</span>
        </p>
        {open ? <ChevronUp size={15} className="text-neutral-500" /> : <ChevronDown size={15} className="text-neutral-500" />}
      </button>

      {open && (
        <div className="p-6 space-y-4">
          {/* Search */}
          <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2">
            <Search size={14} className="text-neutral-500 shrink-0" />
            <input
              type="text"
              placeholder="Cerca socio..."
              value={attendanceSearch}
              onChange={(e) => setAttendanceSearch(e.target.value)}
              className="bg-transparent text-sm text-fg outline-none flex-1 placeholder:text-neutral-600"
            />
          </div>

          {eligibleLoading ? (
            <div className="flex items-center gap-2 text-neutral-500 text-sm py-4 justify-center">
              <Loader2 size={16} className="animate-spin" />
              Caricamento soci...
            </div>
          ) : (
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {filteredMembers.length === 0 && (
                <p className="text-neutral-600 text-sm text-center py-4">Nessun socio trovato.</p>
              )}
              {filteredMembers.map((m) => {
                const record = attendanceRecords.find((r) => r.personId === m.personId);
                const isPresent = attendingIds.has(m.personId);
                const isSaving = savingAttendance === m.personId;

                return (
                  <div
                    key={m.personId}
                    className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-neutral-800/60 transition-colors"
                  >
                    <span className={`text-sm ${isPresent ? 'text-fg font-medium' : 'text-neutral-400'}`}>
                      {m.firstName} {m.lastName}
                    </span>
                    <div className="flex items-center gap-2">
                      {isSaving ? (
                        <Loader2 size={14} className="animate-spin text-neutral-500" />
                      ) : isPresent ? (
                        <>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            record?.mode === 'remote'
                              ? 'bg-info-900/40 text-info-400 border border-info-800/50'
                              : record?.mode === 'proxy'
                              ? 'bg-warning-900/40 text-warning-400 border border-warning-800/50'
                              : 'bg-success-900/40 text-success-400 border border-success-800/50'
                          }`}>
                            {record?.mode === 'remote' ? 'Remoto' : record?.mode === 'proxy' ? 'Delega' : 'Presente'}
                          </span>
                          {hasPermission(PERMISSIONS.assembliesEdit) && (
                            <button
                              type="button"
                              onClick={() => handleRemoveAttendance(m.personId)}
                              className="text-[10px] text-neutral-600 hover:text-danger-400 transition-colors"
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
                              className="text-[10px] px-2 py-0.5 rounded bg-success-900/30 text-success-400 hover:bg-success-800/50 border border-success-800/40 transition-colors"
                            >
                              Presente
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetAttendance(m.personId, 'remote')}
                              className="text-[10px] px-2 py-0.5 rounded bg-info-900/30 text-info-400 hover:bg-info-800/50 border border-info-800/40 transition-colors"
                            >
                              Remoto
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetAttendance(m.personId, 'proxy')}
                              className="text-[10px] px-2 py-0.5 rounded bg-warning-900/30 text-warning-400 hover:bg-warning-800/50 border border-warning-800/40 transition-colors"
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
            <div className="pt-3 border-t border-neutral-800 text-xs text-neutral-500 flex items-center gap-4">
              <span>Totale: <strong className="text-neutral-300">{attendanceRecords.length}</strong></span>
              <span>In presenza: <strong className="text-success-400">{attendanceRecords.filter(r => r.mode === 'present').length}</strong></span>
              <span>Remoto: <strong className="text-info-400">{attendanceRecords.filter(r => r.mode === 'remote').length}</strong></span>
              <span>Delega: <strong className="text-warning-400">{attendanceRecords.filter(r => r.mode === 'proxy').length}</strong></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
