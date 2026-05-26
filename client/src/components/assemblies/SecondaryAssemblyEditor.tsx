import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Pencil, Loader2, X, Check, Calendar, MapPin, User, ExternalLink } from 'lucide-react';
import { formatDate } from '../../lib/date-utils';
import { SingleMemberPicker } from '../SingleMemberPicker';
import type { AssemblyDetailData, ModalityOption } from '../../types/assembly';

interface SecondaryAssemblyEditorProps {
  isEditing: boolean;
  otherAssembly: AssemblyDetailData | null;
  form: Partial<AssemblyDetailData> & { id: string; convocationDate: string };
  setForm: (form: Partial<AssemblyDetailData> & { id: string; convocationDate: string }) => void;
  loading: boolean;
  onSave: () => Promise<void>;
  onToggleEdit: (editing: boolean) => void;
  candidates: any[];
  candidatesLoading: boolean;
  addresses: any[];
  modalityOptions: ModalityOption[];
}

export const SecondaryAssemblyEditor = ({
  isEditing,
  otherAssembly,
  form,
  setForm,
  loading,
  onSave,
  onToggleEdit,
  candidates,
  candidatesLoading,
  addresses,
  modalityOptions,
}: SecondaryAssemblyEditorProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!otherAssembly) {
    return <p className="text-slate-600 text-sm italic">{t('assemblies.noSecondAssembly', { defaultValue: 'No second assembly linked.' })}</p>;
  }

  if (isEditing) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">{t('common.fields.type')}</label>
            <select
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value, subtype: '' })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-teal-600 outline-none transition-all"
            >
              <option value="ordinary">{t('assemblies.types.ordinary')}</option>
              <option value="extraordinary">{t('assemblies.types.extraordinary')}</option>
              <option value="board_council">{t('assemblies.types.board_council')}</option>
              <option value="constitution">{t('assemblies.types.constitution')}</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">{t('assemblies.mode')}</label>
            <select
              value={form.mode}
              onChange={e => setForm({ ...form, mode: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-teal-600 outline-none transition-all"
            >
              <option value="in_person">{t('assemblies.modes.in_person')}</option>
              <option value="remote">{t('assemblies.modes.remote')}</option>
              <option value="hybrid">{t('assemblies.modes.hybrid')}</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {form.type === 'extraordinary' && (
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Tipologia</label>
              <select
                value={form.subtype ?? ''}
                onChange={e => setForm({ ...form, subtype: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-amber-600 outline-none transition-all"
              >
                <option value="generic">Generica</option>
                <option value="statute_modification">Modifica Statuto</option>
                <option value="dissolution">Scioglimento</option>
                <option value="merger_split">Fusione/Scissione</option>
              </select>
            </div>
          )}
          {form.type === 'board_council' && (
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Tipologia</label>
              <select
                value={form.subtype ?? ''}
                onChange={e => setForm({ ...form, subtype: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all"
              >
                <option value="ordinary">Ordinaria</option>
                <option value="extraordinary">Straordinaria (urgente)</option>
              </select>
            </div>
          )}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">N.</label>
              <input
                type="number"
                value={form.referenceNumber}
                onChange={e => setForm({ ...form, referenceNumber: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-teal-600 outline-none transition-all"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Anno</label>
              <input
                type="number"
                value={form.referenceYear ?? 0}
                onChange={e => setForm({ ...form, referenceYear: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-teal-600 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">{t('common.fields.date')}</label>
            <input
              type="date"
              value={form.firstCallDate ?? ''}
              onChange={e => setForm({ ...form, firstCallDate: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-teal-600 outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">{t('common.fields.time')}</label>
            <input
              type="time"
              value={form.firstCallTime ?? ''}
              onChange={e => setForm({ ...form, firstCallTime: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-teal-600 outline-none transition-all"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">{t('common.fields.location')}</label>
          <select
            value={form.location ?? ''}
            onChange={e => setForm({ ...form, location: e.target.value })}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-teal-600 outline-none transition-all"
          >
            <option value="">— seleziona sede —</option>
            {addresses.map((a) => (
              <option key={a.id} value={a.address}>{a.address}</option>
            ))}
            {!addresses.find(a => a.address === form.location) && form.location && (
              <option value={form.location}>{form.location}</option>
            )}
          </select>
        </div>

        <div className="space-y-3 pb-2 border-b border-slate-800/50">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
              Formula Convocazione (Modalità)
              {(() => {
                const count = modalityOptions.filter(o => o.type === 'convocation' && (o.mode === 'any' || o.mode === form.mode)).length;
                return <span className="ml-1 text-[9px] text-slate-600 normal-case">({count} filtrate)</span>;
              })()}
            </label>
            <select
              value={form.modalityFormulaPrima ?? ''}
              onChange={e => setForm({ ...form, modalityFormulaPrima: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-teal-600 outline-none transition-all"
            >
              <option value="">— Seleziona formula —</option>
              {modalityOptions.filter(o => o.type === 'convocation' && (o.mode === 'any' || o.mode === form.mode)).map(opt => (
                <option key={opt.id} value={opt.value || opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
              Formula Apertura Verbale
              {(() => {
                const count = modalityOptions.filter(o => o.type === 'minutes_opening' && (o.mode === 'any' || o.mode === form.mode)).length;
                return <span className="ml-1 text-[9px] text-slate-600 normal-case">({count} filtrate)</span>;
              })()}
            </label>
            <select
              value={form.modalityFormulaApertura ?? ''}
              onChange={e => setForm({ ...form, modalityFormulaApertura: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-teal-600 outline-none transition-all"
            >
              <option value="">— Seleziona formula —</option>
              {modalityOptions.filter(o => o.type === 'minutes_opening' && (o.mode === 'any' || o.mode === form.mode)).map(opt => (
                <option key={opt.id} value={opt.value || opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-800/50">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">{t('common.fields.president')}</label>
            <SingleMemberPicker
              candidates={candidates}
              value={form.presidentId ?? ''}
              onChange={(id) => setForm({ ...form, presidentId: id })}
              loading={candidatesLoading}
              placeholder="Cerca presidente…"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">{t('common.fields.secretary')}</label>
            <SingleMemberPicker
              candidates={candidates}
              value={form.secretaryId ?? ''}
              onChange={(id) => setForm({ ...form, secretaryId: id })}
              loading={candidatesLoading}
              placeholder="Cerca segretario…"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Google Docs</label>
          <input
            type="url"
            value={form.googleDocsLink ?? ''}
            onChange={e => setForm({ ...form, googleDocsLink: e.target.value })}
            placeholder="https://..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-teal-600 outline-none transition-all"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">{t('assemblies.signedPdf', { defaultValue: 'PDF (signed)' })}</label>
          <input
            type="url"
            value={form.pdfLink ?? ''}
            onChange={e => setForm({ ...form, pdfLink: e.target.value })}
            placeholder="https://..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-teal-600 outline-none transition-all"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Ora Fine</label>
          <input
            type="time"
            value={form.endTime ?? ''}
            onChange={e => setForm({ ...form, endTime: e.target.value })}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-teal-600 outline-none transition-all"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">{t('common.fields.notes')}</label>
          <textarea
            value={form.notes ?? ''}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white text-xs focus:ring-2 focus:ring-teal-600 outline-none resize-none transition-all"
            placeholder={t('common.fields.notesPlaceholder')}
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onSave}
            disabled={loading}
            className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-lg active:scale-95"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            {t('common.actions.save')}
          </button>
          <button
            onClick={() => onToggleEdit(false)}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white px-3 py-1.5 rounded-lg text-xs transition-colors"
          >
            <X size={13} /> {t('common.actions.cancel')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 text-sm text-slate-300">
      <div className="flex gap-2"><Calendar size={14} className="text-slate-500 shrink-0 mt-0.5" /><span>{otherAssembly.firstCallDate ? formatDate(otherAssembly.firstCallDate) : '—'}{otherAssembly.firstCallTime ? ` ${otherAssembly.firstCallTime}` : ''}</span></div>
      <div className="flex gap-2"><MapPin size={14} className="text-slate-500 shrink-0 mt-0.5" /><span>{otherAssembly.location}</span></div>
      <div className="flex gap-2"><User size={14} className="text-slate-500 shrink-0 mt-0.5" /><span>{otherAssembly.presidentName}</span></div>

      {(otherAssembly.googleDocsLink || otherAssembly.pdfLink || otherAssembly.notes) && (
        <div className="pt-2 mt-2 border-t border-slate-800/50 flex flex-col gap-2">
          {otherAssembly.notes && <div className="text-xs text-slate-400 italic break-words">{otherAssembly.notes}</div>}
          <div className="flex items-center gap-2">
            {otherAssembly.googleDocsLink && <a href={otherAssembly.googleDocsLink} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 px-2 py-1 rounded bg-teal-950/30 border border-teal-900/30 transition-colors" title="Open Google Docs"><ExternalLink size={12} /> Docs</a>}
            {otherAssembly.pdfLink && <a href={otherAssembly.pdfLink} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded bg-red-950/30 border border-red-900/30 transition-colors" title="Open PDF"><ExternalLink size={12} /> PDF</a>}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={() => onToggleEdit(true)}
          className="flex items-center gap-1.5 text-slate-500 hover:text-white text-xs transition-colors"
        >
          <Pencil size={12} /> {t('common.actions.edit')}
        </button>
        <button
          onClick={() => navigate(`/assemblies/${otherAssembly.id}`)}
          className="flex items-center gap-1.5 text-slate-500 hover:text-blue-400 text-xs transition-colors"
        >
          <X size={12} className="rotate-90" /> Vai alla pagina
        </button>
      </div>
    </div>
  );
};
