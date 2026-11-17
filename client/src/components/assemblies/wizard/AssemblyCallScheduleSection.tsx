import { useTranslation } from 'react-i18next';
import { CalendarIcon } from 'lucide-react';
import type { Address } from './wizardTypes';

interface AssemblyForm {
  type: string;
  mode: 'in_person' | 'remote' | 'hybrid';
  firstCallDate: string;
  firstCallTime: string;
  convocationDate: string;
  location: string;
  meetLink: string;
  hasSecondCall: boolean;
  secondCallDate: string;
  secondCallTime: string;
  secondCallMode: 'in_person' | 'remote' | 'hybrid';
  secondCallLocation: string;
}

interface AssemblyCallScheduleSectionProps {
  form: AssemblyForm;
  setForm: (f: any) => void;
  computeConvocationDate: (firstCallDate: string) => string;
  addresses: Address[];
}

export const AssemblyCallScheduleSection = ({
  form,
  setForm,
  computeConvocationDate,
  addresses,
}: AssemblyCallScheduleSectionProps) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {form.type === 'constitution' ? (
        /* Constitution: single meeting date, no convocation concept */
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-success-400">
            <CalendarIcon size={16} />
            <h3 className="text-xs font-black uppercase tracking-widest">Data Assemblea Costituente</h3>
          </div>
          <div className="bg-success-900/10 border border-success-800/20 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-5 gap-2">
              <div className="col-span-3 space-y-1">
                <label className="text-[10px] text-neutral-500 uppercase">{t('common.fields.date')}</label>
                <input type="date" value={form.firstCallDate} onChange={e => setForm({ ...form, firstCallDate: e.target.value, convocationDate: computeConvocationDate(e.target.value) })} className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-xs text-fg" />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-[10px] text-neutral-500 uppercase">{t('common.fields.time')}</label>
                <input type="time" value={form.firstCallTime} onChange={e => setForm({ ...form, firstCallTime: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-xs text-fg" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-neutral-500 uppercase">{t('common.fields.mode')}</label>
              <select value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value as any })} className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-xs text-fg">
                <option value="in_person">{t('assemblies.modes.in_person')}</option>
                <option value="remote">{t('assemblies.modes.remote')}</option>
                <option value="hybrid">{t('assemblies.modes.hybrid')}</option>
              </select>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-special-400">
              <CalendarIcon size={16} />
              <h3 className="text-xs font-black uppercase tracking-widest">Pianificazione Convocazioni</h3>
            </div>
            <label className="flex items-center gap-2 cursor-pointer bg-neutral-800/40 px-2 py-1 rounded-md hover:bg-neutral-800/60 transition-colors">
              <input
                type="checkbox"
                checked={form.hasSecondCall}
                onChange={(e) => setForm({ ...form, hasSecondCall: e.target.checked })}
                className="accent-special-500"
              />
              <span className="text-[10px] font-bold uppercase text-neutral-300 italic">Aggiungi 2ª conv.</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1A CONV */}
            <div className="bg-special-900/10 border border-special-800/20 rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-2 border-b border-special-800/20 pb-2">
                <span className="text-[10px] font-black bg-special-500 text-white px-1.5 py-0.5 rounded italic">1ª</span>
                <span className="text-xs font-bold text-neutral-300">Prima convocazione</span>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-5 gap-2">
                  <div className="col-span-3 space-y-1">
                    <label className="text-[10px] text-neutral-500 uppercase">{t('common.fields.date')}</label>
                    <input type="date" value={form.firstCallDate} onChange={e => setForm({ ...form, firstCallDate: e.target.value, convocationDate: computeConvocationDate(e.target.value) })} className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-xs text-fg" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] text-neutral-500 uppercase">{t('common.fields.time')}</label>
                    <input type="time" value={form.firstCallTime} onChange={e => setForm({ ...form, firstCallTime: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-xs text-fg" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-500 uppercase">{t('common.fields.mode')}</label>
                  <select value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value as any })} className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-xs text-fg">
                    <option value="in_person">{t('assemblies.modes.in_person')}</option>
                    <option value="remote">{t('assemblies.modes.remote')}</option>
                    <option value="hybrid">{t('assemblies.modes.hybrid')}</option>
                  </select>
                </div>
                {(form.mode === 'in_person' || form.mode === 'hybrid') && (
                  <div className="space-y-1">
                    <label className="text-[10px] text-neutral-500 uppercase">{t('common.fields.location')}</label>
                    <select value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-xs text-fg">
                      <option value="">— seleziona sede —</option>
                      {addresses.map((a) => (
                        <option key={a.id} value={a.address}>{a.address}</option>
                      ))}
                    </select>
                  </div>
                )}
                {(form.mode === 'remote' || form.mode === 'hybrid') && (
                  <div className="space-y-1">
                    <label className="text-[10px] text-neutral-500 uppercase">{t('assemblies.platformLink', { defaultValue: 'Piattaforma / Link' })}</label>
                    <input
                      type="url"
                      value={form.meetLink || ''}
                      onChange={e => setForm({ ...form, meetLink: e.target.value })}
                      placeholder="https://zoom.us/j/..., https://meet.google.com/..."
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-xs text-fg"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 2A CONV */}
            {form.hasSecondCall ? (
              <div className="bg-success-900/10 border border-success-800/20 rounded-xl p-4 space-y-4 animate-in slide-in-from-right-4">
                <div className="flex items-center gap-2 border-b border-success-800/20 pb-2">
                  <span className="text-[10px] font-black bg-success-500 text-white px-1.5 py-0.5 rounded italic">2ª</span>
                  <span className="text-xs font-bold text-neutral-300">Seconda convocazione</span>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-5 gap-2">
                    <div className="col-span-3 space-y-1">
                      <label className="text-[10px] text-neutral-500 uppercase">{t('common.fields.date')}</label>
                      <input type="date" value={form.secondCallDate} onChange={e => setForm({ ...form, secondCallDate: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-xs text-fg" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] text-neutral-500 uppercase">{t('common.fields.time')}</label>
                      <input type="time" value={form.secondCallTime} onChange={e => setForm({ ...form, secondCallTime: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-xs text-fg" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-neutral-500 uppercase">{t('common.fields.mode')}</label>
                    <select value={form.secondCallMode} onChange={e => setForm({ ...form, secondCallMode: e.target.value as any })} className="w-full bg-neutral-950 border border-success-900/10 rounded px-2 py-1.5 text-xs text-fg">
                      <option value="in_person">{t('assemblies.modes.in_person')}</option>
                      <option value="remote">{t('assemblies.modes.remote')}</option>
                      <option value="hybrid">{t('assemblies.modes.hybrid')}</option>
                    </select>
                  </div>
                  {(form.secondCallMode === 'in_person' || form.secondCallMode === 'hybrid') && (
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-500 uppercase">{t('common.fields.location')}</label>
                      <select value={form.secondCallLocation} onChange={e => setForm({ ...form, secondCallLocation: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-xs text-fg">
                        <option value="">— seleziona sede —</option>
                        {addresses.map((a) => (
                          <option key={a.id} value={a.address}>{a.address}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {(form.secondCallMode === 'remote' || form.secondCallMode === 'hybrid') && (
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-500 uppercase">{t('assemblies.platformLink', { defaultValue: 'Piattaforma / Link' })}</label>
                      <input
                        type="url"
                        value={form.meetLink || ''}
                        onChange={e => setForm({ ...form, meetLink: e.target.value })}
                        placeholder="https://zoom.us/j/..., https://meet.google.com/..."
                        className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-xs text-fg"
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-neutral-800 rounded-xl flex items-center justify-center p-4">
                <p className="text-[10px] text-neutral-600 font-bold uppercase italic text-center">Nessuna seconda convocazione pianificata</p>
              </div>
            )}
          </div>

          {/* Convocation send date */}
          {(() => {
            const daysBefore = form.firstCallDate && form.convocationDate
              ? Math.round((new Date(form.firstCallDate).getTime() - new Date(form.convocationDate).getTime()) / 86400000)
              : null;
            const tooLate = daysBefore !== null && daysBefore < 15;
            return (
              <div className="space-y-1">
                <label className="text-[10px] text-neutral-500 uppercase">Data invio convocazione</label>
                <input
                  type="date"
                  value={form.convocationDate}
                  onChange={e => setForm({ ...form, convocationDate: e.target.value })}
                  className={`w-full bg-neutral-950 border rounded px-2 py-1.5 text-xs text-fg ${tooLate ? 'border-danger-600' : 'border-neutral-800'}`}
                />
                {tooLate && (
                  <p className="text-[10px] text-danger-400 flex items-center gap-1">
                    <span>⚠</span> La convocazione deve essere inviata almeno 15 giorni prima ({daysBefore} gg).
                  </p>
                )}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
};
