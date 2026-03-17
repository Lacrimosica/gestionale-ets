import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePeriods, type MemberPeriod } from '../hooks/usePeriods';
import { useListState } from '../hooks/useListState';
import PaginationControls from '../components/PaginationControls';
import { type Person } from '../hooks/usePersone';
import { 
  ShieldCheck, Search, Calendar, ArrowRight,
  ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBranding } from '../hooks/useBranding';

interface ActiveMember {
  person: Person;
  period: MemberPeriod;
}

const MembersList = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { branding } = useBranding();
  const { getAllMembers, loading } = usePeriods();
  const [members, setMembers] = useState<ActiveMember[]>([]);

  useEffect(() => {
    getAllMembers().then(setMembers);
  }, []);

  const { state, setPage, setPageSize, setSearchTerm, setSort, setFilter, processList } = useListState<ActiveMember>({
    initialSortBy: 'person.lastName',
    pageSize: 10
  });

  const { items, totalItems, totalPages, currentPage, pageSize } = processList(members, (item, filter) => {
    const isResigned = !!item.period.resignationDate;
    
    if (filter === 'active') return !isResigned;
    if (filter === 'inactive') return isResigned;
    if (filter === 'recent') {
      const admission = new Date(item.period.admissionDate);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      return admission >= sixMonthsAgo;
    }
    return true; // 'all' filter
  });

  const filters = [
    { id: 'active', label: t('common.active', { defaultValue: 'Active' }) },
    { id: 'all', label: t('common.allIncludingResigned', { defaultValue: 'All (including resigned)' }) },
    { id: 'inactive', label: t('common.resigned', { defaultValue: 'Resigned' }) },
    { id: 'recent', label: t('common.newLast6Months', { defaultValue: 'New (Last 6 months)' }) },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
            <ShieldCheck className="text-yellow-400" />
            <span>{t('nav.members')}</span>
          </h1>
          <p className="text-slate-400 mt-1">{t('members.subtitle', { defaultValue: 'People officially admitted as members of {{name}}.', name: branding.organizationName })}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
              state.filter === f.id 
                ? 'bg-yellow-600 border-yellow-500 text-white shadow-lg shadow-yellow-900/20' 
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
              placeholder={t('members.searchPlaceholder', { defaultValue: 'Search among members...' })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-yellow-600 focus:border-transparent transition-all"
              value={state.searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-sm text-slate-500 font-medium">
            <span className="text-yellow-400 font-bold">{totalItems}</span> {t('members.foundCount', { defaultValue: 'members found' })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold cursor-pointer hover:text-white transition-colors group" onClick={() => setSort('person.lastName')}>
                  <div className="flex items-center space-x-2">
                    <span>{t('people.member', { defaultValue: 'Member' })}</span>
                    {state.sortBy === 'person.lastName' ? (state.sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-20 group-hover:opacity-100" />}
                  </div>
                </th>
                <th className="px-6 py-4 font-semibold cursor-pointer hover:text-white transition-colors group" onClick={() => setSort('period.admissionDate')}>
                  <div className="flex items-center space-x-2">
                    <span>{t('people.admissionDate', { defaultValue: 'Admission Date' })}</span>
                    {state.sortBy === 'period.admissionDate' ? (state.sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-20 group-hover:opacity-100" />}
                  </div>
                </th>
                <th className="px-6 py-4 font-semibold text-right whitespace-nowrap">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center space-x-2">
                       <div className="w-2 h-2 bg-yellow-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                       <div className="w-2 h-2 bg-yellow-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                       <div className="w-2 h-2 bg-yellow-600 rounded-full animate-bounce"></div>
                    </div>
                    <span className="mt-2 block">{t('common.loading')}</span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-500 italic">{t('members.noResults', { defaultValue: 'No members found.' })}</td></tr>
              ) : (
                items.map((s) => (
                  <tr 
                    key={s.period.id} 
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    onClick={() => navigate(`/people/${s.person.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-200">
                        {s.person.firstName} {s.person.lastName}
                        {s.period.resignationDate && (
                          <span className="ml-3 px-2 py-0.5 bg-red-900/40 text-red-400 border border-red-800 rounded text-[10px] uppercase font-bold tracking-wider">
                            {t('common.resigned')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm text-slate-400">
                        <Calendar size={14} className="mr-2 text-slate-600" />
                        {new Date(s.period.admissionDate).toLocaleDateString(i18n.language)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <ArrowRight size={18} className="ml-auto text-slate-600 group-hover:text-yellow-400 transition-colors" />
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
          accentClassName="text-yellow-400"
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
};

export default MembersList;
