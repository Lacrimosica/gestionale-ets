import { useRef, useState, type ReactNode } from 'react';
import { useTimeline, type TimelineEntry, type MembershipHistory, type TimelineAgendaItem } from '../hooks/useTimeline';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Calendar, FileText, UserPlus, UserMinus,
  FileCode, FileDown, Copy, Check, Users, Info, Edit3, ListOrdered, AlertTriangle, X,
  Video, Users as UsersIcon, Globe, MapPin
} from 'lucide-react';
import HistoricalMemberModal from '../components/HistoricalMemberModal';

const TimelineView = () => {
  const { t, i18n } = useTranslation();
  const { data, loading } = useTimeline();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{ isOpen: boolean; date: string; members: MembershipHistory[]; label: string }>({
    isOpen: false,
    date: '',
    members: [],
    label: ''
  });

  const copyToClipboard = async (members: MembershipHistory[], eventId: string) => {
    const text = members.map(m => `â€¢ ${m.firstName} ${m.lastName}`).join('\n');
    await navigator.clipboard.writeText(text);
    setCopiedId(eventId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getMembersAtDate = (dateStr: string) => {
    if (!data.membershipHistory) return [];
    const targetDate = new Date(dateStr).getTime();
    return data.membershipHistory.filter((m: MembershipHistory) => {
      const admission = new Date(m.admission).getTime();
      const resignation = m.resignation ? new Date(m.resignation).getTime() : Infinity;
      return admission <= targetDate && resignation > targetDate;
    });
  };

  const timelineEvents = data.events?.filter((d: TimelineEntry) => ['assembly', 'member_admission', 'member_resignation', 'pending_verbal', 'compliance_error'].includes(d.type)) ?? [];
  const selectedEntry = selectedId ? timelineEvents.find((e: TimelineEntry) => e.id === selectedId) : null;

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96 text-slate-500">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="font-medium text-sm">{t('common.status.loading')}</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-700 w-full max-w-[1600px] mx-auto pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-3">
            <Calendar className="text-blue-400" size={24} />
            <span>{t('timeline.title')}</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">{t('timeline.subtitle')}</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl relative overflow-hidden h-[calc(100vh-220px)] flex flex-col">
        <aside className="border-b border-slate-800 bg-slate-950/80 shrink-0 max-h-[45%] flex flex-col overflow-hidden">
          {selectedEntry ? (
            <div className="p-4 overflow-y-auto flex-1 custom-scrollbar space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-black text-slate-300 uppercase tracking-wider">{t('timeline.eventDetail')}</h3>
                <button type="button" onClick={() => setSelectedId(null)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors" title={t('common.actions.close', { defaultValue: 'Close' })}>
                  <X size={18} />
                </button>
              </div>

              <div className="text-white font-semibold leading-tight">
                {selectedEntry.type === 'assembly' ? (
                  <>
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-purple-400 text-xs font-black uppercase tracking-widest">{t('timeline.session')}</span>
                        {selectedEntry.complianceStatus === 'warning' && (
                          <span className="bg-yellow-500/10 text-yellow-500 text-[10px] px-1.5 py-0.5 rounded border border-yellow-500/20 font-black animate-pulse">
                            {t('timeline.pending').toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {getMembersAtDate(selectedEntry.start).length > 0 && (
                          <button type="button" onClick={() => copyToClipboard(getMembersAtDate(selectedEntry.start), selectedEntry.id)} className="p-1.5 hover:bg-slate-800 rounded transition-colors text-slate-500 hover:text-white" title={t('timeline.copyMembers')}>
                            {copiedId === selectedEntry.id ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                          </button>
                        )}
                        <Link to={`/assemblies/${selectedEntry.id}`} className="p-1.5 hover:bg-slate-800 rounded transition-colors text-slate-500 hover:text-purple-400" title={t('timeline.editAssembly')}> <Edit3 size={14} /> </Link>
                      </div>
                    </div>
                    <p className="text-slate-100">{selectedEntry.label}</p>
                    {selectedEntry.errorDetails && (
                      <div className="mt-2 text-xs text-yellow-500 font-medium bg-yellow-500/5 p-2 rounded border border-yellow-500/10 flex items-start gap-2">
                        <Info size={14} className="shrink-0 mt-0.5" />
                        <span>{selectedEntry.errorDetails}</span>
                      </div>
                    )}
                    <div className="flex items-baseline flex-wrap gap-2 mt-2">
                      <span className="text-xs text-slate-400 bg-slate-900 px-2 py-0.5 rounded font-bold uppercase border border-slate-800">{selectedEntry.subType}</span>
                      {selectedEntry.totalNumber != null && <span className="text-xs text-purple-500/90 font-bold italic">#{selectedEntry.totalNumber}</span>}
                      {selectedEntry.location && <span className="text-xs text-slate-500 truncate max-w-[220px]" title={selectedEntry.location}>{selectedEntry.location}</span>}
                    </div>
                  </>
                ) : selectedEntry.type === 'pending_verbal' ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-500 text-xs font-black uppercase tracking-widest">{t('timeline.pendingVerbal')}</span>
                    </div>
                    <p className="text-slate-100 font-bold text-base">{selectedEntry.label}</p>
                    <div className="text-sm text-yellow-500/80 bg-yellow-500/5 p-3 rounded-lg border border-yellow-500/20 italic leading-relaxed">
                      {selectedEntry.description}
                    </div>
                    {selectedEntry.affectedNames && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {selectedEntry.affectedNames.map((name, i) => (
                          <span key={i} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded font-medium border border-slate-700/50">{name}</span>
                        ))}
                      </div>
                    )}
                    <Link to="/assemblies" className="inline-flex items-center gap-2 text-xs text-yellow-500 font-black hover:underline mt-2">
                      {t('common.actions.add')} {t('nav.assemblies').toUpperCase()}
                    </Link>
                  </div>
                ) : selectedEntry.type === 'compliance_error' ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-red-500 text-xs font-black uppercase tracking-widest animate-pulse">{t('timeline.complianceError')}</span>
                    </div>
                    <p className="text-slate-100 font-bold text-base">{selectedEntry.label}</p>
                    <div className="text-sm text-red-100 bg-red-600/20 p-3 rounded-lg border border-red-500/30 leading-relaxed font-medium">
                      {selectedEntry.description}
                    </div>
                    {selectedEntry.affectedAssemblyId && (
                      <Link to={`/assemblies/${selectedEntry.affectedAssemblyId}`} className="inline-flex items-center gap-2 text-xs text-red-400 font-black hover:underline mt-2">
                        {t('common.actions.edit')} {selectedEntry.affectedAssemblyName}
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-slate-100">{selectedEntry.label}</p>
                    {selectedEntry.type === 'member_admission' && selectedEntry.linkedAssemblyId && (
                      <Link to={`/assemblies/${selectedEntry.linkedAssemblyId}`} className="text-[10px] text-blue-400 font-bold hover:underline flex items-center gap-1">
                        <FileText size={10} /> {t('timeline.session')}
                      </Link>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 text-slate-400 text-sm flex-wrap">
                <span className="flex items-center gap-2">
                  <Calendar size={14} className="text-blue-400 shrink-0" />
                  {new Date(selectedEntry.start).toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                {selectedEntry.type === 'assembly' && (
                  <>
                    <span className="text-slate-800">·</span>
                    <span className="flex items-center gap-1.5 uppercase text-[10px] font-black tracking-widest text-slate-500">
                      <MapPin size={12} />
                      {selectedEntry.location || 'N/A'}
                    </span>
                    <span className="text-slate-800">·</span>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      selectedEntry.mode === 'in_person' ? 'bg-emerald-900/40 text-emerald-400 border-emerald-800' : 
                      selectedEntry.mode === 'remote' ? 'bg-cyan-900/40 text-cyan-400 border-cyan-800' :
                      'bg-violet-900/40 text-violet-400 border-violet-800'
                    }`}>
                      {selectedEntry.mode === 'in_person' && <UsersIcon size={12} />}
                      {selectedEntry.mode === 'remote' && <Video size={12} />}
                      {selectedEntry.mode === 'hybrid' && <Globe size={12} />}
                      {t(`assemblies.modes.${selectedEntry.mode}`, { defaultValue: selectedEntry.mode })}
                    </span>
                  </>
                )}
              </div>

              {selectedEntry.type === 'assembly' && selectedEntry.agendaItems && selectedEntry.agendaItems.length > 0 && (
                <div className="pt-3 border-t border-slate-800">
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-black flex items-center gap-2 mb-2"><ListOrdered size={12} /> {t('timeline.agenda')}</p>
                  <ul className="space-y-2">
                    {selectedEntry.agendaItems.map((odg: TimelineAgendaItem, idx: number) => (
                      <li key={idx} className="text-sm text-slate-300">
                        <span className="font-bold text-slate-400 mr-1">{odg.number}.</span>
                        <span className="font-medium">{odg.title}</span>
                        {odg.description && <p className="text-xs text-slate-500 mt-0.5 pl-4">{odg.description}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedEntry.type === 'assembly' && (selectedEntry.googleDocsLink || selectedEntry.pdfLink) && (
                <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-800">
                  {selectedEntry.googleDocsLink && <a href={selectedEntry.googleDocsLink} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 py-2 px-4 rounded-lg text-xs font-bold border border-blue-500/20"><FileCode size={14} /><span>DOCS</span></a>}
                  {selectedEntry.pdfLink && <a href={selectedEntry.pdfLink} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 py-2 px-4 rounded-lg text-xs font-bold border border-red-500/20"><FileDown size={14} /><span>PDF</span></a>}
                </div>
              )}

              {selectedEntry.type === 'assembly' && !selectedEntry.googleDocsLink && !selectedEntry.pdfLink && (
                <p className="text-xs text-slate-500 italic">{t('timeline.noDocumentLinks')}</p>
              )}

              {selectedEntry.type === 'assembly' && (() => {
                const members = getMembersAtDate(selectedEntry.start);
                return members.length > 0 ? (
                  <div className="pt-3 border-t border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-slate-500 uppercase tracking-widest font-black flex items-center gap-1"><Users size={12} /> {t('timeline.members')}</p>
                      <span className="bg-slate-900 text-blue-400 text-xs px-2 py-0.5 rounded-full font-bold border border-blue-900/30">{members.length}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
                      {members.map((mem: MembershipHistory) => (
                        <div key={mem.id} className="text-xs text-slate-300 truncate font-medium bg-slate-900/40 px-2 py-1 rounded border border-slate-800/30">
                          {mem.firstName} {mem.lastName}
                        </div>
                      ))}
                    </div>
                    {members.length > 24 && (
                      <button type="button" onClick={() => setModalState({ isOpen: true, date: selectedEntry.start, members, label: selectedEntry.label })} className="mt-2 text-xs text-blue-400 font-bold hover:underline">{t('timeline.viewAll')} ({members.length})</button>
                    )}
                  </div>
                ) : null;
              })()}
            </div>
          ) : (
            <div className="p-6 flex flex-col items-center justify-center text-center text-slate-500 min-h-[160px]">
              <FileText size={32} className="opacity-30 mb-3" />
              <p className="text-sm font-medium">{t('timeline.selectEvent')}</p>
              <p className="text-xs mt-1">{t('timeline.clickPrompt')}</p>
            </div>
          )}
        </aside>

        <div
          ref={scrollContainerRef}
          className="relative flex-1 overflow-y-auto overflow-x-auto pr-4 custom-scrollbar scroll-smooth min-w-0"
        >
          <div className="relative py-12 min-w-[1000px]">
            <div className="absolute left-[180px] top-0 bottom-0 w-1 bg-slate-700/50 shadow-[0_0_10px_rgba(51,65,85,0.2)]" />

            {(() => {
              const MONTH_NAMES = i18n.language === 'it'
                ? ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
                : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              const { events, membershipHistory } = data;
              const timelineEntries = events.filter((d: TimelineEntry) => ['assembly', 'member_admission', 'member_resignation', 'pending_verbal', 'compliance_error'].includes(d.type));
              const sortedEvents = [...timelineEntries].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

              const getHistoricalMembersAtDate = (dateStr: string) => {
                const targetDate = new Date(dateStr).getTime();
                return membershipHistory.filter((m: MembershipHistory) => {
                  const admission = new Date(m.admission).getTime();
                  const resignation = m.resignation ? new Date(m.resignation).getTime() : Infinity;
                  return admission <= targetDate && resignation > targetDate;
                });
              };

              const dayGroups: Record<string, any[]> = {};
              sortedEvents.forEach(e => {
                const d = e.start.split('T')[0];
                if (!dayGroups[d]) dayGroups[d] = [];
                dayGroups[d].push(e);
              });

              const minYear = 2019;
              const maxYear = new Date().getFullYear();
              const years: number[] = [];
              for (let y = minYear; y <= maxYear + 1; y++) years.push(y);

              return years.map(year => {
                const yearEvents: ReactNode[] = [];
                let yearHeight = 0;

                for (let mIdx = 0; mIdx < 12; mIdx++) {
                  const monthKey = `${year}-${String(mIdx + 1).padStart(2, '0')}`;
                  const monthName = MONTH_NAMES[mIdx];
                  const daysInMonth = Object.keys(dayGroups).filter(d => d.startsWith(monthKey)).sort();

                  yearEvents.push(
                    <div key={`month-${year}-${mIdx}`} className="absolute left-[180px] flex items-center z-10" style={{ top: `${yearHeight}px` }}>
                      <div className="w-4 h-px bg-slate-500/30" />
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] -translate-x-full pr-8 w-32 text-right">
                        {monthName}
                      </div>
                    </div>
                  );
                  yearHeight += 30;

                  if (daysInMonth.length > 0) {
                    daysInMonth.forEach(dayStr => {
                      const group = dayGroups[dayStr];
                      const displayDate = new Date(dayStr).toLocaleDateString(i18n.language, { day: '2-digit', month: '2-digit' });
                      const groupY = yearHeight;
                      const rows = Math.ceil(group.length / 2);
                      const groupHeight = Math.max(70, rows * 80);

                      yearEvents.push(
                        <div key={dayStr} className="absolute left-[180px] flex items-start z-20 hover:z-[70]" style={{ top: `${groupY}px` }}>
                          <div className="w-8 h-px bg-slate-600 mt-5 shrink-0" />
                          <div className="flex flex-wrap gap-3 max-w-[1000px]">
                            {group.map(entry => {
                              const isAssembly = entry.type === 'assembly';
                              const isAmm = entry.type === 'member_admission';
                              const isPen = entry.type === 'pending_verbal';
                              const isErr = entry.type === 'compliance_error';

                              let colorClass = '';
                              if (isAssembly) {
                                if (entry.complianceStatus === 'warning') colorClass = 'bg-yellow-600/10 text-yellow-500 border-yellow-500/40 after:absolute after:-top-1 after:-right-1 after:w-2 after:h-2 after:bg-yellow-500 after:rounded-full after:animate-ping';
                                else colorClass = 'bg-purple-600/10 text-purple-400 border-purple-500/30';
                              } else if (isAmm) {
                                colorClass = 'bg-green-600/10 text-green-400 border-green-500/30';
                              } else if (isPen) {
                                colorClass = 'bg-yellow-600/20 text-yellow-500 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.1)]';
                              } else if (isErr) {
                                colorClass = 'bg-red-600/20 text-red-500 border-red-500/50 animate-pulse-subtle shadow-[0_0_15px_rgba(239,68,68,0.2)]';
                              } else {
                                colorClass = 'bg-red-600/10 text-red-400 border-red-500/30';
                              }

                              let dLabel = '';
                              let snapshotCount = 0;

                              if (isAssembly) {
                                snapshotCount = getHistoricalMembersAtDate(entry.start).length;
                                const isOrd = entry.subType === 'ordinaria';
                                const isCD = entry.subType === 'consiglio_direttivo';
                                if (isCD) dLabel = `[CD] Consiglio Dir. - ${displayDate}`;
                                else dLabel = `Ass. ${isOrd ? 'Ord' : 'Str'} - ${displayDate}`;
                              } else if (isPen || isErr) {
                                dLabel = entry.label;
                              } else {
                                const nameParts = entry.label.split(': ')[1]?.split(' ') || [];
                                dLabel = `[${isAmm ? 'Amm.' : 'Dim.'}] ${nameParts[0]} ${nameParts[1]?.[0] || ''}. - ${displayDate}`;
                              }

                              return (
                                <button
                                  key={entry.id}
                                  type="button"
                                  onClick={() => setSelectedId(prev => prev === entry.id ? null : entry.id)}
                                  className={`relative flex items-center space-x-2 px-3 py-2 rounded-lg border shadow-lg backdrop-blur-md transition-all hover:scale-[1.02] hover:brightness-110 cursor-pointer text-left ${colorClass} ${selectedId === entry.id ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900' : ''}`}
                                >
                                  {isAssembly ? <FileText size={14} /> : isAmm ? <UserPlus size={14} /> : isPen ? <Info size={14} /> : isErr ? <AlertTriangle size={14} /> : <UserMinus size={14} />}
                                  <div className="flex flex-col">
                                    <span className="text-[12px] font-black whitespace-nowrap tracking-wide uppercase">{dLabel}</span>
                                    {isAssembly && snapshotCount > 0 && <span className="text-[9px] opacity-70 font-bold">Soci: {snapshotCount}</span>}
                                    {isErr && <span className="text-[9px] font-black opacity-80">{entry.errorType?.replace('_', ' ').toUpperCase()}</span>}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                      yearHeight += groupHeight + 15;
                    });
                  }
                }

                return (
                  <div key={year} className="relative w-full mb-10 last:mb-0" style={{ minHeight: `${yearHeight + 100}px` }}>
                    <div className="sticky top-12 z-[100] h-0 pointer-events-none">
                      <div className="absolute left-[180px] -translate-x-1/2 flex items-center justify-center pointer-events-auto">
                        <div className="bg-slate-900 border-2 border-blue-600 rounded-full pl-2 pr-2.5 py-4 flex flex-row items-center justify-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.2)] -translate-x-[calc(100%+30px)]">
                          <span className="text-sm font-black text-white [writing-mode:vertical-lr] rotate-180 tracking-[0.2em] uppercase leading-none">{year}</span>
                          <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6] animate-pulse shrink-0" />
                        </div>
                      </div>
                    </div>
                    <div className="relative">
                      {yearEvents}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        <div className="bg-slate-900 border-t border-slate-800 py-3 px-8 flex justify-center space-x-8 shrink-0 overflow-x-auto custom-scrollbar no-scrollbar-buttons">
          <LegendItem icon={<FileText size={14} className="text-purple-400" />} label={t('timeline.legend.assemblies')} />
          <LegendItem icon={<UserPlus size={14} className="text-green-500" />} label={t('timeline.legend.admissions')} />
          <LegendItem icon={<UserMinus size={14} className="text-red-500" />} label={t('timeline.legend.resignations')} />
          <LegendItem icon={<Info size={14} className="text-yellow-500" />} label={t('timeline.legend.pending')} />
          <LegendItem icon={<AlertTriangle size={14} className="text-red-600" />} label={t('timeline.legend.error')} />
        </div>
      </div>

      <div className="bg-blue-900/10 border border-blue-900/30 p-4 rounded-xl flex items-start space-x-4 max-w-[1600px] mx-auto shadow-sm">
        <Info className="text-blue-400 shrink-0 mt-0.5" size={20} />
        <div className="flex flex-col">
          <p className="text-[13px] text-slate-400 font-medium leading-relaxed">
            {t('timeline.help')}
          </p>
        </div>
      </div>

      <HistoricalMemberModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
        date={modalState.date}
        members={modalState.members}
        assemblyLabel={modalState.label}
      />
    </div>
  );
};

const LegendItem = ({ icon, label }: { icon: ReactNode; label: string }) => (
  <div className="flex items-center space-x-2 group cursor-default">
    <div className="p-1.5 bg-slate-800/50 rounded-md border border-slate-700/50 transition-colors shadow-inner">
      {icon}
    </div>
    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest group-hover:text-slate-300 transition-colors">{label}</span>
  </div>
);

export default TimelineView;
