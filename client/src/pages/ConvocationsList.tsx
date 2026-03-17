import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useConvocations, type Convocation } from '../hooks/useConvocations';
import { useListState } from '../hooks/useListState';
import PaginationControls from '../components/PaginationControls';
import {
  Mail, Search, Calendar, ArrowUpDown, ArrowUp, ArrowDown,
  FileText, Plus, Pencil, Trash2, Save, X, ListOrdered, Link2
} from 'lucide-react';
import axios from 'axios';

import { API_BASE_URL } from '../config';

interface AgendaItem {
  id: string;
  number: number;
  title: string;
  description?: string | null;
}

interface AssemblySummary {
  id: string;
  type: string;
  firstCallDate?: string | null;
  totalNumber: number;
  referenceNumber: number;
  referenceYear?: number | null;
}

interface AssemblyDetail extends AssemblySummary {
  agendaItems: AgendaItem[];
}

interface ConvocationFormState {
  assemblyId: string;
  secondAssemblyId: string;
  sentAt: string;
  documentLink: string;
  notes: string;
}

const emptyForm: ConvocationFormState = {
  assemblyId: '',
  secondAssemblyId: '',
  sentAt: '',
  documentLink: '',
  notes: '',
};

const AgendaPreview = ({ title, assembly, label }: { title: string; assembly?: AssemblyDetail | null; label: string }) => {
  const { t } = useTranslation();
  if (!assembly) return null;

  return (
    <div className="border border-slate-800 rounded-lg p-4 bg-slate-950/30">
      <div className="flex items-center gap-2 mb-3">
        <ListOrdered size={16} className="text-purple-400" />
        <div>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">{title}</p>
          <p className="text-sm text-slate-300">{label}</p>
        </div>
      </div>
      {assembly.agendaItems.length > 0 ? (
        <ol className="space-y-3">
          {[...assembly.agendaItems].sort((a, b) => a.number - b.number).map((item) => (
            <li key={item.id} className="flex gap-3 p-3 bg-slate-950/50 rounded-lg border border-slate-800">
              <span className="text-slate-500 font-bold shrink-0">{item.number}.</span>
              <div>
                <p className="text-slate-200 font-medium">{item.title}</p>
                {item.description && <p className="text-slate-500 text-sm mt-1">{item.description}</p>}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-slate-500">{t('assemblies.noAgendaItems')}</p>
      )}
    </div>
  );
};

const ConvocationsList = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { convocations, loading, refresh, create, update, remove } = useConvocations();
  const [assemblies, setAssemblies] = useState<AssemblySummary[]>([]);
  const [linkedAssemblies, setLinkedAssemblies] = useState<Record<string, AssemblyDetail | null>>({});
  const [form, setForm] = useState<ConvocationFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { state, setPage, setPageSize, setSearchTerm, setSort, processList } = useListState<Convocation & { assemblyLabel?: string; secondAssemblyLabel?: string }>({
    initialSortBy: 'sentAt',
    initialSortOrder: 'desc',
    pageSize: 10,
  });

  useEffect(() => {
    axios.get<AssemblySummary[]>(`${API_BASE_URL}/assemblies`).then((r) => setAssemblies(r.data));
  }, []);

  useEffect(() => {
    const ids = [form.assemblyId, form.secondAssemblyId].filter(Boolean);
    if (ids.length === 0) return;

    Promise.all(ids.map(async (id) => {
      if (linkedAssemblies[id]) return;
      const res = await axios.get<AssemblyDetail>(`${API_BASE_URL}/assemblies/${id}`);
      return { id, data: res.data };
    })).then((results) => {
      setLinkedAssemblies((prev) => {
        const next = { ...prev };
        results.forEach((entry) => {
          if (entry) next[entry.id] = entry.data;
        });
        return next;
      });
    }).catch(() => undefined);
  }, [form.assemblyId, form.secondAssemblyId, linkedAssemblies]);

  const sortedAssemblies = useMemo(() => (
    [...assemblies].sort((a, b) => {
      const da = a.firstCallDate ? new Date(a.firstCallDate).getTime() : 0;
      const db = b.firstCallDate ? new Date(b.firstCallDate).getTime() : 0;
      return db - da;
    })
  ), [assemblies]);

  const getAssemblyLabel = (assemblyId?: string | null) => {
    if (!assemblyId) return '-';
    const assembly = assemblies.find((x) => x.id === assemblyId);
    if (!assembly) return assemblyId;
    const dataStr = assembly.firstCallDate ? new Date(assembly.firstCallDate).toLocaleDateString(i18n.language) : '-';
    if (assembly.type === 'board_council') return `CD n. ${assembly.referenceNumber} (${dataStr})`;
    return `Ass. n. ${assembly.referenceNumber}/${assembly.referenceYear ?? '-'} (${dataStr})`;
  };

  const listWithLabels = convocations.map((c) => ({
    ...c,
    assemblyLabel: getAssemblyLabel(c.assemblyId),
    secondAssemblyLabel: getAssemblyLabel(c.secondAssemblyId),
  }));

  const { items, totalItems, totalPages, currentPage, pageSize } = processList(listWithLabels);

  const updateForm = (key: keyof ConvocationFormState, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setSubmitError(null);
  };

  const startEdit = (convocation: Convocation) => {
    setEditingId(convocation.id);
    setSubmitError(null);
    setForm({
      assemblyId: convocation.assemblyId,
      secondAssemblyId: convocation.secondAssemblyId || '',
      sentAt: convocation.sentAt || '',
      documentLink: convocation.documentLink || '',
      notes: convocation.notes || '',
    });
  };

  const handleSubmit = async () => {
    if (!form.assemblyId || !form.sentAt) {
      setSubmitError(t('convocations.errors.missingFields', { defaultValue: 'Select at least one assembly and indicate the sent at date.' }));
      return;
    }

    if (form.secondAssemblyId && form.secondAssemblyId === form.assemblyId) {
      setSubmitError(t('convocations.errors.sameAssembly'));
      return;
    }

    setSaving(true);
    setSubmitError(null);
    try {
      const payload = {
        assemblyId: form.assemblyId,
        secondAssemblyId: form.secondAssemblyId || null,
        sentAt: form.sentAt,
        documentLink: form.documentLink || null,
        notes: form.notes || null,
      };

      if (editingId) {
        await update(editingId, payload);
      } else {
        await create(payload);
      }

      resetForm();
    } catch {
      setSubmitError(editingId ? t('convocations.errors.update') : t('convocations.errors.create'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (convocationId: string) => {
    setSaving(true);
    setSubmitError(null);
    try {
      await remove(convocationId);
      if (editingId === convocationId) {
        resetForm();
      }
    } catch {
      setSubmitError(t('convocations.errors.delete'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Mail className="text-amber-400" />
            {t('nav.convocations')}
          </h1>
          <p className="text-slate-400 mt-1">{t('convocations.subtitle', { defaultValue: 'A convocation can be linked to one or two assemblies, with the agenda read directly from those assemblies.' })}</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              {editingId ? <Pencil size={18} className="text-amber-400" /> : <Plus size={18} className="text-amber-400" />}
              {editingId ? t('convocations.editConvocation') : t('convocations.newConvocation', { defaultValue: 'New Convocation' })}
            </h2>
            <p className="text-sm text-slate-500 mt-1">{t('convocations.linksPrompt', { defaultValue: 'Link the convocation to the first assembly and, if needed, to the second assembly.' })}</p>
          </div>
          {editingId && (
            <button onClick={resetForm} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors">
              <X size={16} />
              {t('common.cancelEdit')}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">{t('convocations.linkedAssembly1', { defaultValue: 'Linked Assembly 1' })}</label>
            <select
              value={form.assemblyId}
              onChange={(e) => updateForm('assemblyId', e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="">{t('assemblies.selectAssembly')}</option>
              {sortedAssemblies.map((assembly) => (
                <option key={assembly.id} value={assembly.id}>
                  {getAssemblyLabel(assembly.id)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">{t('convocations.linkedAssembly2', { defaultValue: 'Linked Assembly 2 (optional)' })}</label>
            <select
              value={form.secondAssemblyId}
              onChange={(e) => updateForm('secondAssemblyId', e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="">{t('assemblies.noSecondAssembly')}</option>
              {sortedAssemblies.filter((assembly) => assembly.id !== form.assemblyId).map((assembly) => (
                <option key={assembly.id} value={assembly.id}>
                  {getAssemblyLabel(assembly.id)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">{t('convocations.sentAt')}</label>
            <input type="date" value={form.sentAt} onChange={(e) => updateForm('sentAt', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">{t('common.documentLink')}</label>
            <input type="url" value={form.documentLink} onChange={(e) => updateForm('documentLink', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="https://..." />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">{t('common.notes')}</label>
            <textarea value={form.notes} onChange={(e) => updateForm('notes', e.target.value)} rows={2} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" placeholder={t('convocations.notesPlaceholder')} />
          </div>
        </div>

        {(form.assemblyId || form.secondAssemblyId) && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Link2 size={16} className="text-amber-400" />
              {t('assemblies.linkedAgenda')}
            </div>
            <AgendaPreview title={t('assemblies.assembly1', { defaultValue: 'Assembly 1' })} assembly={linkedAssemblies[form.assemblyId]} label={getAssemblyLabel(form.assemblyId)} />
            <AgendaPreview title={t('assemblies.assembly2', { defaultValue: 'Assembly 2' })} assembly={linkedAssemblies[form.secondAssemblyId]} label={getAssemblyLabel(form.secondAssemblyId)} />
          </div>
        )}

        {submitError && <p className="text-sm text-red-400">{submitError}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={handleSubmit} disabled={saving} className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold text-sm">
            <Save size={16} />
            {saving ? t('common.saving') : editingId ? t('convocations.saveConvocation') : t('convocations.createConvocation', { defaultValue: 'Create Convocation' })}
          </button>
          <button onClick={() => refresh()} type="button" className="text-sm text-slate-400 hover:text-white transition-colors">
            {t('common.reloadList', { defaultValue: 'Reload list' })}
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4 px-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder={t('convocations.searchPlaceholder', { defaultValue: 'Search in notes or linked assemblies...' })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent"
              value={state.searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-sm text-slate-500 font-medium">
            <span className="text-amber-400 font-bold">{totalItems}</span> {t('convocations.count', { defaultValue: 'convocations' })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold cursor-pointer hover:text-white" onClick={() => setSort('sentAt')}>
                  <div className="flex items-center gap-2">
                    <span>{t('convocations.sentAt')}</span>
                    {state.sortBy === 'sentAt' ? (state.sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-20" />}
                  </div>
                </th>
                <th className="px-6 py-4 font-semibold">{t('convocations.linkedAssemblies', { defaultValue: 'Linked Assemblies' })}</th>
                <th className="px-6 py-4 font-semibold">{t('common.document')} / {t('common.notes')}</th>
                <th className="px-6 py-4 font-semibold text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                   <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                     <div className="flex items-center justify-center space-x-2">
                        <div className="w-2 h-2 bg-amber-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-amber-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-amber-600 rounded-full animate-bounce"></div>
                     </div>
                     <span className="mt-2 block">{t('common.loading')}</span>
                   </td>
                </tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500 italic">{t('convocations.noResults', { defaultValue: 'No convocations.' })}</td></tr>
              ) : (
                items.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/assemblies/${c.assemblyId}`)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-slate-200">
                        <Calendar size={16} className="text-amber-500/80" />
                        {c.sentAt ? new Date(c.sentAt).toLocaleDateString(i18n.language) : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      <div>{c.assemblyLabel}</div>
                      {c.secondAssemblyId && <div className="text-slate-500 mt-1">{c.secondAssemblyLabel}</div>}
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      {c.documentLink ? (
                        <a href={c.documentLink} target="_blank" rel="noreferrer" className="text-amber-400 hover:underline text-sm inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <FileText size={16} /> {t('common.openDocument')}
                        </a>
                      ) : (
                        <p className="text-slate-500 text-sm">{t('convocations.noDocument', { defaultValue: 'No document attached' })}</p>
                      )}
                      {c.notes && <p className="text-slate-400 text-sm mt-2 line-clamp-2">{c.notes}</p>}
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={() => startEdit(c)} className="p-1.5 text-slate-300 hover:bg-slate-800 rounded" title={t('common.edit')}>
                          <Pencil size={18} />
                        </button>
                        <button type="button" onClick={() => handleDelete(c.id)} className="p-1.5 text-red-400 hover:bg-red-950/30 rounded" title={t('common.delete')}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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
    </div>
  );
};

export default ConvocationsList;
