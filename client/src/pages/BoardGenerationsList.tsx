import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../lib/date-utils';
import { useBoardGenerations, type BoardMemberWithDetails } from '../hooks/useBoardGenerations';
import { usePeople } from '../hooks/usePeople';
import { normalizeRole, BOARD_ROLES } from '../lib/board-roles';
import { Users, ChevronDown, ChevronRight, Loader2, AlertCircle, Edit2, Plus, Trash2, Check, X } from 'lucide-react';

const BoardGenerationsList = () => {
  const { t } = useTranslation();
  const { generations, loading, error, getMembers, addGeneration, updateGeneration, deleteGeneration, addMember, updateMember, removeMember } = useBoardGenerations();
  const { people } = usePeople();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [members, setMembers] = useState<Record<string, BoardMemberWithDetails[]>>({});
  const [loadingMembers, setLoadingMembers] = useState<Record<string, boolean>>({});

  // EDIT STATE
  const [isCreatingGen, setIsCreatingGen] = useState(false);
  const [newGenForm, setNewGenForm] = useState({ name: '', startDate: '', endDate: '' });

  const [editingGenId, setEditingGenId] = useState<string | null>(null);
  const [genForm, setGenForm] = useState({ name: '', startDate: '', endDate: '' });

  const [addingMemTo, setAddingMemTo] = useState<string | null>(null);
  const [memForm, setMemForm] = useState({ personId: '', role: 'councilor', notes: '' });

  const [editingMemId, setEditingMemId] = useState<string | null>(null);
  const [editMemForm, setEditMemForm] = useState({ role: '', notes: '' });

  // Load all members on component mount
  useEffect(() => {
    const loadAllMembers = async () => {
      const allMembers: Record<string, BoardMemberWithDetails[]> = {};
      for (const gen of generations) {
        try {
          const data = await getMembers(gen.id);
          allMembers[gen.id] = data;
        } catch (err) {
          console.error(`Failed to load members for generation ${gen.id}`, err);
        }
      }
      setMembers(allMembers);
    };

    if (generations.length > 0) {
      loadAllMembers();
    }
  }, [generations, getMembers]);

  const toggleExpand = async (id: string, forceRefresh = false) => {
    if (expandedId === id && !forceRefresh) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    
    if (!members[id] || forceRefresh) {
      setLoadingMembers(prev => ({ ...prev, [id]: true }));
      try {
        const data = await getMembers(id);
        setMembers(prev => ({ ...prev, [id]: data }));
      } catch (err) {
        console.error('Failed to load members', err);
      } finally {
        setLoadingMembers(prev => ({ ...prev, [id]: false }));
      }
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch(role?.toLowerCase()) {
      case 'president': return 'bg-special-500/10 text-special-400 border border-special-500/20';
      case 'vice president': return 'bg-accent-500/10 text-accent-400 border border-accent-500/20';
      case 'treasurer': return 'bg-success-500/10 text-success-400 border border-success-500/20';
      default: return 'bg-neutral-500/10 text-neutral-400 border border-neutral-500/20';
    }
  };

  const roles = Object.values(BOARD_ROLES);

  const getLeadership = (genId: string) => {
    const genMembers = members[genId] || [];
    const president = genMembers.find(({ member }) => normalizeRole(member.role) === 'president');
    const vicePresident = genMembers.find(({ member }) => normalizeRole(member.role) === 'vice_president');
    return { president, vicePresident };
  };

  // Actions
  const handleCreateGen = async () => {
    if (!newGenForm.name || !newGenForm.startDate) return alert(t('board.errors.missingFields', { defaultValue: 'Enter generation name and start date.' }));
    await addGeneration({ name: newGenForm.name, startDate: newGenForm.startDate, endDate: newGenForm.endDate || undefined });
    setIsCreatingGen(false);
    setNewGenForm({ name: '', startDate: '', endDate: '' });
  };

  const handleSaveGen = async (id: string) => {
    await updateGeneration(id, { name: genForm.name, startDate: genForm.startDate, endDate: genForm.endDate || undefined });
    setEditingGenId(null);
  };

  const handleDeleteGen = async (id: string) => {
    await deleteGeneration(id);
    if (expandedId === id) setExpandedId(null);
  };

  const handleAddMem = async (genId: string) => {
    if (!memForm.personId || !memForm.role) return alert(t('board.errors.completeMember', { defaultValue: 'Complete person and role' }));
    await addMember(genId, memForm);
    setAddingMemTo(null);
    setMemForm({ personId: '', role: 'councilor', notes: '' });
    toggleExpand(genId, true);
  };

  const handleSaveMem = async (genId: string, memId: string) => {
    await updateMember(memId, editMemForm);
    setEditingMemId(null);
    toggleExpand(genId, true);
  };

  const handleDeleteMem = async (genId: string, memId: string) => {
    await removeMember(memId);
    toggleExpand(genId, true);
  };

  if (loading && !generations.length) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-accent-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-danger-500/10 border border-danger-500 p-4 rounded-xl flex items-center text-danger-400">
        <AlertCircle className="w-5 h-5 mr-3" />
        {error || t('common.status.error')}
      </div>
    );
  }

  const sortedGenerations = [...generations].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-fg mb-2">{t('nav.board')}</h1>
          <p className="text-neutral-400">{t('board.subtitle', { defaultValue: 'Historical record of mandates and composition of the Board of Directors.' })}</p>
        </div>
        <button 
          onClick={() => setIsCreatingGen(true)}
          className="bg-accent-600 hover:bg-accent-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2 font-bold transition-all shadow-lg shadow-accent-900/20"
        >
          <Plus size={18} />
          <span>{t('board.newGeneration', { defaultValue: 'New Generation' })}</span>
        </button>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 bg-neutral-800/50 border-b border-neutral-800 flex items-center font-medium text-neutral-300">
          <div className="w-10"></div>
          <div className="flex-1">{t('board.generation', { defaultValue: 'Generation' })}</div>
          <div className="w-1/4">{t('common.fields.startDate')}</div>
          <div className="w-1/4">{t('common.fields.endDate')}</div>
          <div className="w-24"></div>
        </div>
        
        {isCreatingGen && (
          <div className="bg-neutral-800/40 p-4 border-b border-neutral-700 flex items-center space-x-4">
            <div className="w-10"></div>
            <input 
              type="text" 
              value={newGenForm.name} 
              onChange={e => setNewGenForm({...newGenForm, name: e.target.value})}
              className="flex-1 bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-fg placeholder-neutral-500"
              placeholder={t('board.namePlaceholder', { defaultValue: 'Ex: 2026-2027 (8th)' })}
            />
            <input 
              type="date" 
              value={newGenForm.startDate} 
              onChange={e => setNewGenForm({...newGenForm, startDate: e.target.value})}
              className="w-1/4 bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-fg text-sm focus:outline-none"
            />
            <input 
              type="date" 
              value={newGenForm.endDate} 
              onChange={e => setNewGenForm({...newGenForm, endDate: e.target.value})}
              className="w-1/4 bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-fg text-sm"
            />
            <div className="flex space-x-2 w-24 justify-end">
              <button onClick={handleCreateGen} aria-label={t('board.actions.saveGeneration')} title={t('board.actions.saveGeneration')} className="p-2 bg-accent-600 text-white hover:bg-accent-500 rounded-lg shadow"><Check size={18} /></button>
              <button onClick={() => setIsCreatingGen(false)} aria-label={t('board.actions.cancelGeneration')} title={t('board.actions.cancelGeneration')} className="p-2 bg-neutral-800 text-neutral-400 hover:bg-neutral-700 rounded-lg"><X size={18} /></button>
            </div>
          </div>
        )}

        <div className="divide-y divide-neutral-800">
          {sortedGenerations.length === 0 && !isCreatingGen ? (
            <div className="p-8 text-center text-neutral-500 italic">{t('board.noGenerations', { defaultValue: 'No generations registered.' })}</div>
          ) : (
            sortedGenerations.map((gen) => (
              <div key={gen.id} className="flex flex-col">
                <div className={`p-4 transition-colors ${expandedId === gen.id ? 'bg-neutral-800/30' : 'hover:bg-neutral-800/50 group'}`}>
                  {editingGenId === gen.id ? (
                    <div className="flex items-center space-x-4 bg-neutral-950 p-2 rounded-lg border border-neutral-700">
                      <div className="w-10"></div>
                      <input 
                        type="text" 
                        value={genForm.name} 
                        onChange={e => setGenForm({...genForm, name: e.target.value})}
                        className="flex-1 bg-neutral-800 border border-neutral-700 rounded px-3 py-1 text-fg"
                        placeholder={t('board.generationName', { defaultValue: 'Generation Name' })}
                      />
                      <input 
                        type="date" 
                        value={genForm.startDate.split('T')[0]} 
                        onChange={e => setGenForm({...genForm, startDate: e.target.value})}
                        className="w-1/4 bg-neutral-800 border border-neutral-700 rounded px-3 py-1 text-fg text-sm"
                      />
                      <input 
                        type="date" 
                        value={genForm.endDate?.split('T')[0] || ''} 
                        onChange={e => setGenForm({...genForm, endDate: e.target.value})}
                        className="w-1/4 bg-neutral-800 border border-neutral-700 rounded px-3 py-1 text-fg text-sm"
                      />
                      <div className="flex space-x-2">
                        <button onClick={() => handleSaveGen(gen.id)} className="p-1.5 text-success-400 hover:bg-success-400/10 rounded"><Check size={18} /></button>
                        <button onClick={() => setEditingGenId(null)} className="p-1.5 text-neutral-400 hover:bg-neutral-700 rounded"><X size={18} /></button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center cursor-pointer" onClick={() => toggleExpand(gen.id)}>
                      <div className="w-10 text-neutral-500">
                        {expandedId === gen.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-fg flex items-center mb-1">
                          <Users size={16} className="mr-2 text-accent-400" />
                          {gen.name}
                        </div>
                        <div className="text-xs text-neutral-400 font-semibold flex items-center space-x-3">
                          {(() => {
                            const { president, vicePresident } = getLeadership(gen.id);
                            const leadership = [];
                            if (president) leadership.push(`${t('board.roles.president', { defaultValue: 'President' })}: ${president.person.firstName} ${president.person.lastName}`);
                            if (vicePresident) leadership.push(`${t('board.roles.vice_president', { defaultValue: 'Vice President' })}: ${vicePresident.person.firstName} ${vicePresident.person.lastName}`);
                            return leadership.length > 0 ? leadership.join(' • ') : t('board.noLeadership', { defaultValue: 'No leadership assigned' });
                          })()}
                        </div>
                      </div>
                      <div className="w-1/4 text-neutral-400 text-sm">
                        {formatDate(gen.startDate)}
                      </div>
                      <div className="w-1/4 text-neutral-400 text-sm">
                        {gen.endDate ? formatDate(gen.endDate) : (
                          <span className="text-success-400 font-medium tracking-wide text-xs uppercase">{t('common.status.ongoing')}</span>
                        )}
                      </div>
                      <div className="w-24 flex justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                         <button onClick={() => {
                           setGenForm({ name: gen.name, startDate: gen.startDate, endDate: gen.endDate || '' });
                           setEditingGenId(gen.id);
                         }} className="p-2 text-neutral-400 hover:text-accent-400 hover:bg-accent-400/10 rounded-lg">
                           <Edit2 size={16} />
                         </button>
                         <button onClick={() => handleDeleteGen(gen.id)} className="p-2 text-neutral-400 hover:text-danger-400 hover:bg-danger-400/10 rounded-lg">
                           <Trash2 size={16} />
                         </button>
                      </div>
                    </div>
                  )}
                </div>

                {expandedId === gen.id && (
                  <div className="bg-neutral-950 p-6 border-t border-neutral-800/50 shadow-inner">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
                         {t('board.composition', { defaultValue: 'Board Composition' })}
                      </h3>
                      <button 
                        onClick={() => setAddingMemTo(gen.id)}
                        className="text-xs font-bold text-accent-400 hover:text-accent-300 flex items-center space-x-1 border border-accent-900/50 bg-accent-900/20 px-3 py-1.5 rounded-full"
                      >
                        <Plus size={14} /> <span>{t('board.addMember', { defaultValue: 'Add Member' })}</span>
                      </button>
                    </div>
                    
                    {addingMemTo === gen.id && (
                       <div className="mb-4 bg-neutral-900 border border-accent-900/50 p-4 rounded-xl flex items-center space-x-4 animate-in fade-in slide-in-from-top-2 duration-300">
                         <select 
                           value={memForm.personId}
                           onChange={e => setMemForm({...memForm, personId: e.target.value})}
                           className="flex-1 bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-200"
                         >
                           <option value="">{t('people.selectPerson', { defaultValue: 'Select Person...' })}</option>
                           {people.map((p: any) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
                         </select>
                         <select 
                           value={memForm.role}
                           onChange={e => setMemForm({...memForm, role: e.target.value})}
                           className="w-40 bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-200"
                         >
                           {roles.map(r => (
                             <option key={r} value={r}>
                               {t(`board.roles.${r}`, { defaultValue: r })}
                             </option>
                           ))}
                         </select>
                         <input 
                           type="text" 
                           placeholder={t('common.fields.notes')}
                           value={memForm.notes}
                           onChange={e => setMemForm({...memForm, notes: e.target.value})}
                           className="w-48 bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-200"
                         />
                         <div className="flex space-x-2">
                           <button onClick={() => handleAddMem(gen.id)} aria-label={t('board.actions.saveMember')} title={t('board.actions.saveMember')} className="p-2 bg-accent-600 text-white rounded-lg hover:bg-accent-500"><Check size={18} /></button>
                           <button onClick={() => setAddingMemTo(null)} aria-label={t('board.actions.cancelMember')} title={t('board.actions.cancelMember')} className="p-2 bg-neutral-800 text-neutral-400 rounded-lg hover:bg-neutral-700"><X size={18} /></button>
                         </div>
                       </div>
                    )}

                    {loadingMembers[gen.id] ? (
                      <div className="flex py-4 justify-center items-center">
                        <Loader2 className="w-5 h-5 animate-spin text-neutral-500" />
                      </div>
                    ) : (members[gen.id]?.length > 0) ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {members[gen.id].map(({ member, person }) => {
                          const isEditing = editingMemId === member.id;
                          return (
                          <div 
                            key={member.id}
                            className={`bg-neutral-900 border rounded-xl p-4 flex flex-col hover:border-neutral-600 transition-colors group ${isEditing ? 'border-accent-900/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'border-neutral-800'}`}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-full bg-neutral-950 border border-neutral-800 flex justify-center items-center text-neutral-400 font-bold text-sm shadow-inner uppercase">
                                  {person.firstName[0]}{person.lastName[0]}
                                </div>
                                <div>
                                  <h4 className="font-bold text-neutral-200 truncate pr-2 max-w-[150px]" title={`${person.firstName} ${person.lastName}`}>
                                    {person.firstName} {person.lastName}
                                  </h4>
                                </div>
                              </div>
                              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!isEditing && (
                                  <>
                                    <button onClick={() => { setEditMemForm({ role: normalizeRole(member.role ?? '') ?? '', notes: member.notes ?? '' }); setEditingMemId(member.id ?? ''); }} className="p-1.5 text-neutral-500 hover:text-accent-400 hover:bg-accent-400/10 rounded-lg"><Edit2 size={14} /></button>
                                    <button onClick={() => handleDeleteMem(gen.id, member.id)} className="p-1.5 text-neutral-500 hover:text-danger-400 hover:bg-danger-400/10 rounded-lg"><Trash2 size={14} /></button>
                                  </>
                                )}
                              </div>
                            </div>

                            {isEditing ? (
                              <div className="space-y-3 mt-1 border-t border-neutral-800 pt-3">
                                <select 
                                   value={editMemForm.role}
                                   onChange={e => setEditMemForm({...editMemForm, role: e.target.value})}
                                   className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-1.5 text-neutral-200 text-sm"
                                 >
                                   {roles.map(r => (
                                     <option key={r} value={r}>
                                       {t(`board.roles.${r}`, { defaultValue: r })}
                                     </option>
                                   ))}
                                 </select>
                                 <input 
                                   type="text" 
                                   placeholder={t('common.fields.notesPlaceholder')}
                                   value={editMemForm.notes}
                                   onChange={e => setEditMemForm({...editMemForm, notes: e.target.value})}
                                   className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-1.5 text-neutral-200 text-sm"
                                 />
                                 <div className="flex justify-end space-x-2 pt-1">
                                   <button onClick={() => setEditingMemId(null)} className="px-3 py-1 text-xs font-bold text-neutral-400 hover:text-fg uppercase tracking-wider">{t('common.actions.cancel')}</button>
                                   <button onClick={() => handleSaveMem(gen.id, member.id)} className="px-3 py-1 text-xs font-bold bg-accent-600 text-white rounded-lg hover:bg-accent-500 uppercase tracking-wider">{t('common.actions.save')}</button>
                                 </div>
                              </div>
                            ) : (
                              <div>
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${getRoleBadgeColor(member.role)}`}>
                                   {t(`board.roles.${member.role}`, { defaultValue: member.role })}
                                </span>
                                {member.notes && (
                                  <p className="mt-3 text-xs text-neutral-400/80 bg-neutral-950/50 p-2 rounded-lg border border-neutral-800/50">
                                    {member.notes}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )})}
                      </div>
                    ) : (
                      <div className="text-neutral-500 text-sm italic py-2">
                        {t('board.noMembers', { defaultValue: 'No members assigned to this generation.' })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default BoardGenerationsList;
