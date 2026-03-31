import { useTranslation } from 'react-i18next';
import { usePersone, type Person } from '../hooks/usePersone';
import { useListState } from '../hooks/useListState';
import PaginationControls from '../components/PaginationControls';
import {
  UserPlus, Search, Mail, Phone,
  ArrowUpDown, ArrowUp, ArrowDown,
  UserMinus, Trash2, Loader2, X, ShieldCheck
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { usePeriods } from '../hooks/usePeriods';
import { useState, useEffect } from 'react';

const PersoneList = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { people, loading: peopleLoading, error, refresh: refreshPeople } = usePersone();
  const { getActiveMembers, endMembership } = usePeriods();

  const [activeMembersMap, setActiveMembersMap] = useState<Record<string, string>>({}); // personId -> periodId
  const [loadingActive, setLoadingActive] = useState(true);

  // Resignation Modal State
  const [resigningPerson, setResigningPerson] = useState<Person | null>(null);
  const [resignationDate, setResignationDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchActiveMembers = async () => {
    try {
      setLoadingActive(true);
      const active = await getActiveMembers();
      const map: Record<string, string> = {};
      active.forEach((m: any) => {
        map[m.person.id] = m.period.id;
      });
      setActiveMembersMap(map);
    } catch (err) {
      console.error('Error fetching active members:', err);
    } finally {
      setLoadingActive(false);
    }
  };

  useEffect(() => {
    fetchActiveMembers();
  }, [people]);

  const loading = peopleLoading || loadingActive;

  const handleResignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resigningPerson) return;

    const periodId = activeMembersMap[resigningPerson.id];
    if (!periodId) return;

    setIsSubmitting(true);
    try {
      await endMembership(periodId, { resignationDate, exitReason: reason });
      setResigningPerson(null);
      setReason('');
      fetchActiveMembers();
      refreshPeople();
    } catch (err) {
      console.error('Resignation failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const { state, setPage, setPageSize, setSearchTerm, setSort, setFilter, processList } = useListState<Person>({
    initialSortBy: 'lastName',
    pageSize: 10
  });

  const { items, totalItems, totalPages, currentPage, pageSize } = processList(people, (item, filter) => {
    if (filter === 'missing_cf') return !item.taxId;
    if (filter === 'no_contacts') return !item.email && !item.phone;
    return true;
  });

  const filters = [
    { id: 'all', label: t('common.status.all', { defaultValue: 'All' }) },
    { id: 'missing_cf', label: t('people.missingTaxId', { defaultValue: 'Missing Tax ID' }) },
    { id: 'no_contacts', label: t('people.noContacts', { defaultValue: 'No Contacts' }) },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">{t('nav.people')}</h1>
          <p className="text-slate-400 mt-1">{t('people.subtitle', { defaultValue: 'Centralized management of members and volunteers.' })}</p>
        </div>
        <Link
          to="/people/nuova"
          className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20"
        >
          <UserPlus size={20} />
          <span>{t('people.addPerson', { defaultValue: 'Add Person' })}</span>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${state.filter === f.id
              ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-900 text-red-400 px-4 py-3 rounded-lg flex items-center space-x-3">
          <span>{error}</span>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4 px-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder={t('people.searchPlaceholder', { defaultValue: 'Search by name, surname or Tax ID...' })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              value={state.searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-sm text-slate-500 font-medium">
            {t('common.status.resultsFound', { defaultValue: 'Found {{count}} results', count: totalItems })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold cursor-pointer hover:text-white transition-colors group" onClick={() => setSort('lastName')}>
                  <div className="flex items-center space-x-2">
                    <span>{t('people.person', { defaultValue: 'Person' })}</span>
                    {state.sortBy === 'lastName' ? (state.sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-20 group-hover:opacity-100" />}
                  </div>
                </th>
                <th className="px-6 py-4 font-semibold">{t('people.contacts', { defaultValue: 'Contacts' })}</th>
                <th className="px-6 py-4 font-semibold">{t('people.identifiers', { defaultValue: 'Identifiers' })}</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right whitespace-nowrap">{t('common.actions.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                    </div>
                    <span className="mt-2 block">{t('common.status.loading')}</span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                    {t('people.noResults', { defaultValue: 'No people found.' })}
                  </td>
                </tr>
              ) : (
                items.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    onClick={() => navigate(`/people/${p.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center text-blue-400 font-bold border border-slate-700 group-hover:border-blue-500/50 transition-colors">
                          {p.firstName[0]}{p.lastName[0]}
                        </div>
                        <div>
                          <div className="text-slate-200 font-medium">{p.firstName} {p.lastName}</div>
                          <div className="text-slate-500 text-sm">{t('common.fields.addedOn', { defaultValue: 'Added on' })} {new Date(p.createdAt).toLocaleDateString(i18n.language)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {p.email && (
                          <div className="flex items-center text-sm text-slate-400">
                            <Mail size={14} className="mr-2 opacity-50" />
                            {p.email}
                          </div>
                        )}
                        {p.phone && (
                          <div className="flex items-center text-sm text-slate-400">
                            <Phone size={14} className="mr-2 opacity-50" />
                            {p.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-mono text-slate-400 uppercase tracking-tight">
                        {p.taxId || p.memberNumber || 'N/D'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {activeMembersMap[p.id] ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-900/40 text-blue-400 border border-blue-800 uppercase tracking-wider">
                          <ShieldCheck size={12} />
                          {t('nav.members')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-500 border border-slate-700 uppercase">
                          {t('people.person')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {activeMembersMap[p.id] && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setResigningPerson(p);
                              setResignationDate(new Date().toISOString().split('T')[0]);
                            }}
                            className="text-red-400 hover:text-white font-bold text-xs bg-red-400/10 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-all border border-red-500/20 invisible group-hover:visible flex items-center gap-1.5"
                            title={t('common.actions.resign')}
                          >
                            <UserMinus size={14} />
                            <span>{t('common.actions.resign').toUpperCase()}</span>
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/people/${p.id}`); }}
                          className="text-blue-400 hover:text-white font-bold text-xs bg-blue-400/10 hover:bg-blue-600 px-3 py-1.5 rounded-lg transition-all border border-blue-500/20 invisible group-hover:visible"
                        >
                          {t('common.actions.edit')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          accentClassName="text-blue-400"
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>
      {/* Resignation Modal */}
      {resigningPerson && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-2xl font-bold text-white">{t('people.registerResignation')}</h3>
              <button
                onClick={() => setResigningPerson(null)}
                className="p-1 rounded-full hover:bg-slate-800 text-slate-500 hover:text-white transition-colors"
                title={t('common.actions.close')}
              >
                <X size={24} />
              </button>
            </div>

            <p className="text-slate-400 mb-6 leading-relaxed">
              {t('people.confirmResignation', {
                defaultValue: 'You are recording the resignation of {{name}}.',
                name: `${resigningPerson.firstName} ${resigningPerson.lastName}`
              })}
            </p>

            <form onSubmit={handleResignSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">{t('common.fields.date')}</label>
                <input
                  type="date"
                  required
                  value={resignationDate}
                  onChange={(e) => setResignationDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-600/50 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">{t('common.fields.notes')}</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder={t('common.fields.notesPlaceholder', { defaultValue: 'Notes...' })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-600/50 transition-all resize-none"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResigningPerson(null)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-black py-3 rounded-xl transition-all uppercase tracking-widest text-xs"
                >
                  {t('common.actions.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black py-3 rounded-xl transition-all flex items-center justify-center space-x-2 uppercase tracking-widest text-xs shadow-lg shadow-red-900/20"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={16} />}
                  <span>{t('common.actions.confirm')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersoneList;
