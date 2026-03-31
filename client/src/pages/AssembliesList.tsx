import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAssemblies, type Assembly } from '../hooks/useAssemblies';
import { useListState } from '../hooks/useListState';
import PaginationControls from '../components/PaginationControls';
import { 
  FileText, Plus, Search, Calendar as CalendarIcon,
  ArrowUpDown, ArrowUp, ArrowDown,
  FileCode, FileDown, Video, Users as UsersIcon, Globe
} from 'lucide-react';

const AssembliesList = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { assemblies, loading } = useAssemblies();
  
  const { state, setPage, setPageSize, setSearchTerm, setSort, setFilter, processList } = useListState<Assembly>({
    initialSortBy: 'firstCallDate',
    initialSortOrder: 'desc',
    pageSize: 10
  });

  const { items, totalItems, totalPages, currentPage, pageSize } = processList(assemblies, (item, filter) => {
    if (filter === 'ordinary') return item.type === 'ordinary';
    if (filter === 'extraordinary') return item.type === 'extraordinary';
    if (filter === 'board_council') return item.type === 'board_council';
    return true;
  });

  const getNumDisplay = (v: Assembly) => {
    if (v.type === 'board_council') {
      return `#${v.totalNumber} (Mandate #${v.referenceNumber})`;
    }
    return `#${v.totalNumber} (${v.referenceYear} #${v.referenceNumber})`;
  };

  const filters = [
    { id: 'all', label: t('common.all') },
    { id: 'ordinary', label: t('assemblies.types.ordinary', { defaultValue: 'Ordinary' }) },
    { id: 'extraordinary', label: t('assemblies.types.extraordinary', { defaultValue: 'Extraordinary' }) },
    { id: 'board_council', label: t('assemblies.types.boardCouncil', { defaultValue: 'Board Council' }) },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
            <FileText className="text-purple-400" />
            <span>{t('nav.assemblies')}</span>
          </h1>
          <p className="text-slate-400 mt-1">{t('assemblies.subtitle', { defaultValue: 'Historical record of meetings and resolutions.' })}</p>
        </div>
        <button className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-purple-900/20">
          <Plus size={20} />
          <span>{t('assemblies.newAssembly', { defaultValue: 'New Assembly' })}</span>
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
              state.filter === f.id 
                ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/20' 
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
              placeholder={t('assemblies.searchPlaceholder', { defaultValue: 'Search among assemblies...' })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
              value={state.searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-sm text-slate-500 font-medium">
            <span className="text-purple-400 font-bold">{totalItems}</span> {t('assemblies.registeredCount', { defaultValue: 'assemblies registered' })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold cursor-pointer hover:text-white transition-colors group" onClick={() => setSort('firstCallDate')}>
                  <div className="flex items-center space-x-2">
                    <span>{t('common.fields.date')}</span>
                    {state.sortBy === 'firstCallDate' ? (state.sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-20 group-hover:opacity-100" />}
                  </div>
                </th>
                <th className="px-6 py-4 font-semibold cursor-pointer hover:text-white transition-colors group" onClick={() => setSort('totalNumber')}>
                  <div className="flex items-center space-x-2">
                    <span>N.</span>
                    {state.sortBy === 'totalNumber' ? (state.sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-20 group-hover:opacity-100" />}
                  </div>
                </th>
                <th className="px-6 py-4 font-semibold cursor-pointer hover:text-white transition-colors group" onClick={() => setSort('type')}>
                  <div className="flex items-center space-x-2">
                    <span>{t('common.type', { defaultValue: 'Type' })} / {t('common.body', { defaultValue: 'Body' })}</span>
                    {state.sortBy === 'type' ? (state.sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-20 group-hover:opacity-100" />}
                  </div>
                </th>
                <th className="px-6 py-4 font-semibold">{t('common.details')} / {t('assemblies.agenda', { defaultValue: 'Agenda' })}</th>
                <th className="px-6 py-4 font-semibold text-right">{t('common.documents')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                   <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                     <div className="flex items-center justify-center space-x-2">
                        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"></div>
                     </div>
                     <span className="mt-2 block">{t('common.loading')}</span>
                   </td>
                </tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">{t('assemblies.noResults', { defaultValue: 'No assemblies found.' })}</td></tr>
              ) : (
                items.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => navigate(`/assemblies/${v.id}`)}
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="bg-slate-800 p-2 rounded-lg text-purple-400">
                           <CalendarIcon size={18} />
                        </div>
                        <div className="font-bold text-slate-200">{v.firstCallDate ? new Date(v.firstCallDate).toLocaleDateString(i18n.language) : 'N/A'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">{getNumDisplay(v)}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-1">
                        <span className={`inline-flex w-fit px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          v.type === 'board_council' ? 'bg-blue-900/40 text-blue-400 border-blue-800' : 
                          v.type === 'extraordinary' ? 'bg-amber-900/40 text-amber-400 border-amber-800' :
                          'bg-purple-900/40 text-purple-400 border-purple-800'
                        }`}>
                          {t(`assemblies.types.${v.type}`, { defaultValue: v.type.replace('_', ' ') })}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border whitespace-nowrap ${
                            v.mode === 'in_person' ? 'bg-emerald-900/40 text-emerald-400 border-emerald-800' : 
                            v.mode === 'remote' ? 'bg-cyan-900/40 text-cyan-400 border-cyan-800' :
                            'bg-violet-900/40 text-violet-400 border-violet-800'
                          }`}>
                            {v.mode === 'in_person' && <UsersIcon size={12} />}
                            {v.mode === 'remote' && <Video size={12} />}
                            {v.mode === 'hybrid' && <Globe size={12} />}
                            {t(`assemblies.modes.${v.mode}`, { defaultValue: v.mode })}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-md">
                      <p className="text-sm text-slate-300 line-clamp-2">{v.notes || t('assemblies.noNotes', { defaultValue: 'No notes recorded.' })}</p>
                    </td>
                    <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                       <div className="flex items-center justify-end space-x-3">
                         {v.googleDocsLink ? (
                           <a href={v.googleDocsLink} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 p-1.5 hover:bg-blue-900/20 rounded transition-all" title="Google Docs">
                             <FileCode size={20} />
                           </a>
                         ) : (
                           <FileCode size={20} className="text-slate-800 opacity-30" />
                         )}
                         {v.pdfLink ? (
                           <a href={v.pdfLink} target="_blank" rel="noreferrer" className="text-red-400 hover:text-red-300 p-1.5 hover:bg-red-900/20 rounded transition-all" title="Signed PDF">
                             <FileDown size={20} />
                           </a>
                         ) : (
                           <FileDown size={20} className="text-slate-800 opacity-30" />
                         )}
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
          accentClassName="text-purple-400"
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
};

export default AssembliesList;
