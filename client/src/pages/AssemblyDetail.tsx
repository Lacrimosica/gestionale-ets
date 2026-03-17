import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import {
  ArrowLeft, FileText, Save, Plus, AlertCircle,
  FileCode, ListOrdered, ExternalLink, Mail, Calendar, Pencil, Trash2, X, Link2
} from 'lucide-react';
import { useConvocations, type Convocation } from '../hooks/useConvocations';

import { API_BASE_URL } from '../config';

interface AgendaItem {
  id: string;
  number: number;
  title: string;
  description?: string | null;
  resolution?: string | null;
}

interface AssemblySummary {
  id: string;
  type: string;
  totalNumber: number;
  referenceNumber: number;
  referenceYear?: number | null;
  firstCallDate?: string | null;
}

interface AssemblyDetailData extends AssemblySummary {
  convocationDate?: string | null;
  location: string;
  mode: string;
  president: string;
  secretary: string;
  notes?: string | null;
  googleDocsLink?: string | null;
  pdfLink?: string | null;
  agendaItems: AgendaItem[];
  participants?: unknown[];
}

const LinkedAgendaPreview = ({ title, assembly, label }: { title: string; assembly?: AssemblyDetailData | null; label: string }) => {
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
        <p className="text-slate-500 text-sm">{t('assemblies.noAgendaItems', { defaultValue: 'No agenda items registered for this assembly.' })}</p>
      )}
    </div>
  );
};

const AssemblyDetail = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<AssemblyDetailData | null>(null);
  const [allAssemblies, setAllAssemblies] = useState<AssemblySummary[]>([]);
  const [linkedAssemblies, setLinkedAssemblies] = useState<Record<string, AssemblyDetailData | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [googleDocsLink, setGoogleDocsLink] = useState('');
  const [pdfLink, setPdfLink] = useState('');
  const [notes, setNotes] = useState('');

  const [newAgendaTitle, setNewAgendaTitle] = useState('');
  const [newAgendaDescription, setNewAgendaDescription] = useState('');
  const [newAgendaNumber, setNewAgendaNumber] = useState('');
  const [addingAgenda, setAddingAgenda] = useState(false);

  const {
    convocations,
    loading: loadingConv,
    create: createConvocation,
    update: updateConvocation,
    remove: removeConvocation
  } = useConvocations(id ?? undefined);
  
  const [convSentAt, setConvSentAt] = useState('');
  const [convDocumentLink, setConvDocumentLink] = useState('');
  const [convNotes, setConvNotes] = useState('');
  const [convSecondAssemblyId, setConvSecondAssemblyId] = useState('');
  const [addingConv, setAddingConv] = useState(false);
  const [editingConvId, setEditingConvId] = useState<string | null>(null);

  useEffect(() => {
    axios.get<AssemblySummary[]>(`${API_BASE_URL}/assemblies`).then((res) => setAllAssemblies(res.data)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE_URL}/assemblies/${id}`);
        const assembly = res.data as AssemblyDetailData;
        setData(assembly);
        setLinkedAssemblies((prev) => ({ ...prev, [assembly.id]: assembly }));
        setGoogleDocsLink(assembly.googleDocsLink ?? '');
        setPdfLink(assembly.pdfLink ?? '');
        setNotes(assembly.notes ?? '');
        setNewAgendaNumber(String((assembly.agendaItems?.length ?? 0) + 1));
      } catch {
        setError(t('assemblies.notFound', { defaultValue: 'Assembly not found' }));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, t]);

  useEffect(() => {
    const idsToLoad = new Set<string>();
    if (id) idsToLoad.add(id);
    if (convSecondAssemblyId) idsToLoad.add(convSecondAssemblyId);
    convocations.forEach((conv) => {
      idsToLoad.add(conv.assemblyId);
      if (conv.secondAssemblyId) idsToLoad.add(conv.secondAssemblyId);
    });

    const missing = [...idsToLoad].filter((assemblyId) => assemblyId && !linkedAssemblies[assemblyId]);
    if (missing.length === 0) return;

    Promise.all(missing.map(async (assemblyId) => {
      const res = await axios.get<AssemblyDetailData>(`${API_BASE_URL}/assemblies/${assemblyId}`);
      return { assemblyId, data: res.data };
    })).then((results) => {
      setLinkedAssemblies((prev) => {
        const next = { ...prev };
        results.forEach(({ assemblyId, data }) => {
          next[assemblyId] = data;
        });
        return next;
      });
    }).catch(() => undefined);
  }, [id, convSecondAssemblyId, convocations, linkedAssemblies]);

  const sortedAssemblies = useMemo(() => (
    [...allAssemblies].sort((a, b) => {
      const da = a.firstCallDate ? new Date(a.firstCallDate).getTime() : 0;
      const db = b.firstCallDate ? new Date(b.firstCallDate).getTime() : 0;
      return db - da;
    })
  ), [allAssemblies]);

  const getAssemblyLabel = (assemblyId?: string | null) => {
    if (!assemblyId) return '-';
    const assembly = allAssemblies.find((entry) => entry.id === assemblyId) ?? linkedAssemblies[assemblyId];
    if (!assembly) return assemblyId;
    const dataStr = assembly.firstCallDate ? new Date(assembly.firstCallDate).toLocaleDateString(i18n.language) : '-';
    
    if (assembly.type === 'board_council') {
      return t('assemblies.labels.boardCouncil', { number: assembly.referenceNumber, date: dataStr });
    }
    return t('assemblies.labels.assembly', { 
      number: assembly.referenceNumber, 
      year: assembly.referenceYear ?? '-', 
      date: dataStr 
    });
  };

  const handleSaveNotes = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await axios.patch(`${API_BASE_URL}/assemblies/${id}`, {
        googleDocsLink: googleDocsLink || null,
        pdfLink: pdfLink || null,
        notes: notes || null,
      });
      setData(prev => prev ? { ...prev, googleDocsLink: googleDocsLink || null, pdfLink: pdfLink || null, notes: notes || null } : null);
    } catch {
      setError(t('common.errorSaving', { defaultValue: 'Error during saving' }));
    } finally {
      setSaving(false);
    }
  };

  const resetConvocationForm = () => {
    setEditingConvId(null);
    setConvSentAt('');
    setConvDocumentLink('');
    setConvNotes('');
    setConvSecondAssemblyId('');
  };

  const handleSaveConvocation = async () => {
    if (!id) return;
    if (convSecondAssemblyId && convSecondAssemblyId === id) {
      setError(t('assemblies.errors.sameAssembly', { defaultValue: 'The second linked assembly must be different from the open one.' }));
      return;
    }

    setAddingConv(true);
    try {
      const payload = {
        assemblyId: id,
        secondAssemblyId: convSecondAssemblyId || null,
        sentAt: convSentAt || new Date().toISOString().split('T')[0],
        documentLink: convDocumentLink || null,
        notes: convNotes || null,
      };

      if (editingConvId) {
        await updateConvocation(editingConvId, payload);
      } else {
        await createConvocation(payload);
      }

      resetConvocationForm();
    } catch {
      setError(editingConvId ? t('convocations.errors.update') : t('convocations.errors.create'));
    } finally {
      setAddingConv(false);
    }
  };

  const handleEditConvocation = (conv: Convocation) => {
    setEditingConvId(conv.id);
    setConvSentAt(conv.sentAt || '');
    setConvDocumentLink(conv.documentLink || '');
    setConvNotes(conv.notes || '');
    setConvSecondAssemblyId(conv.secondAssemblyId || '');
  };

  const handleDeleteConvocation = async (convocationId: string) => {
    setAddingConv(true);
    try {
      await removeConvocation(convocationId);
      if (editingConvId === convocationId) {
        resetConvocationForm();
      }
    } catch {
      setError(t('convocations.errors.delete'));
    } finally {
      setAddingConv(false);
    }
  };

  const handleAddAgendaItem = async () => {
    if (!id || !newAgendaTitle.trim()) return;
    setAddingAgenda(true);
    try {
      const number = newAgendaNumber ? parseInt(newAgendaNumber, 10) : (data?.agendaItems?.length ?? 0) + 1;
      const res = await axios.post(`${API_BASE_URL}/assemblies/${id}/agenda`, {
        number: Number.isNaN(number) ? (data?.agendaItems?.length ?? 0) + 1 : number,
        title: newAgendaTitle.trim(),
        description: newAgendaDescription.trim() || undefined,
      });
      setData(prev => prev ? { ...prev, agendaItems: [...(prev.agendaItems || []), res.data] } : null);
      setNewAgendaTitle('');
      setNewAgendaDescription('');
      setNewAgendaNumber(String((data?.agendaItems?.length ?? 0) + 2));
    } catch {
      setError(t('assemblies.errors.addAgendaItem'));
    } finally {
      setAddingAgenda(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p>{t('assemblies.loadingDetails', { defaultValue: 'Loading assembly details...' })}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-900/20 border border-red-800 text-red-400 p-6 rounded-xl flex items-center space-x-4">
        <AlertCircle size={28} />
        <div>
          <h3 className="font-bold text-lg">{t('common.error')}</h3>
          <p>{error ?? t('assemblies.notFound')}</p>
          <button onClick={() => navigate('/assemblies')} className="mt-2 text-sm underline hover:text-red-300">{t('assemblies.backToList', { defaultValue: 'Back to list' })}</button>
        </div>
      </div>
    );
  }

  const dataConv = data.firstCallDate || data.convocationDate;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/assemblies')} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <ArrowLeft size={24} className="text-slate-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <FileText className="text-purple-400" />
              {data.type === 'board_council' 
                ? t('assemblies.labels.boardCouncil', { number: data.referenceNumber, date: '' }).split(' (')[0]
                : t('assemblies.labels.assembly', { number: data.referenceNumber, year: data.referenceYear ?? '-', date: '' }).split(' (')[0]
              }
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {dataConv ? new Date(dataConv).toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' }) : t('common.dateNotSet')} · {data.location} · {t(`assemblies.modes.${data.mode}`, { defaultValue: data.mode })}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <FileCode size={18} className="text-blue-400" />
            {t('assemblies.documentLinks', { defaultValue: 'Document links' })}
          </h2>
          <p className="text-slate-500 text-sm mb-4">{t('assemblies.linksSubtitle', { defaultValue: 'Add or modify links to the assembly (Google Docs, signed PDF, etc.).' })}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">Google Docs</label>
              <input type="url" value={googleDocsLink} onChange={e => setGoogleDocsLink(e.target.value)} placeholder="https://docs.google.com/..." className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">{t('assemblies.signedPdf', { defaultValue: 'PDF (signed)' })}</label>
              <input type="url" value={pdfLink} onChange={e => setPdfLink(e.target.value)} placeholder="https://..." className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">{t('common.notes')}</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder={t('assemblies.notesPlaceholder', { defaultValue: 'Notes about the assembly...' })} />
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button onClick={handleSaveNotes} disabled={saving} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold text-sm">
              <Save size={16} />
              {saving ? t('common.saving') : t('common.saveChanges')}
            </button>
            {data.googleDocsLink && <a href={data.googleDocsLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"><ExternalLink size={14} /> {t('common.openDocs', { defaultValue: 'Open Docs' })}</a>}
            {data.pdfLink && <a href={data.pdfLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm"><ExternalLink size={14} /> {t('common.openPdf', { defaultValue: 'Open PDF' })}</a>}
          </div>
        </div>

        <div className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <ListOrdered size={18} className="text-purple-400" />
            {t('assemblies.agenda')}
          </h2>
          {data.agendaItems.length > 0 ? (
            <ol className="space-y-3 mb-6">
              {[...data.agendaItems].sort((a, b) => a.number - b.number).map((item) => (
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
            <p className="text-slate-500 text-sm mb-4">{t('assemblies.noAgendaItems')}</p>
          )}

          <div className="border border-slate-800 rounded-lg p-4 bg-slate-950/30">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-3">{t('assemblies.addAgendaItem', { defaultValue: 'Add agenda item' })}</p>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input type="number" min={1} value={newAgendaNumber} onChange={e => setNewAgendaNumber(e.target.value)} placeholder="N." className="md:col-span-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm w-16" />
                <input type="text" value={newAgendaTitle} onChange={e => setNewAgendaTitle(e.target.value)} placeholder={t('assemblies.agendaTitlePlaceholder', { defaultValue: 'Item title' })} className="md:col-span-3 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
              </div>
              <input type="text" value={newAgendaDescription} onChange={e => setNewAgendaDescription(e.target.value)} placeholder={t('assemblies.agendaDescPlaceholder', { defaultValue: 'Description (optional)' })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
              <button onClick={handleAddAgendaItem} disabled={addingAgenda || !newAgendaTitle.trim()} className="flex items-center justify-center gap-2 w-fit bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
                <Plus size={16} />
                {addingAgenda ? t('common.adding') : t('common.addItem', { defaultValue: 'Add item' })}
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-800 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Mail size={18} className="text-amber-400" />
              {t('nav.convocations')}
            </h2>
            <p className="text-slate-500 text-sm">{t('assemblies.convocationsSubtitle', { defaultValue: 'This convocation is always linked to this assembly and can include at most one second associated assembly.' })}</p>
          </div>

          {loadingConv ? (
            <p className="text-slate-500 text-sm">{t('common.loading')}</p>
          ) : convocations.length > 0 ? (
            <ul className="space-y-3">
              {convocations.map((conv) => (
                <li key={conv.id} className="p-4 bg-slate-950/50 rounded-lg border border-slate-800 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                     <div>
                       <span className="flex flex-wrap items-center gap-2 text-slate-300 text-sm">
                         <Calendar size={14} />
                         {t('convocations.sentAt')}: {conv.sentAt ? new Date(conv.sentAt).toLocaleDateString(i18n.language) : '-'}
                       </span>
                       <div className="text-xs text-slate-500 mt-2 space-y-1">
                         <p>{getAssemblyLabel(conv.assemblyId)}</p>
                         {conv.secondAssemblyId && <p>{getAssemblyLabel(conv.secondAssemblyId)}</p>}
                       </div>
                     </div>
                     <div className="flex flex-wrap items-center gap-3">
                       {conv.documentLink && (
                         <a href={conv.documentLink} target="_blank" rel="noreferrer" className="text-amber-400 hover:underline text-sm flex items-center gap-1">
                           <FileCode size={14} /> {t('common.document')}
                         </a>
                       )}
                       <button type="button" onClick={() => handleEditConvocation(conv)} className="text-slate-300 hover:text-white text-sm flex items-center gap-1">
                         <Pencil size={14} /> {t('common.edit')}
                       </button>
                       <button type="button" onClick={() => handleDeleteConvocation(conv.id)} className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1">
                         <Trash2 size={14} /> {t('common.delete')}
                       </button>
                     </div>
                  </div>

                  {(conv.notes || conv.documentLink) && (
                    <p className="text-slate-400 text-sm">{conv.notes || t('convocations.documentLinked', { defaultValue: 'Document linked to the convocation.' })}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500 text-sm">{t('assemblies.noConvocations', { defaultValue: 'No convocations registered for this assembly.' })}</p>
          )}

          <div className="border border-slate-800 rounded-lg p-4 bg-slate-950/30 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
                {editingConvId ? t('convocations.editConvocation', { defaultValue: 'Edit convocation' }) : t('convocations.addConvocation', { defaultValue: 'Add convocation' })}
              </p>
              {editingConvId && (
                <button type="button" onClick={resetConvocationForm} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                  <X size={12} />
                  {t('common.cancel')}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">{t('convocations.sentAt')}</label>
                <input type="date" value={convSentAt} onChange={e => setConvSentAt(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">{t('assemblies.secondAssembly', { defaultValue: 'Second linked assembly (optional)' })}</label>
              <select value={convSecondAssemblyId} onChange={(e) => setConvSecondAssemblyId(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm">
                <option value="">{t('assemblies.noSecondAssembly', { defaultValue: 'No second assembly' })}</option>
                {sortedAssemblies.filter((assembly) => assembly.id !== id).map((assembly) => (
                  <option key={assembly.id} value={assembly.id}>
                    {getAssemblyLabel(assembly.id)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Link2 size={16} className="text-amber-400" />
                {t('assemblies.linkedAgenda', { defaultValue: 'Linked agenda from selected assemblies' })}
              </div>
              <LinkedAgendaPreview title={t('assemblies.openAssembly', { defaultValue: 'Open assembly' })} assembly={linkedAssemblies[id ?? '']} label={getAssemblyLabel(id)} />
              <LinkedAgendaPreview title={t('assemblies.secondAssembly', { defaultValue: 'Second assembly' })} assembly={linkedAssemblies[convSecondAssemblyId]} label={getAssemblyLabel(convSecondAssemblyId)} />
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">{t('common.documentLink')}</label>
              <input type="url" value={convDocumentLink} onChange={e => setConvDocumentLink(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="https://..." />
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">{t('common.notes')}</label>
              <textarea value={convNotes} onChange={e => setConvNotes(e.target.value)} rows={2} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" placeholder={t('convocations.notesPlaceholder', { defaultValue: 'Additional notes on the convocation...' })} />
            </div>

            <button onClick={handleSaveConvocation} disabled={addingConv} className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <Plus size={16} />
              {addingConv ? t('common.saving') : editingConvId ? t('convocations.saveConvocation', { defaultValue: 'Save convocation' }) : t('convocations.addConvocation')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssemblyDetail;
