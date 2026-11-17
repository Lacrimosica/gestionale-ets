import { useTranslation } from 'react-i18next';
import { formatDate } from '../lib/date-utils';
import { usePeople, type Person } from '../hooks/usePeople';
import { useListState } from '../hooks/useListState';
import PaginationControls from '../components/PaginationControls';
import PersonNameTag from '../components/PersonNameTag';
import {
  UserPlus, Search, Mail, Phone,
  ArrowUpDown, ArrowUp, ArrowDown,
  UserMinus, Trash2, Loader2, X, ShieldCheck, ScanSearch, BookOpen
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { usePeriods } from '../hooks/usePeriods';
import { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useAuth } from '../hooks/useAuth';
import { PERMISSIONS } from '../lib/permissions';

const PersoneList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission(PERMISSIONS.peopleEdit);

  const { state, setPage, setPageSize, setSearchTerm, setSort, setFilter, processList } = useListState<Person>({
    initialSortBy: 'lastName',
    pageSize: 10
  });

  const { people, loading, error, refresh: refreshPeople } = usePeople(state.filter);
  const { endMembership } = usePeriods();

  // Resignation Modal State
  const [resigningPerson, setResigningPerson] = useState<Person | null>(null);
  const [resignationDate, setResignationDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verifyingAll, setVerifyingAll] = useState(false);
  const [verifyAllResult, setVerifyAllResult] = useState<{ checked: number; ok: number; failed: number; skipped: number } | null>(null);


  const handleVerifyAll = async () => {
    setVerifyingAll(true);
    setVerifyAllResult(null);
    try {
      const res = await axios.post(`${API_BASE_URL}/people/verify-cf/all`);
      setVerifyAllResult(res.data);
      refreshPeople();
    } catch {
      // ignore
    } finally {
      setVerifyingAll(false);
    }
  };

  const handleResignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resigningPerson?.activeMemberPeriodId) return;

    setIsSubmitting(true);
    try {
      await endMembership(resigningPerson.activeMemberPeriodId, { resignationDate, exitReason: reason });
      setResigningPerson(null);
      setReason('');
      refreshPeople();
    } catch (err) {
      console.error('Resignation failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Server already filtered — processList only handles search, sort, pagination
  const { items, totalItems, totalPages, currentPage, pageSize } = processList(people);

  const filters = [
    { id: 'all',        label: t('people.filters.all',        { defaultValue: 'All' }),            group: 'role' },
    { id: 'members',    label: t('people.filters.members',    { defaultValue: 'Members' }),         group: 'role' },
    { id: 'volunteers', label: t('people.filters.volunteers', { defaultValue: 'Volunteers' }),      group: 'role' },
    { id: 'active',     label: t('people.filters.active',     { defaultValue: 'Active' }),          group: 'role' },
    { id: 'resigned',   label: t('people.filters.resigned',   { defaultValue: 'Resigned' }),        group: 'role' },
    { id: 'recent',     label: t('people.filters.recent',     { defaultValue: 'Last 6 months' }),   group: 'role' },
    { id: 'missing_cf',   label: t('people.missingTaxId',  { defaultValue: 'Missing Tax ID' }),        group: 'quality' },
    { id: 'cf_invalid',   label: t('people.cfInvalid',     { defaultValue: 'Invalid Tax ID' }),        group: 'quality' },
    { id: 'cf_unchecked', label: t('people.cfUnchecked',   { defaultValue: 'Tax ID Not Verified' }),   group: 'quality' },
    { id: 'no_contacts',  label: t('people.noContacts',    { defaultValue: 'No Contacts' }),            group: 'quality' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-fg">{t('nav.people')}</h1>
          <p className="text-neutral-400 mt-1">{t('people.subtitle', { defaultValue: 'Centralized management of members and volunteers.' })}</p>
        </div>
        <div className="flex items-center gap-2">
          {verifyAllResult && (
            <span className="text-xs text-neutral-400">
              {verifyAllResult.ok} OK · {verifyAllResult.failed} errori · {verifyAllResult.skipped} saltati
            </span>
          )}
          <button
            onClick={handleVerifyAll}
            disabled={verifyingAll}
            className="flex items-center justify-center space-x-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
            title={t('people.verifyAllCf', { defaultValue: 'Verify all codici fiscali' })}
          >
            {verifyingAll ? <Loader2 size={18} className="animate-spin" /> : <ScanSearch size={18} />}
            <span>{t('people.verifyAllCf', { defaultValue: 'Verifica tutti i CF' })}</span>
          </button>
          {canEdit && (
            <Link
              to="/people/nuova"
              className="flex items-center justify-center space-x-2 bg-accent-600 hover:bg-accent-500 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-accent-900/20"
            >
              <UserPlus size={20} />
              <span>{t('people.addPerson', { defaultValue: 'Add Person' })}</span>
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {filters.filter(f => f.group === 'role').map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${state.filter === f.id
              ? 'bg-accent-600 border-accent-500 text-white shadow-lg shadow-accent-900/20'
              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="h-5 w-px bg-neutral-700 mx-1" />
        {filters.filter(f => f.group === 'quality').map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${state.filter === f.id
              ? 'bg-warning-600 border-warning-500 text-white shadow-lg shadow-warning-900/20'
              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-danger-900/20 border border-danger-900 text-danger-400 px-4 py-3 rounded-lg flex items-center space-x-3">
          <span>{error}</span>
        </div>
      )}

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-neutral-800 bg-neutral-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4 px-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
            <input
              type="text"
              placeholder={t('people.searchPlaceholder', { defaultValue: 'Search by name, surname or Tax ID...' })}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-2 pl-10 pr-4 text-neutral-200 focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-transparent transition-all"
              value={state.searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-sm text-neutral-500 font-medium">
            {t('common.status.resultsFound', { defaultValue: 'Found {{count}} results', count: totalItems })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-950/50 text-neutral-400 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold cursor-pointer hover:text-fg transition-colors group" onClick={() => setSort('lastName')}>
                  <div className="flex items-center space-x-2">
                    <span>{t('people.person', { defaultValue: 'Person' })}</span>
                    {state.sortBy === 'lastName' ? (state.sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-20 group-hover:opacity-100" />}
                  </div>
                </th>
                <th className="px-6 py-4 font-semibold">{t('people.contacts', { defaultValue: 'Contacts' })}</th>
                <th className="px-6 py-4 font-semibold">{t('people.identifiers', { defaultValue: 'Identifiers' })}</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right whitespace-nowrap">{t('common.fields.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-accent-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 bg-accent-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 bg-accent-600 rounded-full animate-bounce"></div>
                    </div>
                    <span className="mt-2 block">{t('common.status.loading')}</span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-neutral-500 italic">
                    {t('people.noResults', { defaultValue: 'No people found.' })}
                  </td>
                </tr>
              ) : (
                items.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-neutral-800/40 transition-colors group cursor-pointer"
                    onClick={() => navigate(`/people/${p.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-neutral-800 flex items-center justify-center text-accent-400 font-bold border border-neutral-700 group-hover:border-accent-500/50 transition-colors">
                          {p.firstName[0]}{p.lastName[0]}
                        </div>
                        <div>
                          <PersonNameTag 
                            name={`${p.firstName} ${p.lastName}`} 
                            isPresumedNonExistent={p.isPresumedNonExistent}
                            className="text-neutral-200 font-medium"
                          />
                          <div className="text-neutral-500 text-sm">{t('common.fields.addedOn', { defaultValue: 'Added on' })} {formatDate(p.createdAt)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {p.email && (
                          <div className="flex items-center text-sm text-neutral-400">
                            <Mail size={14} className="mr-2 opacity-50" />
                            {p.email}
                          </div>
                        )}
                        {p.phone && (
                          <div className="flex items-center text-sm text-neutral-400">
                            <Phone size={14} className="mr-2 opacity-50" />
                            {p.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-mono text-neutral-400 uppercase tracking-tight">
                        {p.taxId || p.memberNumber || 'N/D'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {!!p.isActiveMember && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-accent-900/40 text-accent-400 border border-accent-800 uppercase tracking-wider">
                            <ShieldCheck size={12} />
                            {t('people.member')}
                          </span>
                        )}
                        {!!p.isResigned && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-danger-900/30 text-danger-400 border border-danger-800 uppercase tracking-wider">
                            <UserMinus size={12} />
                            {t('people.filters.resigned', { defaultValue: 'Resigned' })}
                          </span>
                        )}
                        {!!p.isVolunteer && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-800 text-neutral-400 border border-neutral-700 uppercase tracking-wider">
                            <BookOpen size={12} />
                            {t('people.volunteer')}
                          </span>
                        )}
                        {!p.isActiveMember && !p.isResigned && !p.isVolunteer && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-800/50 text-neutral-600 border border-neutral-800 uppercase">
                            —
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canEdit && !!p.activeMemberPeriodId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setResigningPerson(p);
                              setResignationDate(new Date().toISOString().split('T')[0]);
                            }}
                            className="text-danger-400 hover:text-white font-bold text-xs bg-danger-400/10 hover:bg-danger-600 px-3 py-1.5 rounded-lg transition-all border border-danger-500/20 invisible group-hover:visible flex items-center gap-1.5"
                            title={t('common.actions.resign')}
                          >
                            <UserMinus size={14} />
                            <span>{t('common.actions.resign').toUpperCase()}</span>
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/people/${p.id}`); }}
                            className="text-accent-400 hover:text-white font-bold text-xs bg-accent-400/10 hover:bg-accent-600 px-3 py-1.5 rounded-lg transition-all border border-accent-500/20 invisible group-hover:visible"
                          >
                            {t('common.actions.edit')}
                          </button>
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
          accentClassName="text-accent-400"
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Resignation Modal */}
      {resigningPerson && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-2xl font-bold text-fg">{t('people.registerResignation')}</h3>
              <button
                onClick={() => setResigningPerson(null)}
                className="p-1 rounded-full hover:bg-neutral-800 text-neutral-500 hover:text-fg transition-colors"
                title={t('common.actions.close')}
              >
                <X size={24} />
              </button>
            </div>

            <p className="text-neutral-400 mb-6 leading-relaxed">
              {t('people.confirmResignation', {
                defaultValue: 'You are recording the resignation of {{name}}.',
                name: `${resigningPerson.firstName} ${resigningPerson.lastName}`
              })}
            </p>

            <form onSubmit={handleResignSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-neutral-500 uppercase tracking-widest">{t('common.fields.date')}</label>
                <input
                  type="date"
                  required
                  value={resignationDate}
                  onChange={(e) => setResignationDate(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-4 text-fg focus:outline-none focus:ring-2 focus:ring-accent-600/50 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-neutral-500 uppercase tracking-widest">{t('common.fields.notes')}</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder={t('common.fields.notesPlaceholder', { defaultValue: 'Notes...' })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-4 text-fg focus:outline-none focus:ring-2 focus:ring-accent-600/50 transition-all resize-none"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResigningPerson(null)}
                  className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-fg font-black py-3 rounded-xl transition-all uppercase tracking-widest text-xs"
                >
                  {t('common.actions.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-danger-600 hover:bg-danger-500 disabled:opacity-50 text-white font-black py-3 rounded-xl transition-all flex items-center justify-center space-x-2 uppercase tracking-widest text-xs shadow-lg shadow-danger-900/20"
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
