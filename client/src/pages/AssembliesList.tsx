import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useAssemblies, type Assembly } from '../hooks/useAssemblies';
import { useListState } from '../hooks/useListState';
import PaginationControls from '../components/PaginationControls';
import { API_BASE_URL } from '../config';
import { type MemberCandidate } from '../components/SingleMemberPicker';
import {
  FileText, Plus, Search, Check,
  ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { PERMISSIONS } from '../lib/permissions';
import { AssemblyTableRow } from '../components/assemblies/AssemblyTableRow';
import { AssemblyDeleteModal } from '../components/assemblies/AssemblyDeleteModal';
import { AssemblySelectionToolbar } from '../components/assemblies/AssemblySelectionToolbar';
import { CreateAssemblyWizard } from '../components/assemblies/CreateAssemblyWizard';


const AssembliesList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission(PERMISSIONS.assembliesEdit);
  const { assemblies, loading, deleteAssemblies } = useAssemblies();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAssemblyIds, setSelectedAssemblyIds] = useState<string[]>([]);
  const [confirmDeleteSelected, setConfirmDeleteSelected] = useState(false);
  const [memberCandidates, setMemberCandidates] = useState<MemberCandidate[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // Load member candidates when modal opens
  useEffect(() => {
    if (!isModalOpen || memberCandidates.length > 0 || membersLoading) return;
    setMembersLoading(true);
    axios.get<MemberCandidate[]>(`${API_BASE_URL}/documents/all-volunteers-with-status`)
      .then(({ data }) => setMemberCandidates(data))
      .catch(() => { })
      .finally(() => setMembersLoading(false));
  }, [isModalOpen, memberCandidates.length, membersLoading]);

  const { state, setPage, setPageSize, setSearchTerm, setSort, setFilter, setYear, processList } = useListState<Assembly>({
    initialSortBy: 'firstCallDate',
    initialSortOrder: 'desc',
    pageSize: 10
  });

  const availableYears = useMemo(() => {
    const years = new Set(assemblies.map(a => new Date(a.firstCallDate).getFullYear()));
    return [...years].sort((a, b) => b - a);
  }, [assemblies]);

  const yearFiltered = state.year
    ? assemblies.filter(a => new Date(a.firstCallDate).getFullYear() === parseInt(state.year))
    : assemblies;

  const { items, totalItems, totalPages, currentPage, pageSize } = processList(yearFiltered, (item, filter) => {
    if (filter === 'ordinary') return item.type === 'ordinary';
    if (filter === 'extraordinary') return item.type === 'extraordinary';
    if (filter === 'board_council') return item.type === 'board_council';
    return true;
  });

  const isAllSelected = items.length > 0 && items.every((a) => selectedAssemblyIds.includes(a.id));
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedAssemblyIds([]);
    } else {
      setSelectedAssemblyIds(items.map((a) => a.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedAssemblyIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filters = [
    { id: 'all', label: t('common.status.all') },
    { id: 'ordinary', label: t('assemblies.types.ordinary') },
    { id: 'extraordinary', label: t('assemblies.types.extraordinary') },
    { id: 'board_council', label: t('assemblies.types.board_council') },
    { id: 'constitution', label: t('assemblies.types.constitution') },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
            <FileText className="text-purple-400" />
            <span>{t('nav.assemblies')}</span>
          </h1>
          <p className="text-slate-400 mt-1">{t('assemblies.subtitle')}</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-purple-900/20"
          >
            <Plus size={20} />
            <span>{t('assemblies.newAssembly')}</span>
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${state.filter === f.id
              ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/20'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {availableYears.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{t('common.fields.year', { defaultValue: 'Year' })}</span>
          <button
            onClick={() => setYear('')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${!state.year
              ? 'bg-slate-700 border-slate-600 text-white'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
          >
            {t('common.status.all')}
          </button>
          {availableYears.map(y => (
            <button
              key={y}
              onClick={() => setYear(state.year === String(y) ? '' : String(y))}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${state.year === String(y)
                ? 'bg-slate-700 border-slate-600 text-white'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
            >
              {y}
            </button>
          ))}
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4 px-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder={t('common.fields.searchPlaceholder')}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
              value={state.searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-sm text-slate-500 font-medium">
            <span className="text-purple-400 font-bold">{totalItems}</span> {t('common.status.resultsFound', { count: totalItems })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider">
                {canEdit && (
                  <th className="pl-5 pr-2 py-4 w-10">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 ${isAllSelected ? 'bg-purple-600 border-purple-500' : 'bg-slate-800 border-slate-600 hover:border-purple-500'}`}
                    >
                      {isAllSelected && <Check size={11} className="text-white" strokeWidth={3} />}
                    </button>
                  </th>
                )}
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
                    <span>{t('common.fields.type')}</span>
                    {state.sortBy === 'type' ? (state.sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-20 group-hover:opacity-100" />}
                  </div>
                </th>
                <th className="px-6 py-4 font-semibold">{t('common.fields.details')} / {t('assemblies.agenda')}</th>
                <th className="px-6 py-4 font-semibold text-right">{t('common.fields.documents')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"></div>
                    </div>
                    <span className="mt-2 block">{t('common.status.loading')}</span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">{t('common.status.noResultsFound', { defaultValue: 'No assemblies found.' })}</td></tr>
              ) : (() => {
                const secondaryIds = new Set(
                  items
                    .filter((a) => a.isPrimaryAssembly === false)
                    .map((a) => a.id)
                );

                const assemblyById = new Map(assemblies.map((a) => [a.id, a]));

                return items
                  .filter((v) => !secondaryIds.has(v.id))
                  .map((v) => {
                    const isPaired = !!v.pairedAssemblyId && v.isPrimaryAssembly === true;
                    const partner = isPaired ? assemblyById.get(v.pairedAssemblyId!) : null;

                    return (
                      <AssemblyTableRow
                        key={v.id}
                        assembly={v}
                        partner={partner || null}
                        isPaired={isPaired}
                        isSelected={selectedAssemblyIds.includes(v.id)}
                        canEdit={canEdit}
                        onSelect={toggleSelect}
                        onNavigate={() => navigate(`/assemblies/${v.id}`)}
                      />
                    );
                  });
              })()}
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

      <AssemblyDeleteModal
        isOpen={confirmDeleteSelected}
        onCancel={() => setConfirmDeleteSelected(false)}
        onConfirm={async () => {
          try {
            await deleteAssemblies(selectedAssemblyIds);
            setSelectedAssemblyIds([]);
            setConfirmDeleteSelected(false);
          } catch (err) {
            console.error(err);
          }
        }}
      />

      {canEdit && selectedAssemblyIds.length > 0 && (
        <AssemblySelectionToolbar
          count={selectedAssemblyIds.length}
          onCancel={() => setSelectedAssemblyIds([])}
          onDeleteRequest={() => setConfirmDeleteSelected(true)}
        />
      )}

      <CreateAssemblyWizard
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        memberCandidates={memberCandidates}
        membersLoading={membersLoading}
      />
    </div>
  );
};

export default AssembliesList;
