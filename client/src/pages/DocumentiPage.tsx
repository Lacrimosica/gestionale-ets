import { useEffect, useState, useMemo, useRef } from 'react';
import {
  Trash2,
  Pencil,
  Check,
  X,
  ExternalLink,
  ChevronDown,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Search,
} from 'lucide-react';
import {
  useDocuments,
  WORKFLOW_LABELS,
  type GenerationLogRecord,
} from '../hooks/useDocuments';
import { useAuth } from '../hooks/useAuth';
import { PERMISSIONS } from '../lib/permissions';
import PaginationControls from '../components/PaginationControls';

// ─── Main page ────────────────────────────────────────────────────────────────

const DocumentiPage = () => {
  const { hasPermission } = useAuth();
  const { history, historyLoading, historyError, loadHistory, updateNotes, deleteRecord } = useDocuments();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [yearFilter, setYearFilter] = useState<string>('');

  useEffect(() => { loadHistory(); }, []);

  const years = useMemo(() => {
    const set = new Set(history.map((r) => new Date(r.createdAt).getFullYear()));
    return Array.from(set).sort((a, b) => b - a);
  }, [history]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return history.filter((r) => {
      if (typeFilter && r.workflowType !== typeFilter) return false;
      if (yearFilter && String(new Date(r.createdAt).getFullYear()) !== yearFilter) return false;
      if (q) {
        const haystack = `#${r.assemblyNumber} ${r.firstCallDate}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [history, search, typeFilter, yearFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Documenti</h1>
        <p className="text-slate-400 mt-2">Storico delle generazioni di verbali e convocazioni assembleari. Per generare nuovi documenti, apri il dettaglio di un'assemblea ordinaria.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Cerca per assemblea, data, utente…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-slate-500"
        >
          <option value="">Tutti i tipi</option>
          {Object.entries(WORKFLOW_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-slate-500"
        >
          <option value="">Tutti gli anni</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>{y}</option>
          ))}
        </select>
      </div>

      <StoricoTab
        records={filtered}
        loading={historyLoading}
        error={historyError}
        canManage={hasPermission(PERMISSIONS.documentsManage)}
        onUpdateNotes={updateNotes}
        onDelete={deleteRecord}
      />
    </div>
  );
};

// ─── Storico tab ──────────────────────────────────────────────────────────────

type StoricoTabProps = {
  records: GenerationLogRecord[];
  loading: boolean;
  error: string | null;
  canManage: boolean;
  onUpdateNotes: (id: string, notes: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

const PAGE_SIZE = 20;

const StoricoTab = ({ records, loading, error, canManage, onUpdateNotes, onDelete }: StoricoTabProps) => {
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const totalPages = Math.ceil(records.length / PAGE_SIZE);
  const pageRecords = records.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const startEdit = (record: GenerationLogRecord) => {
    setEditingId(record.id);
    setEditNotes(record.notes ?? '');
  };

  const saveEdit = async (id: string) => {
    setSavingId(id);
    await onUpdateNotes(id, editNotes);
    setSavingId(null);
    setEditingId(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await onDelete(deleteTarget);
    setDeleteTarget(null);
  };

  if (loading) return <div className="text-slate-500 py-16 text-center">Caricamento…</div>;
  if (error) return (
    <div className="flex items-center gap-3 bg-red-950/30 border border-red-900/60 rounded-xl p-4 text-red-300">
      <AlertCircle size={18} /> {error}
    </div>
  );

  return (
    <>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {records.length === 0 ? (
          <div className="py-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
            Nessun documento trovato.
          </div>
        ) : (
          <>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Data</th>
                  <th className="px-4 py-3 font-semibold">Tipo</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Assemblea</th>
                  <th className="px-4 py-3 font-semibold">Stato</th>
                  <th className="px-4 py-3 font-semibold">Documenti</th>
                  <th className="px-4 py-3 font-semibold">Note</th>
                  {canManage && <th className="px-4 py-3 font-semibold text-right">Azioni</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {pageRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                      {new Date(record.createdAt).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-3 text-slate-200 text-sm font-medium">
                      {WORKFLOW_LABELS[record.workflowType as keyof typeof WORKFLOW_LABELS]}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                      #{record.assemblyNumber} · {record.firstCallDate}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={record.status} errorMessage={record.errorMessage} />
                    </td>
                    <td className="px-4 py-3">
                      {record.status === 'success' && <DocLinks record={record} />}
                    </td>
                    <td className="px-4 py-3 text-sm min-w-[160px]">
                      {editingId === record.id ? (
                        <div className="flex items-start gap-2">
                          <textarea
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            rows={2}
                            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs resize-none"
                          />
                          <div className="flex flex-col gap-1">
                            <button onClick={() => saveEdit(record.id)} disabled={savingId === record.id} className="p-1 rounded text-emerald-400 hover:text-emerald-300" title="Salva">
                              {savingId === record.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-1 rounded text-slate-400 hover:text-white" title="Annulla">
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2 group">
                          <span className="text-slate-400 text-xs leading-relaxed">{record.notes || '—'}</span>
                          {canManage && (
                            <button onClick={() => startEdit(record)} className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-500 hover:text-slate-300 transition-opacity shrink-0" title="Modifica note">
                              <Pencil size={12} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setDeleteTarget(record.id)} className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-all" title="Elimina">
                          <Trash2 size={15} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <PaginationControls
              currentPage={page}
              totalPages={totalPages}
              pageSize={PAGE_SIZE}
              totalItems={records.length}
              accentClassName="text-emerald-400"
              onPageChange={setPage}
              onPageSizeChange={() => {}}
              pageSizeOptions={[PAGE_SIZE]}
            />
          </>
        )}
      </div>

      {deleteTarget && (
        <ConfirmModal
          title="Elimina record"
          message="Questa azione è irreversibile. Il record verrà eliminato definitivamente."
          confirmLabel="Elimina"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          danger
        />
      )}
    </>
  );
};

const DocLinks = ({ record }: { record: GenerationLogRecord }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const docs = [
    { label: 'Convocazione', driveUrl: record.convocazioneDriveUrl, pdfUrl: record.convocazionePdfUrl },
    { label: 'Verbale 1a', driveUrl: record.verbale1aDriveUrl, pdfUrl: record.verbale1aPdfUrl },
    { label: 'Verbale 2a', driveUrl: record.verbale2aDriveUrl, pdfUrl: record.verbale2aPdfUrl },
  ];

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setOpen((o) => !o);
  };

  useEffect(() => {
    if (open) {
      const handleClickOutside = () => setOpen(false);
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 whitespace-nowrap"
      >
        Visualizza <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && pos && (
        <div className="fixed z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 space-y-2 min-w-[180px] max-w-xs" style={{ top: `${pos.top}px`, right: `${pos.right}px` }} onClick={(e) => e.stopPropagation()}>
          {docs.map(({ label, driveUrl, pdfUrl }) => (
            <div key={label} className="space-y-1">
              <p className="text-xs font-semibold text-slate-400">{label}</p>
              {driveUrl && (
                <a href={driveUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                  <ExternalLink size={11} /> Docs
                </a>
              )}
              {pdfUrl && (
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300">
                  <ExternalLink size={11} /> PDF
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const StatusBadge = ({ status, errorMessage }: { status: 'success' | 'error'; errorMessage?: string | null }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold border ${
    status === 'success'
      ? 'border-emerald-900/60 bg-emerald-950/30 text-emerald-300'
      : 'border-red-900/60 bg-red-950/30 text-red-300'
  }`} title={status === 'error' && errorMessage ? errorMessage : undefined}>
    {status === 'success' ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
    {status === 'success' ? 'OK' : 'Errore'}
  </span>
);

const ConfirmModal = ({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  danger = false,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}) => (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <p className="text-sm text-slate-400">{message}</p>
      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-700">
          Annulla
        </button>
        <button
          onClick={onConfirm}
          className={`px-4 py-2 rounded-lg text-white text-sm font-semibold ${danger ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

export default DocumentiPage;
