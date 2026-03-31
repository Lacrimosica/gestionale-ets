import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePeriods, type VolunteerPeriod } from '../hooks/usePeriods';
import { useListState } from '../hooks/useListState';
import PaginationControls from '../components/PaginationControls';
import { type Person } from '../hooks/usePersone';
import { 
  Users, Search, Calendar, ArrowRight,
  ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ActiveVolunteer {
  person: Person;
  period: VolunteerPeriod;
}

const VolunteersList = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { getActiveVolunteers, loading } = usePeriods();
  const [volunteers, setVolunteers] = useState<ActiveVolunteer[]>([]);

  useEffect(() => {
    getActiveVolunteers().then(setVolunteers);
  }, []);

  const { state, setPage, setPageSize, setSearchTerm, setSort, setFilter, processList } = useListState<ActiveVolunteer>({
    initialSortBy: 'person.lastName',
    pageSize: 10
  });

  const { items, totalItems, totalPages, currentPage, pageSize } = processList(volunteers, (item, filter) => {
    if (filter === 'no_email') return !item.person.email;
    return true;
  });

  const filters = [
    { id: 'all', label: t('volunteers.allVolunteers', { defaultValue: 'All Volunteers' }) },
    { id: 'no_email', label: t('people.noEmail', { defaultValue: 'No Email' }) },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
            <Users className="text-blue-400" />
            <span>{t('nav.volunteers')}</span>
          </h1>
          <p className="text-slate-400 mt-1">{t('volunteers.subtitle', { defaultValue: 'People with ongoing volunteer activities.' })}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
              state.filter === f.id 
                ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20' 
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4 px-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder={t('volunteers.searchPlaceholder', { defaultValue: 'Search among volunteers...' })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              value={state.searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-sm text-slate-500 font-medium">
            <span className="text-blue-400 font-bold">{totalItems}</span> {t('volunteers.activeCount', { defaultValue: 'active volunteers' })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold cursor-pointer hover:text-white transition-colors group" onClick={() => setSort('person.lastName')}>
                  <div className="flex items-center space-x-2">
                    <span>{t('people.person')}</span>
                    {state.sortBy === 'person.lastName' ? (state.sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-20 group-hover:opacity-100" />}
                  </div>
                </th>
                <th className="px-6 py-4 font-semibold cursor-pointer hover:text-white transition-colors group" onClick={() => setSort('period.enrollmentDate')}>
                  <div className="flex items-center space-x-2">
                    <span>{t('common.fields.startDate')}</span>
                    {state.sortBy === 'period.enrollmentDate' ? (state.sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-20 group-hover:opacity-100" />}
                  </div>
                </th>
                <th className="px-6 py-4 font-semibold">{t('people.identifiers')}</th>
                <th className="px-6 py-4 font-semibold text-right">{t('common.actions.actions', { defaultValue: 'Actions' })}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center space-x-2">
                       <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                       <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                       <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                    </div>
                    <span className="mt-2 block">{t('common.status.loading')}</span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500 italic">{t('volunteers.noResults', { defaultValue: 'No volunteers found.' })}</td></tr>
              ) : (
                items.map((v) => (
                  <tr 
                    key={v.period.id} 
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    onClick={() => navigate(`/people/${v.person.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-200">{v.person.firstName} {v.person.lastName}</div>
                      <div className="text-xs text-slate-500">{v.person.email || t('people.noEmail')}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm text-slate-400">
                        <Calendar size={14} className="mr-2 text-slate-600" />
                        {new Date(v.period.enrollmentDate).toLocaleDateString(i18n.language)}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      {v.person.taxId}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <ArrowRight size={18} className="ml-auto text-slate-600 group-hover:text-blue-400 transition-colors" />
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
          accentClassName="text-blue-400"
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
};

export default VolunteersList;
