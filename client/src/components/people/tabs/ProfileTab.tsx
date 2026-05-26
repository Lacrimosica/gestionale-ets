import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, PlusCircle, Briefcase, ShieldCheck, Edit2, Trash2, Check, AlertCircle, ScanSearch } from 'lucide-react';
import ComuneCombobox from '../../ComuneCombobox';
import EditableField from '../ui/EditableField';
import InfoField from '../ui/InfoField';
import { formatDate } from '../../../lib/date-utils';

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  taxId?: string;
  birthDate?: string;
  birthPlace?: string;
  birthCountry?: string;
  gender?: string;
  profession?: string;
  isStudent?: boolean;
  isEmployee?: boolean;
  memberNumber?: string;
  isPresumedNonExistent?: boolean;
  email?: string;
  phone?: string;
  notes?: string;
  cfValidation?: string;
  boardRoles?: any[];
}

interface ComplianceData {
  roles?: any[];
}

interface ProfileTabProps {
  person: Person;
  compliance?: ComplianceData;
  canEdit: boolean;
  refresh: () => Promise<void>;
  onRequestEditRole?: (role?: any) => void;
  onRequestDeleteRole?: (roleId: string) => void;
}

const ProfileTab = ({
  person,
  compliance,
  canEdit,
  refresh,
  onRequestEditRole,
  onRequestDeleteRole,
}: ProfileTabProps) => {
  const { t } = useTranslation();
  const [isEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [cfVerifying, setCfVerifying] = useState(false);

  const handleEditChange = (field: string, value: string | boolean) => {
    setEditForm((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleVerifyCf = async () => {
    if (!person.id) return;
    setCfVerifying(true);
    try {
      const { API_BASE_URL } = await import('../../../config');
      const axios = (await import('axios')).default;
      await axios.post(`${API_BASE_URL}/people/${person.id}/verify-cf`);
      await refresh();
    } catch {
      // error is non-fatal; refresh may still show last known state
    } finally {
      setCfVerifying(false);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {isEditing ? (
          <>
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">{t('people.personalDetails', { defaultValue: 'Personal Details' })}</h3>
              <div className="space-y-4">
                <EditableField label={t('people.firstName', { defaultValue: 'First Name' })} value={editForm.firstName} onChange={(v: string) => handleEditChange('firstName', v)} />
                <EditableField label={t('people.lastName', { defaultValue: 'Last Name' })} value={editForm.lastName} onChange={(v: string) => handleEditChange('lastName', v)} />
                <EditableField label={t('people.taxId', { defaultValue: 'Tax ID' })} value={editForm.taxId} onChange={(v: string) => handleEditChange('taxId', v)} mono uppercase />
                <EditableField label={t('people.birthDate', { defaultValue: 'Birth Date' })} value={editForm.birthDate?.split('T')[0] || ''} onChange={(v: string) => handleEditChange('birthDate', v)} type="date" />
                <ComuneCombobox label={t('people.birthPlace', { defaultValue: 'Birth Place' })} value={editForm.birthPlace ?? ''} onChange={(v: string) => handleEditChange('birthPlace', v)} />
                <EditableField label={t('people.birthCountry', { defaultValue: 'Birth Country' })} value={editForm.birthCountry ?? ''} onChange={(v: string) => handleEditChange('birthCountry', v)} />
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-bold uppercase tracking-tighter">{t('people.gender', { defaultValue: 'Gender' })}</label>
                  <select value={editForm.gender || ''} onChange={e => handleEditChange('gender', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm">
                    <option value="">{t('common.actions.select', { defaultValue: 'Select...' })}</option>
                    <option value="M">{t('people.genders.male', { defaultValue: 'Male' })}</option>
                    <option value="F">{t('people.genders.female', { defaultValue: 'Female' })}</option>
                    <option value="Other">{t('people.genders.other', { defaultValue: 'Other' })}</option>
                  </select>
                </div>
                <EditableField label={t('people.profession', { defaultValue: 'Profession' })} value={editForm.profession} onChange={(v: string) => handleEditChange('profession', v)} />
                <div className="space-y-3">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-tighter">{t('people.occupationStatus', { defaultValue: 'Occupation Status' })}</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!editForm.isStudent}
                        onChange={(e) => handleEditChange('isStudent', e.target.checked)}
                        className="h-4 w-4 text-blue-500 rounded"
                      />
                      <span>{t('people.student', { defaultValue: 'Student' })}</span>
                    </label>
                    <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!editForm.isEmployee}
                        onChange={(e) => handleEditChange('isEmployee', e.target.checked)}
                        className="h-4 w-4 text-blue-500 rounded"
                      />
                      <span>{t('people.employee', { defaultValue: 'Employee' })}</span>
                    </label>
                  </div>
                </div>
                <EditableField label={t('people.matricola', { defaultValue: 'Matricola' })} value={editForm.memberNumber} onChange={(v: string) => handleEditChange('memberNumber', v)} mono />

                <div className="space-y-3 pt-6 mt-4 border-t border-slate-800">
                  <span className="text-[10px] text-red-500 font-black uppercase tracking-widest flex items-center gap-1.5"><AlertTriangle size={12} /> Danger Zone</span>
                  <label className="flex items-start gap-3 rounded-xl border border-red-900/30 bg-red-950/20 px-4 py-3 cursor-pointer hover:bg-red-900/20 transition-colors">
                    <input
                      type="checkbox"
                      checked={!!editForm.isPresumedNonExistent}
                      onChange={(e) => handleEditChange('isPresumedNonExistent', e.target.checked)}
                      className="mt-0.5 h-4 w-4 bg-slate-900 border-red-800 rounded text-red-600 focus:ring-red-600 focus:ring-offset-slate-900"
                    />
                    <div>
                      <div className="font-bold text-red-400 text-sm">Mark as Presumed Non-Existent (Ghost Record)</div>
                      <div className="text-xs text-red-500/70 mt-0.5 leading-snug">This removes the person from compliance alerts and voting quorums while maintaining database integrity. Use only for corrupted or legacy unverified records.</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">{t('people.contacts')}</h3>
              <div className="space-y-4">
                <EditableField label="Email" value={editForm.email} onChange={(v: string) => handleEditChange('email', v)} type="email" />
                <EditableField label={t('people.phone', { defaultValue: 'Phone' })} value={editForm.phone} onChange={(v: string) => handleEditChange('phone', v)} />
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-bold uppercase tracking-tighter">{t('common.fields.notes', { defaultValue: 'Notes' })}</label>
                  <textarea value={editForm.notes || ''} onChange={e => handleEditChange('notes', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm min-h-[100px]" />
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">{t('people.personalDetails')}</h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-bold uppercase tracking-tighter">{t('people.taxId')}</label>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-white">{person.taxId || '—'}</span>
                    {person.taxId && (
                      <>
                        {person.cfValidation === 'OK' && (
                          <span className="flex items-center gap-1 text-xs text-green-400 font-medium"><Check size={12} /> OK</span>
                        )}
                        {person.cfValidation && person.cfValidation !== 'OK' && (
                          <span className="flex items-center gap-1 text-xs text-red-400 font-medium" title={JSON.parse(person.cfValidation).join(', ')}>
                            <AlertCircle size={12} /> {JSON.parse(person.cfValidation).join(', ')}
                          </span>
                        )}
                        <button
                          onClick={handleVerifyCf}
                          disabled={cfVerifying}
                          className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-400 transition-colors disabled:opacity-50"
                          title={t('people.verifyCf', { defaultValue: 'Verify codice fiscale' })}
                        >
                          <ScanSearch size={14} className={cfVerifying ? 'animate-pulse' : ''} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <InfoField label={t('people.birth', { defaultValue: 'Birth' })} value={person.birthDate ? `${formatDate(person.birthDate)} (${person.birthPlace || person.birthCountry || 'N/D'})` : 'N/D'} />
                <InfoField label={t('people.gender')} value={person.gender} />
                <InfoField label={t('people.profession')} value={person.profession} />
                <InfoField label={t('people.student')} value={person.isStudent ? t('common.status.yes') : t('common.status.no')} />
                <InfoField label={t('people.employee')} value={person.isEmployee ? t('common.status.yes') : t('common.status.no')} />
                <InfoField label={t('people.matricola')} value={person.memberNumber} mono />
              </div>
            </div>
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">{t('people.contacts')}</h3>
              <div className="space-y-4">
                <InfoField label="Email" value={person.email} />
                <InfoField label={t('people.phone')} value={person.phone} />
                <InfoField label={t('common.fields.notes')} value={person.notes} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Roles & Responsibilities Section */}
      <div className="space-y-6 pt-8 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">{t('people.rolesAndResponsibilities')}</h3>
          {canEdit && (
            <button
              onClick={() => onRequestEditRole?.()}
              className="flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
            >
              <PlusCircle size={14} />
              {t('people.addRole')}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Board Roles */}
          {person.boardRoles?.filter(r => !r.generation.endDate || new Date(r.generation.endDate) >= new Date()).map(role => (
            <div key={`board-${role.member.id}`} className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
              <div className="p-2 bg-amber-900/20 text-amber-500 border border-amber-900/30 rounded-lg">
                <Briefcase size={20} />
              </div>
              <div>
                <div className="text-sm font-bold text-white">{role.member.role}</div>
                <div className="text-xs text-slate-500">{role.generation.name}</div>
              </div>
            </div>
          ))}

          {/* Compliance Roles (Operational) */}
          {compliance?.roles?.map(role => (
            <div key={`comp-${role.id}`} className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-900/20 text-blue-400 border border-blue-900/30 rounded-lg">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{t(role.label)}</div>
                  <div className="text-xs text-slate-500">
                    {role.startDate ? formatDate(role.startDate) : 'N/D'}
                    {(role.endDate || role.active) && (
                      <>
                        <span className="mx-1">→</span>
                        {role.endDate ? formatDate(role.endDate) : t('common.status.ongoing')}
                      </>
                    )}
                  </div>
                </div>
              </div>
              {canEdit && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onRequestEditRole?.(role)} className="p-1.5 text-slate-400 hover:text-blue-400">
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => onRequestDeleteRole?.(role.id)}
                    className="p-1.5 text-slate-600 hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}

          {(!person.boardRoles?.length && !compliance?.roles?.length) && (
            <div className="col-span-full py-8 text-center border border-dashed border-slate-800 rounded-xl">
              <p className="text-sm text-slate-500 italic">{t('people.noActiveRoles')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileTab;
