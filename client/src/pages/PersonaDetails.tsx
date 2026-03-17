import { useTranslation } from 'react-i18next';
import { useState, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePersona } from '../hooks/usePersona';
import { usePeriods } from '../hooks/usePeriods';
import { COMPLIANCE_ROLE_TYPES, DOCUMENT_TYPES, useCompliance } from '../hooks/useCompliance';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import { 
  ArrowLeft, User, History, ShieldCheck, 
  UserCheck, UserMinus, PlusCircle, AlertCircle, Briefcase, Edit2, Check, X, Trash2, FileCheck, BellOff, ExternalLink
} from 'lucide-react';

const PersonaDetails = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { person, loading, error, refresh, updatePerson, deletePerson } = usePersona(id!);
  const { startVolunteering, endVolunteering, startMembership, endMembership } = usePeriods(id!);
  
  const { personData: compliance, refresh: refreshCompliance, createRole, updateRole, deleteRole, createDocument, updateDocument, deleteDocument, createFlag, updateFlag, deleteFlag, suppressAlert, releaseSuppression } = useCompliance(id);

  const [activeTab, setActiveTab] = useState<'profile' | 'volunteer' | 'member' | 'board' | 'compliance'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [complianceModal, setComplianceModal] = useState<null | 'role' | 'document' | 'flag' | 'suppress'>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedFlagId, setSelectedFlagId] = useState<string | null>(null);
  const [selectedAlertKey, setSelectedAlertKey] = useState<string | null>(null);
  
  const [roleForm, setRoleForm] = useState({ 
    roleType: COMPLIANCE_ROLE_TYPES[0].value as string, 
    startDate: '', 
    endDate: '', 
    notes: '' 
  });
  
  const [documentForm, setDocumentForm] = useState({
    documentType: DOCUMENT_TYPES[0].value as string,
    version: '',
    driveUrl: '',
    signedAt: '',
    isCurrent: true,
    isSigned: true,
    isDated: false,
    isComplete: true,
    dataProcessingConsent: false,
    thirdPartyCommunicationConsent: false,
    imageUseConsent: false,
    notes: '',
  });
  
  const [flagForm, setFlagForm] = useState({ label: '', severity: 'warning', note: '' });
  const [suppressionForm, setSuppressionForm] = useState({ reason: '', note: '' });

  type ModalType = 'vol_start' | 'vol_end' | 'soc_start' | 'soc_end' | null;
  const [modalType, setModalType] = useState<ModalType>(null);
  const [modalDate, setModalDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'person' | 'role' | 'document' | 'flag' | 'suppression' | null;
    id: string | null;
    title: string;
    message: string;
    confirmPhrase: string;
    confirmValue: string;
    isLoading: boolean;
  }>({
    isOpen: false,
    type: null,
    id: null,
    title: '',
    message: '',
    confirmPhrase: '',
    confirmValue: '',
    isLoading: false
  });
  
  const handleEditChange = (field: string, value: string) => {
    setEditForm((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    await updatePerson(editForm);
    setIsEditing(false);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 text-slate-500">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p>{t('common.loadingDetails', { defaultValue: 'Loading details...' })}</p>
    </div>
  );

  if (error || !person) return (
    <div className="bg-red-900/20 border border-red-900 text-red-400 p-6 rounded-xl flex items-center space-x-4">
      <AlertCircle size={32} />
      <div>
        <h3 className="font-bold text-lg">{t('common.error')}</h3>
        <p>{error || t('people.notFound', { defaultValue: 'Person not found.' })}</p>
        <button onClick={() => navigate('/people')} className="mt-2 text-sm underline">{t('people.backToList', { defaultValue: 'Back to list' })}</button>
      </div>
    </div>
  );

  // A volunteering period is considered "active" if it has no exit date
  const activeVolPeriod = person.volunteerPeriods?.find(p => !p.exitDate);
  const activeSocioPeriod = person.memberPeriods?.find(p => !p.resignationDate);
  const sortedDocuments = compliance?.documents?.slice().sort((a, b) => (b.signedAt || b.createdAt).localeCompare(a.signedAt || a.createdAt)) ?? [];

  const openRoleModal = (role?: any) => {
    setSelectedRoleId(role?.id ?? null);
    setRoleForm({
      roleType: role?.roleType ?? COMPLIANCE_ROLE_TYPES[0].value,
      startDate: role?.startDate ?? '',
      endDate: role?.endDate ?? '',
      notes: role?.notes ?? '',
    });
    setComplianceModal('role');
  };

  const openDocumentModal = (document?: any) => {
    setSelectedDocumentId(document?.id ?? null);
    setDocumentForm({
      documentType: document?.documentType ?? DOCUMENT_TYPES[0].value,
      version: document?.version ?? '',
      driveUrl: document?.driveUrl ?? '',
      signedAt: document?.signedAt ?? '',
      isCurrent: document?.isCurrent ?? true,
      isSigned: document?.isSigned ?? true,
      isDated: document?.isDated ?? false,
      isComplete: document?.isComplete ?? true,
      dataProcessingConsent: document?.dataProcessingConsent ?? false,
      thirdPartyCommunicationConsent: document?.thirdPartyCommunicationConsent ?? false,
      imageUseConsent: document?.imageUseConsent ?? false,
      notes: document?.notes ?? '',
    });
    setComplianceModal('document');
  };

  const openFlagModal = (documentId: string, flag?: any) => {
    setSelectedDocumentId(documentId);
    setSelectedFlagId(flag?.id ?? null);
    setFlagForm({ label: flag?.label ?? '', severity: flag?.severity ?? 'warning', note: flag?.note ?? '' });
    setComplianceModal('flag');
  };

  const openSuppressModal = (alertKey: string) => {
    setSelectedAlertKey(alertKey);
    setSuppressionForm({ reason: '', note: '' });
    setComplianceModal('suppress');
  };

  const closeComplianceModal = () => {
    setComplianceModal(null);
    setSelectedRoleId(null);
    setSelectedDocumentId(null);
    setSelectedFlagId(null);
    setSelectedAlertKey(null);
  };

  const handleSaveRole = async () => {
    const payload = {
      personId: id,
      roleType: roleForm.roleType,
      startDate: roleForm.startDate || null,
      endDate: roleForm.endDate || null,
      notes: roleForm.notes || null,
    };
    if (selectedRoleId) {
      await updateRole(selectedRoleId, payload);
    } else {
      await createRole(payload);
    }
    closeComplianceModal();
  };

  const handleSaveDocument = async () => {
    const payload = {
      personId: id,
      documentType: documentForm.documentType,
      version: documentForm.version || null,
      driveUrl: documentForm.driveUrl || null,
      signedAt: documentForm.signedAt || null,
      isCurrent: documentForm.isCurrent,
      isSigned: documentForm.isSigned,
      isDated: documentForm.isDated || Boolean(documentForm.signedAt),
      isComplete: documentForm.isComplete,
      dataProcessingConsent: documentForm.documentType === 'privacy' ? documentForm.dataProcessingConsent : null,
      thirdPartyCommunicationConsent: documentForm.documentType === 'privacy' ? documentForm.thirdPartyCommunicationConsent : null,
      imageUseConsent: documentForm.documentType === 'privacy' ? documentForm.imageUseConsent : null,
      notes: documentForm.notes || null,
    };
    if (selectedDocumentId) {
      await updateDocument(selectedDocumentId, payload);
    } else {
      await createDocument(payload);
    }
    closeComplianceModal();
  };

  const handleSaveFlag = async () => {
    if (!selectedDocumentId) return;
    const payload = {
      label: flagForm.label,
      severity: flagForm.severity,
      note: flagForm.note || null,
      isProblematic: true,
    };
    if (selectedFlagId) {
      await updateFlag(selectedFlagId, payload);
    } else {
      await createFlag(selectedDocumentId, payload);
    }
    closeComplianceModal();
  };

  const handleSuppress = async () => {
    if (!selectedAlertKey) return;
    await suppressAlert(selectedAlertKey, suppressionForm.reason, suppressionForm.note || undefined, undefined, id);
    closeComplianceModal();
  };

  const openDeletePersonModal = () => {
    setDeleteModal({
      isOpen: true,
      type: 'person',
      id: person.id,
      title: t('people.deletePerson'),
      message: t('people.deleteConfirmMessage', { defaultValue: 'Are you sure you want to delete this person? This action cannot be undone.' }),
      confirmPhrase: person.lastName,
      confirmValue: '',
      isLoading: false
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.type || !deleteModal.id) return;
    
    setDeleteModal(prev => ({ ...prev, isLoading: true }));
    try {
      if (deleteModal.type === 'person') {
        await deletePerson();
        navigate('/people');
      } else if (deleteModal.type === 'role') {
        await deleteRole(deleteModal.id);
      } else if (deleteModal.type === 'document') {
        await deleteDocument(deleteModal.id);
      } else if (deleteModal.type === 'flag') {
        await deleteFlag(deleteModal.id);
      }
      setDeleteModal(prev => ({ ...prev, isOpen: false }));
    } catch (err: any) {
      alert(err.message); // Display error to user
      console.error('Delete failed', err);
    } finally {
      setDeleteModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/people')} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <ArrowLeft size={24} className="text-slate-400" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">{person.firstName} {person.lastName}</h1>
            <div className="flex items-center space-x-2 mt-1">
               <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${activeVolPeriod ? 'bg-green-900/40 text-green-400 border border-green-800' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                 {activeVolPeriod ? t('nav.volunteers') : t('people.notVolunteer', { defaultValue: 'Not Volunteer' })}
               </span>
               <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${activeSocioPeriod ? 'bg-blue-900/40 text-blue-400 border border-blue-800' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                 {activeSocioPeriod ? t('nav.members') : t('people.notMember', { defaultValue: 'Not Member' })}
               </span>
            </div>
          </div>
        </div>
        <div className="flex space-x-3">
          {activeTab === 'profile' && !isEditing && (
            <div className="flex space-x-2">
              <button 
                onClick={openDeletePersonModal}
                className="bg-red-900/20 hover:bg-red-900/40 text-red-500 border border-red-900/50 px-3 py-2 rounded-lg flex items-center space-x-2 font-bold transition-all"
                title={t('people.deletePerson', { defaultValue: 'Delete Person' })}
              >
                <Trash2 size={16} />
              </button>
              <button onClick={() => { setEditForm({ ...person }); setIsEditing(true); }} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 font-bold transition-all">
                <Edit2 size={16} />
                <span>{t('people.editProfile', { defaultValue: 'Edit Profile' })}</span>
              </button>
            </div>
          )}
          {activeTab === 'profile' && isEditing && (
            <>
              <button onClick={() => setIsEditing(false)} className="bg-slate-800 text-slate-400 hover:text-white px-4 py-2 rounded-lg flex items-center space-x-2 font-bold transition-all border border-slate-700">
                <X size={16} />
                <span>{t('common.cancel')}</span>
              </button>
              <button onClick={handleSaveProfile} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2 font-bold transition-all shadow-lg shadow-blue-900/20">
                <Check size={16} />
                <span>{t('common.saveChanges', { defaultValue: 'Save Changes' })}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 w-fit">
         {[
           { id: 'profile', label: t('people.tabs.profile', { defaultValue: 'Profile' }), icon: User },
           { id: 'volunteer', label: t('people.tabs.volunteer', { defaultValue: 'Volunteering' }), icon: History },
           { id: 'member', label: t('people.tabs.member', { defaultValue: 'Membership' }), icon: ShieldCheck },
           { id: 'board', label: t('people.tabs.board', { defaultValue: 'Board' }), icon: Briefcase },
           { id: 'compliance', label: 'Compliance', icon: FileCheck }
         ].map(tab => (
           <button
             key={tab.id}
             onClick={() => setActiveTab(tab.id as any)}
             className={`flex items-center space-x-2 px-6 py-2 rounded-lg font-medium transition-all ${
               activeTab === tab.id ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
             }`}
           >
             <tab.icon size={18} />
             <span>{tab.label}</span>
           </button>
         ))}
      </div>

      {/* Tab Content */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl min-h-[400px]">
        {activeTab === 'profile' && (
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
                      <EditableField label={t('people.birthPlace', { defaultValue: 'Birth Place' })} value={editForm.birthPlace} onChange={(v: string) => handleEditChange('birthPlace', v)} />
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500 font-bold uppercase tracking-tighter">{t('people.gender', { defaultValue: 'Gender' })}</label>
                        <select value={editForm.gender || ''} onChange={e => handleEditChange('gender', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm">
                          <option value="">{t('common.select')}</option>
                          <option value="M">{t('people.genders.male', { defaultValue: 'Male' })}</option>
                          <option value="F">{t('people.genders.female', { defaultValue: 'Female' })}</option>
                          <option value="Other">{t('people.genders.other', { defaultValue: 'Other' })}</option>
                        </select>
                      </div>
                      <EditableField label={t('people.profession', { defaultValue: 'Profession' })} value={editForm.profession} onChange={(v: string) => handleEditChange('profession', v)} />
                      <EditableField label={t('people.matricola', { defaultValue: 'Matricola' })} value={editForm.memberNumber} onChange={(v: string) => handleEditChange('memberNumber', v)} mono />
                    </div>
                  </div>
                  <div className="space-y-6">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">{t('people.contacts')}</h3>
                    <div className="space-y-4">
                      <EditableField label="Email" value={editForm.email} onChange={(v: string) => handleEditChange('email', v)} type="email" />
                      <EditableField label={t('people.phone', { defaultValue: 'Phone' })} value={editForm.phone} onChange={(v: string) => handleEditChange('phone', v)} />
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500 font-bold uppercase tracking-tighter">{t('common.notes', { defaultValue: 'Notes' })}</label>
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
                       <InfoField label={t('people.taxId')} value={person.taxId} mono />
                       <InfoField label={t('people.birth', { defaultValue: 'Birth' })} value={person.birthDate ? `${new Date(person.birthDate).toLocaleDateString(i18n.language)} (${person.birthPlace || 'N/D'})` : 'N/D'} />
                       <InfoField label={t('people.gender')} value={person.gender} />
                       <InfoField label={t('people.profession')} value={person.profession} />
                       <InfoField label={t('people.matricola')} value={person.memberNumber} mono />
                    </div>
                  </div>
                  <div className="space-y-6">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">{t('people.contacts')}</h3>
                    <div className="space-y-4">
                       <InfoField label="Email" value={person.email} />
                       <InfoField label={t('people.phone')} value={person.phone} />
                       <InfoField label={t('common.notes')} value={person.notes} />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'volunteer' && (
          <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                <History className="text-blue-400" />
                <span>{t('people.volunteerHistory', { defaultValue: 'Volunteer History' })}</span>
              </h3>
              {!activeVolPeriod ? (
                <button 
                  onClick={() => {
                    setModalDate(new Date().toISOString().split('T')[0]);
                    setModalType('vol_start');
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2 font-bold transition-all"
                >
                  <PlusCircle size={18} />
                  <span>{t('people.newPeriod', { defaultValue: 'New Period' })}</span>
                </button>
              ) : (
                <button 
                  onClick={() => {
                    setModalDate(new Date().toISOString().split('T')[0]);
                    setModalType('vol_end');
                  }}
                  className="bg-red-600/20 hover:bg-red-600/30 text-red-500 border border-red-900/50 px-4 py-2 rounded-lg flex items-center space-x-2 font-bold transition-all"
                >
                  <UserMinus size={18} />
                  <span>{t('people.closePeriod', { defaultValue: 'Close Period' })}</span>
                </button>
              )}
            </div>

            <div className="space-y-4 mt-6">
              {person.volunteerPeriods?.map(p => (
                <div key={p.id} className="border border-slate-800 bg-slate-950/50 p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                     <div className={`p-2 rounded-lg ${!p.exitDate ? 'bg-green-900/30 text-green-400' : 'bg-slate-800 text-slate-500'}`}>
                        {!p.exitDate ? <UserCheck size={20} /> : <History size={20} />}
                     </div>
                     <div>
                        <div className="font-bold text-white">{!p.exitDate ? t('people.activePeriod', { defaultValue: 'Active Period' }) : t('people.concludedPeriod', { defaultValue: 'Concluded Period' })}</div>
                        <div className="text-sm text-slate-400">
                          {new Date(p.enrollmentDate).toLocaleDateString(i18n.language)} 
                          {p.exitDate ? ` → ${new Date(p.exitDate).toLocaleDateString(i18n.language)}` : ` → ${t('common.today')}`}
                        </div>
                     </div>
                  </div>
                  {p.exitReason && (
                    <div className="text-xs text-slate-500 italic">{t('people.reason', { defaultValue: 'Reason' })}: {p.exitReason}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'member' && (
          <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                <ShieldCheck className="text-blue-400" />
                <span>{t('people.membershipHistory', { defaultValue: 'Membership History' })}</span>
              </h3>
              {!activeSocioPeriod ? (
                <button 
                  onClick={() => {
                    if (!activeVolPeriod) {
                      alert(t('people.alerts.needActiveVolunteer', { defaultValue: 'The person must have an active volunteer period to be admitted as a member.' }));
                      return;
                    }
                    setModalDate(new Date().toISOString().split('T')[0]);
                    setModalType('soc_start');
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!activeVolPeriod ? t('people.alerts.needActiveVolunteer') : undefined}
                  disabled={!activeVolPeriod}
                >
                  <PlusCircle size={18} />
                  <span>{t('people.newAdmission', { defaultValue: 'New Admission' })}</span>
                </button>
              ) : (
                <button 
                  onClick={() => {
                    setModalDate(new Date().toISOString().split('T')[0]);
                    setModalType('soc_end');
                  }}
                  className="bg-red-600/20 hover:bg-red-600/30 text-red-500 border border-red-900/50 px-4 py-2 rounded-lg flex items-center space-x-2 font-bold transition-all"
                >
                  <UserMinus size={18} />
                  <span>{t('people.registerResignation', { defaultValue: 'Register Resignation' })}</span>
                </button>
              )}
            </div>

            <div className="space-y-4 mt-6">
              {person.memberPeriods?.map(p => (
                <div key={p.id} className="border border-slate-800 bg-slate-950/50 p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                     <div className={`p-2 rounded-lg ${!p.resignationDate ? 'bg-blue-900/30 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
                        {!p.resignationDate ? <ShieldCheck size={20} /> : <History size={20} />}
                     </div>
                     <div>
                        <div className="font-bold text-white">{!p.resignationDate ? t('people.activeMember', { defaultValue: 'Active Member' }) : t('people.resignedMember', { defaultValue: 'Resigned Member' })}</div>
                        <div className="text-sm text-slate-400">
                          {new Date(p.admissionDate).toLocaleDateString(i18n.language)} 
                          {p.resignationDate ? ` → ${new Date(p.resignationDate).toLocaleDateString(i18n.language)}` : ` → ${t('common.today')}`}
                        </div>
                     </div>
                  </div>
                  {p.exitReason && (
                    <div className="text-xs text-slate-500 italic">{t('people.reason')}: {p.exitReason}</div>
                  )}
                </div>
              ))}
              {(!person.memberPeriods || person.memberPeriods.length === 0) && (
                <div className="text-center py-12 text-slate-500 italic">
                  {t('people.noMemberRecords', { defaultValue: 'No member records for this person.' })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'board' && (
          <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                <Briefcase className="text-blue-400" />
                <span>{t('people.boardHistory', { defaultValue: 'Board History' })}</span>
              </h3>
            </div>

            <div className="space-y-4 mt-6">
              {person.boardRoles?.slice().sort((a, b) => new Date(b.generation.startDate).getTime() - new Date(a.generation.startDate).getTime()).map(role => (
                <div key={role.member.id} className="border border-slate-800 bg-slate-950/50 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                     <div className="p-2 rounded-lg bg-blue-900/10 text-blue-400 border border-blue-900/50">
                        <Briefcase size={20} />
                     </div>
                     <div>
                        <div className="font-bold text-white text-lg flex items-center space-x-2">
                           <span>{role.member.role}</span>
                        </div>
                        <div className="text-sm text-slate-400 mt-0.5">
                          {t('people.mandate', { defaultValue: 'Mandate' })}: <span className="text-slate-300 font-medium">{role.generation.name}</span> ({new Date(role.generation.startDate).toISOString().split('T')[0]}{role.generation.endDate ? ` → ${new Date(role.generation.endDate).toISOString().split('T')[0]}` : ` → ${t('people.inProgress', { defaultValue: 'In Progress' })}`})
                        </div>
                     </div>
                  </div>
                  {role.member.notes && (
                    <div className="text-xs text-slate-400 bg-slate-900 p-2 rounded-lg border border-slate-800 self-start md:self-center">
                      <span className="font-bold text-slate-500 mr-1">{t('common.notes')}:</span> {role.member.notes}
                    </div>
                  )}
                </div>
              ))}
              {(!person.boardRoles || person.boardRoles.length === 0) && (
                <div className="text-center py-12 text-slate-500 italic flex flex-col items-center justify-center space-y-3">
                  <Briefcase size={32} className="opacity-20" />
                  <p>{t('people.noBoardHistory', { defaultValue: 'This person has never been part of the Board.' })}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'compliance' && (
          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="border border-slate-800 rounded-xl p-5 bg-slate-950/40 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">{t('people.complianceRoles', { defaultValue: 'Compliance Roles' })}</h3>
                    <p className="text-sm text-slate-400 mt-1">{t('people.complianceRolesSubtitle', { defaultValue: 'Roles that determine NDA and document checks.' })}</p>
                  </div>
                  <button onClick={() => openRoleModal()} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-semibold">
                    {t('people.addRole', { defaultValue: 'Add Role' })}
                  </button>
                </div>

                <div className="space-y-3">
                  {compliance?.roles?.length ? compliance.roles.map((role) => (
                    <div key={role.id} className="border border-slate-800 rounded-lg p-4 flex items-start justify-between gap-4">
                      <div>
                        <div className="font-semibold text-white">{role.label}</div>
                        <div className="text-sm text-slate-400">
                          {role.startDate || 'N/D'}{role.endDate ? ` -> ${role.endDate}` : ' -> in corso'}
                        </div>
                        {role.notes && <div className="text-xs text-slate-500 mt-1">{role.notes}</div>}
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => openRoleModal(role)} className="text-blue-300 hover:text-blue-200 text-sm">
                          {t('common.edit')}
                        </button>
                        <button 
                          onClick={() => setDeleteModal({
                            isOpen: true,
                            type: 'role',
                            id: role.id,
                            title: t('people.deleteRole', { defaultValue: 'Delete Role' }),
                            message: t('people.deleteRoleConfirm', { defaultValue: 'Are you sure you want to delete this role?' }),
                            confirmPhrase: 'DELETE',
                            confirmValue: '',
                            isLoading: false
                          })} 
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          {t('common.delete')}
                        </button>
                      </div>
                    </div>
                  )) : (
                    <div className="text-sm text-slate-500 italic">{t('people.noComplianceRoles', { defaultValue: 'No compliance roles registered.' })}</div>
                  )}
                </div>
              </div>

              <div className="border border-slate-800 rounded-xl p-5 bg-slate-950/40 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">{t('people.currentPrivacy', { defaultValue: 'Current Privacy' })}</h3>
                    <p className="text-sm text-slate-400 mt-1">{t('people.currentPrivacySubtitle', { defaultValue: 'Currently valid privacy version and consents.' })}</p>
                  </div>
                </div>

                {compliance?.privacyStatus ? (
                  <div className="space-y-3">
                    <div className="text-white font-semibold">{t('people.version')}: {compliance.privacyStatus.version || 'N/D'}</div>
                    <ConsentRow label={t('people.consents.dataTreatment', { defaultValue: 'Data Treatment' })} value={compliance.privacyStatus.dataProcessingConsent} />
                    <ConsentRow label={t('people.consents.thirdPartyCommunication', { defaultValue: 'Communication to Third Parties' })} value={compliance.privacyStatus.thirdPartyCommunicationConsent} />
                    <ConsentRow label={t('people.consents.imageUsage', { defaultValue: 'Image Usage' })} value={compliance.privacyStatus.imageUseConsent} />
                    {compliance.privacyStatus.driveUrl && (
                      <a href={compliance.privacyStatus.driveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200">
                        {t('people.openDriveLink', { defaultValue: 'Open Drive link' })} <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500 italic">{t('people.noCurrentPrivacy', { defaultValue: 'No current privacy document.' })}</div>
                )}
              </div>
            </div>

            <div className="border border-slate-800 rounded-xl p-5 bg-slate-950/40 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{t('people.documents', { defaultValue: 'Documents' })}</h3>
                  <p className="text-sm text-slate-400 mt-1">{t('people.documentsSubtitle', { defaultValue: 'NDAs, privacy, enrollment and membership forms.' })}</p>
                </div>
                <button onClick={() => openDocumentModal()} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-semibold">
                  {t('people.addDocument', { defaultValue: 'Add Document' })}
                </button>
              </div>

              <div className="space-y-4">
                {sortedDocuments.length ? sortedDocuments.map((document) => (
                  <div key={document.id} className="border border-slate-800 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="font-semibold text-white">{DOCUMENT_TYPES.find((item) => item.value === document.documentType)?.label || document.documentType}</div>
                        <div className="text-sm text-slate-400">
                          {t('people.version')}: {document.version || 'N/D'} | {t('people.signed')}: {document.signedAt || 'N/D'} | {t('people.current')}: {document.isCurrent ? t('common.yes') : t('common.no')}
                        </div>
                        <div className="text-sm text-slate-500">
                          {t('people.isSigned')}: {document.isSigned ? t('common.yes') : t('common.no')} | {t('people.isDated')}: {document.isDated ? t('common.yes') : t('common.no')} | {t('people.isComplete')}: {document.isComplete ? t('common.yes') : t('common.no')}
                        </div>
                        {document.driveUrl && (
                          <a href={document.driveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200">
                            {t('people.openDriveLink')} <ExternalLink size={14} />
                          </a>
                        )}
                        {document.notes && <div className="text-xs text-slate-500">{document.notes}</div>}
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => openDocumentModal(document)} className="text-sm text-blue-300 hover:text-blue-200">
                          {t('common.edit')}
                        </button>
                        <button onClick={() => openFlagModal(document.id)} className="text-sm text-amber-300 hover:text-amber-200">
                          Flag
                        </button>
                        <button onClick={() => deleteDocument(document.id)} className="text-sm text-red-400 hover:text-red-300">
                          {t('common.delete')}
                        </button>
                      </div>
                    </div>

                    {document.flags.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {document.flags.map((flag) => (
                          <div key={flag.id} className="text-sm border border-slate-800 bg-slate-900/60 rounded-lg px-3 py-2 text-slate-300">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <span className="font-semibold text-white">{flag.label}</span>
                                <span className="text-slate-500"> ({flag.severity})</span>
                                {flag.note ? ` - ${flag.note}` : ''}
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <button onClick={() => openFlagModal(document.id, flag)} className="text-blue-300 hover:text-blue-200">
                                  {t('common.edit')}
                                </button>
                                <button onClick={() => deleteFlag(flag.id)} className="text-red-400 hover:text-red-300">
                                  {t('common.delete')}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )) : (
                  <div className="text-sm text-slate-500 italic">{t('people.noDocuments', { defaultValue: 'No documents registered.' })}</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="border border-slate-800 rounded-xl p-5 bg-slate-950/40 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">{t('people.activeAlerts', { defaultValue: 'Active Alerts' })}</h3>
                    <p className="text-sm text-slate-400 mt-1">{t('people.activeAlertsSubtitle', { defaultValue: 'Current issues with data or documents.' })}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {compliance?.alerts?.length ? compliance.alerts.map((alert) => (
                    <div key={alert.key} className="border border-amber-900/50 bg-amber-950/20 rounded-lg p-4">
                      <div className="font-semibold text-white">{alert.title}</div>
                      <div className="text-sm text-amber-100/80 mt-1">{alert.description}</div>
                      <button onClick={() => openSuppressModal(alert.key)} className="mt-3 text-sm text-amber-300 hover:text-amber-200">
                        {t('people.suppress', { defaultValue: 'Suppress' })}
                      </button>
                    </div>
                  )) : (
                    <div className="text-sm text-slate-500 italic">{t('people.noActiveAlerts', { defaultValue: 'No active alerts.' })}</div>
                  )}
                </div>
              </div>

              <div className="border border-slate-800 rounded-xl p-5 bg-slate-950/40 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">{t('people.suppressedAlerts', { defaultValue: 'Suppressed Alerts' })}</h3>
                    <p className="text-sm text-slate-400 mt-1">{t('people.suppressedAlertsSubtitle', { defaultValue: 'Known issues temporarily excluded from the active view.' })}</p>
                  </div>
                  <BellOff className="text-slate-500" size={18} />
                </div>

                <div className="space-y-3">
                  {compliance?.suppressedAlerts?.length ? compliance.suppressedAlerts.map((alert) => (
                    <div key={alert.key} className="border border-slate-800 bg-slate-900/60 rounded-lg p-4">
                      <div className="font-semibold text-white">{alert.title}</div>
                      <div className="text-sm text-slate-400 mt-1">{alert.description}</div>
                      <div className="text-xs text-slate-500 mt-2">
                        {alert.suppression?.reason}
                        {alert.suppression?.note ? ` - ${alert.suppression.note}` : ''}
                      </div>
                      {alert.suppression && (
                        <button onClick={() => releaseSuppression(alert.suppression!.id)} className="mt-3 text-sm text-blue-300 hover:text-blue-200">
                          {t('people.reactivate', { defaultValue: 'Reactivate' })}
                        </button>
                      )}
                    </div>
                  )) : (
                    <div className="text-sm text-slate-500 italic">{t('people.noSuppressedAlerts', { defaultValue: 'No suppressed alerts.' })}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {modalType && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                {modalType === 'vol_start' && t('people.newVolunteerPeriod', { defaultValue: 'New Volunteer Period' })}
                {modalType === 'vol_end' && t('people.closeVolunteerPeriod', { defaultValue: 'Close Volunteer Period' })}
                {modalType === 'soc_start' && t('people.newMemberAdmission', { defaultValue: 'New Member Admission' })}
                {modalType === 'soc_end' && t('people.registerResignation', { defaultValue: 'Register Resignation' })}
              </h3>
              <button
                onClick={() => setModalType(null)}
                className="p-1 rounded-full hover:bg-slate-800 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide">
                  {t('common.date')}
                </label>
                <input
                  type="date"
                  value={modalDate}
                  onChange={(e) => setModalDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setModalType(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-700"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={async () => {
                  if (!modalDate) return;
                  if (modalType === 'vol_start') {
                    await startVolunteering({ enrollmentDate: modalDate });
                    await refresh();
                    await refreshCompliance();
                  } else if (modalType === 'vol_end' && activeVolPeriod) {
                    await endVolunteering(activeVolPeriod.id, { exitDate: modalDate, exitReason: 'resignation' });
                    await refresh();
                    await refreshCompliance();
                  } else if (modalType === 'soc_start' && activeVolPeriod) {
                    await startMembership({ admissionDate: modalDate, volunteerPeriodId: activeVolPeriod.id });
                    await refresh();
                    await refreshCompliance();
                  } else if (modalType === 'soc_end' && activeSocioPeriod) {
                    await endMembership(activeSocioPeriod.id, { resignationDate: modalDate, exitReason: 'resignation' });
                    await refresh();
                    await refreshCompliance();
                  }
                  setModalType(null);
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-900/30"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {complianceModal === 'role' && (
        <OverlayModal title={selectedRoleId ? t('people.editRole', { defaultValue: 'Edit Role' }) : t('people.addRole')} onClose={closeComplianceModal} onConfirm={handleSaveRole} confirmLabel={selectedRoleId ? t('common.saveChanges') : t('common.save')}>
          <ModalField label={t('people.role', { defaultValue: 'Role' })}>
            <select
              value={roleForm.roleType}
              onChange={(e) => setRoleForm((prev: any) => ({ ...prev, roleType: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
            >
              {COMPLIANCE_ROLE_TYPES.map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </ModalField>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ModalField label={t('common.startDate', { defaultValue: 'Start Date' })}>
              <input type="date" value={roleForm.startDate} onChange={e => setRoleForm(prev => ({ ...prev, startDate: e.target.value }))} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
            </ModalField>
            <ModalField label={t('common.endDate', { defaultValue: 'End Date' })}>
              <input type="date" value={roleForm.endDate} onChange={e => setRoleForm(prev => ({ ...prev, endDate: e.target.value }))} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
            </ModalField>
          </div>
          <ModalField label={t('common.notes')}>
            <textarea value={roleForm.notes} onChange={e => setRoleForm(prev => ({ ...prev, notes: e.target.value }))} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm min-h-[80px]" />
          </ModalField>
        </OverlayModal>
      )}

      {complianceModal === 'document' && (
        <OverlayModal title={selectedDocumentId ? t('people.editDocument', { defaultValue: 'Edit Document' }) : t('people.addDocument')} onClose={closeComplianceModal} onConfirm={handleSaveDocument} confirmLabel={selectedDocumentId ? t('common.saveChanges') : t('common.save')}>
          <ModalField label={t('people.documentType', { defaultValue: 'Document Type' })}>
            <select
              value={documentForm.documentType}
              onChange={(e) => setDocumentForm((prev: any) => ({ ...prev, documentType: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
            >
              {DOCUMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </ModalField>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <ModalField label={t('people.version')}>
               <input value={documentForm.version} onChange={e => setDocumentForm(prev => ({ ...prev, version: e.target.value }))} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
             </ModalField>
             <ModalField label={t('people.signedAt', { defaultValue: 'Signed At' })}>
               <input type="date" value={documentForm.signedAt} onChange={e => setDocumentForm(prev => ({ ...prev, signedAt: e.target.value }))} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
             </ModalField>
          </div>
          <ModalField label={t('people.driveUrl', { defaultValue: 'Drive URL' })}>
            <input value={documentForm.driveUrl} onChange={e => setDocumentForm(prev => ({ ...prev, driveUrl: e.target.value }))} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
          </ModalField>
          
          <div className="grid grid-cols-2 gap-4 py-2">
            <CheckboxField label={t('people.isCurrent')} checked={documentForm.isCurrent} onChange={(v: boolean) => setDocumentForm((prev: any) => ({ ...prev, isCurrent: v }))} />
            <CheckboxField label={t('people.isSigned')} checked={documentForm.isSigned} onChange={(v: boolean) => setDocumentForm((prev: any) => ({ ...prev, isSigned: v }))} />
            <CheckboxField label={t('people.isDated')} checked={documentForm.isDated} onChange={(v: boolean) => setDocumentForm((prev: any) => ({ ...prev, isDated: v }))} />
            <CheckboxField label={t('people.isComplete')} checked={documentForm.isComplete} onChange={(v: boolean) => setDocumentForm((prev: any) => ({ ...prev, isComplete: v }))} />
          </div>

          {documentForm.documentType === 'privacy' && (
            <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/30 space-y-3 mt-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase">{t('people.consents.title', { defaultValue: 'Consents' })}</h4>
              <CheckboxField label={t('people.consents.dataTreatment')} checked={documentForm.dataProcessingConsent} onChange={(v: boolean) => setDocumentForm((prev: any) => ({ ...prev, dataProcessingConsent: v }))} />
              <CheckboxField label={t('people.consents.thirdPartyCommunication')} checked={documentForm.thirdPartyCommunicationConsent} onChange={(v: boolean) => setDocumentForm((prev: any) => ({ ...prev, thirdPartyCommunicationConsent: v }))} />
              <CheckboxField label={t('people.consents.imageUsage')} checked={documentForm.imageUseConsent} onChange={(v: boolean) => setDocumentForm((prev: any) => ({ ...prev, imageUseConsent: v }))} />
            </div>
          )}

          <ModalField label={t('common.notes')}>
            <textarea value={documentForm.notes} onChange={e => setDocumentForm(prev => ({ ...prev, notes: e.target.value }))} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm min-h-[60px]" />
          </ModalField>
        </OverlayModal>
      )}

      {complianceModal === 'flag' && (
        <OverlayModal title={selectedFlagId ? t('people.editFlag', { defaultValue: 'Edit Flag' }) : t('people.addFlag', { defaultValue: 'Add Flag' })} onClose={closeComplianceModal} onConfirm={handleSaveFlag} confirmLabel={selectedFlagId ? t('common.saveChanges') : t('common.save')}>
          <ModalField label={t('common.label')}>
            <input value={flagForm.label} onChange={e => setFlagForm(prev => ({ ...prev, label: e.target.value }))} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
          </ModalField>
          <ModalField label={t('people.severity', { defaultValue: 'Severity' })}>
            <select value={flagForm.severity} onChange={e => setFlagForm((prev: any) => ({ ...prev, severity: e.target.value }))} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm">
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </ModalField>
          <ModalField label={t('common.notes')}>
            <textarea value={flagForm.note} onChange={e => setFlagForm(prev => ({ ...prev, note: e.target.value }))} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm min-h-[60px]" />
          </ModalField>
        </OverlayModal>
      )}

      {complianceModal === 'suppress' && (
        <OverlayModal title={t('people.suppressAlert', { defaultValue: 'Suppress Alert' })} onClose={closeComplianceModal} onConfirm={handleSuppress} confirmLabel={t('people.suppress')}>
          <ModalField label={t('people.reason')}>
            <input value={suppressionForm.reason} onChange={e => setSuppressionForm(prev => ({ ...prev, reason: e.target.value }))} placeholder="E.g., Missing document but expected soon" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
          </ModalField>
          <ModalField label={t('common.notes')}>
            <textarea value={suppressionForm.note} onChange={e => setSuppressionForm(prev => ({ ...prev, note: e.target.value }))} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm min-h-[60px]" />
          </ModalField>
        </OverlayModal>
      )}

      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onCancel={() => setDeleteModal((prev: any) => ({ ...prev, isOpen: false }))}
        onConfirm={handleDeleteConfirm}
        title={deleteModal.title}
        description={deleteModal.message}
        expectedText={deleteModal.confirmPhrase}
        value={deleteModal.confirmValue}
        onChange={(v: string) => setDeleteModal((prev: any) => ({ ...prev, confirmValue: v }))}
        isSubmitting={deleteModal.isLoading}
      />
    </div>
  );
};

const EditableField = ({ label, value, onChange, type = 'text', mono = false, uppercase = false }: any) => (
  <div className="space-y-1">
    <label className="text-xs text-slate-500 font-bold uppercase tracking-tighter">{label}</label>
    <input
      type={type}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      className={`w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none ${mono ? 'font-mono' : ''} ${uppercase ? 'uppercase' : ''}`}
    />
  </div>
);

const InfoField = ({ label, value, mono = false }: any) => (
  <div className="space-y-0.5">
    <div className="text-xs text-slate-500 font-bold uppercase tracking-tighter">{label}</div>
    <div className={`text-slate-200 ${mono ? 'font-mono' : ''}`}>{value || 'N/D'}</div>
  </div>
);

const ConsentRow = ({ label, value }: { label: string; value: boolean | null }) => (
  <div className="flex items-center justify-between text-sm py-1 border-b border-slate-900 last:border-0">
    <span className="text-slate-400">{label}</span>
    <span className={value ? 'text-green-400' : 'text-red-400'}>{value ? 'Concesso' : 'Negato'}</span>
  </div>
);

const OverlayModal = ({ title, children, onClose, onConfirm, confirmLabel }: { title: string; children: ReactNode; onClose: () => void; onConfirm: () => void; confirmLabel: string }) => (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">{title}</h3>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-800 text-slate-400">
          <X size={20} />
        </button>
      </div>
      <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
        {children}
      </div>
      <div className="p-6 border-t border-slate-800 flex justify-end gap-3 bg-slate-950/20">
        <button onClick={onClose} className="px-5 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 hover:text-white transition-all">
          Annulla
        </button>
        <button onClick={onConfirm} className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 shadow-lg shadow-blue-900/30 transition-all">
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

const ModalField = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</label>
    {children}
  </div>
);

const CheckboxField = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <label className="flex items-center gap-3 cursor-pointer group select-none">
    <div onClick={() => onChange(!checked)} className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${checked ? 'bg-blue-600 border-blue-500' : 'bg-slate-950 border-slate-700 group-hover:border-slate-500'}`}>
      {checked && <Check size={14} className="text-white" />}
    </div>
    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{label}</span>
  </label>
);

export default PersonaDetails;
