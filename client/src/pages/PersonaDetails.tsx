import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { PERMISSIONS } from '../lib/permissions';
import { usePerson } from '../hooks/usePerson';
import { usePeriods } from '../hooks/usePeriods';
import { useCompliance } from '../hooks/useCompliance';
import { useBranding } from '../hooks/useBranding';
import {
  ArrowLeft, User, History, ShieldCheck, Briefcase, FileCheck,
  AlertCircle, Edit2, Check, Trash2, UserPlus
} from 'lucide-react';
import CreateUserForPersonModal from '../components/people/CreateUserForPersonModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import PersonNameTag from '../components/PersonNameTag';
import ProfileTab from '../components/people/tabs/ProfileTab';
import VolunteerTab from '../components/people/tabs/VolunteerTab';
import MemberTab from '../components/people/tabs/MemberTab';
import BoardTab from '../components/people/tabs/BoardTab';
import ComplianceTab from '../components/people/tabs/ComplianceTab';

const PersonaDetails = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { branding } = useBranding();
  const canEdit = hasPermission(PERMISSIONS.peopleEdit);
  const canCreateUser = hasPermission(PERMISSIONS.settingsUsersManage);
  const { person, loading, error, refresh, deletePerson } = usePerson(id!);
  const {
    startVolunteering, endVolunteering, updateVolunteerPeriod, deleteVolunteerPeriod,
    startMembership, endMembership, updateMemberPeriod, deleteMemberPeriod
  } = usePeriods(id!);
  const {
    personData: compliance, rules, refresh: refreshCompliance,
    createRole, updateRole, deleteRole,
    createDocument, updateDocument, deleteDocument,
    createFlag, updateFlag, deleteFlag,
    suppressAlert, releaseSuppression
  } = useCompliance(id);

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as 'profile' | 'volunteer' | 'member' | 'board' | 'compliance') || 'profile';

  const setActiveTab = (tab: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', tab);
    setSearchParams(nextParams, { replace: true });
  };

  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'person' | 'role' | 'document' | 'flag' | 'suppression' | 'volunteer_period' | 'member_period' | null;
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

  const openDeletePersonModal = () => {
    setDeleteModal({
      isOpen: true,
      type: 'person',
      id: id ?? null,
      title: t('people.deletePerson', { defaultValue: 'Delete Person' }),
      message: t('people.deletePersonConfirm', { defaultValue: 'Are you sure? This cannot be undone.' }),
      confirmPhrase: t('people.firstName', { defaultValue: person?.firstName || 'Confirm' }),
      confirmValue: '',
      isLoading: false
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.confirmValue) return;
    setDeleteModal(prev => ({ ...prev, isLoading: true }));
    try {
      if (deleteModal.type === 'person') {
        await deletePerson();
        navigate('/people');
      } else if (deleteModal.type === 'volunteer_period' && deleteModal.id) {
        await deleteVolunteerPeriod(deleteModal.id);
        await refresh();
      } else if (deleteModal.type === 'member_period' && deleteModal.id) {
        await deleteMemberPeriod(deleteModal.id);
        await refresh();
      } else if (deleteModal.type === 'role' && deleteModal.id) {
        await deleteRole(deleteModal.id);
        await refreshCompliance();
      } else if (deleteModal.type === 'document' && deleteModal.id) {
        await deleteDocument(deleteModal.id);
        await refreshCompliance();
      } else if (deleteModal.type === 'flag' && deleteModal.id) {
        await deleteFlag(deleteModal.id);
        await refreshCompliance();
      } else if (deleteModal.type === 'suppression' && deleteModal.id) {
        await axios.delete(`${API_BASE_URL}/people/${id}/suppressions/${deleteModal.id}`);
        await refreshCompliance();
      }
      setDeleteModal(prev => ({ ...prev, isOpen: false }));
    } catch (err: any) {
      alert(err.message);
      console.error('Delete failed', err);
    } finally {
      setDeleteModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 text-slate-500">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p>{t('common.status.loadingDetails', { defaultValue: 'Loading details...' })}</p>
    </div>
  );

  if (error || !person) return (
    <div className="bg-red-900/20 border border-red-900 text-red-400 p-6 rounded-xl flex items-center space-x-4">
      <AlertCircle size={32} />
      <div>
        <h3 className="font-bold text-lg">{t('common.status.error')}</h3>
        <p>{error || t('people.notFound', { defaultValue: 'Person not found.' })}</p>
        <button onClick={() => navigate('/people')} className="mt-2 text-sm underline">{t('common.actions.backToList', { defaultValue: 'Back to list' })}</button>
      </div>
    </div>
  );

  const activeVolPeriod = person.volunteerPeriods?.find(p => !p.exitDate);
  const activeSocioPeriod = person.memberPeriods?.find(p => !p.resignationDate);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/people')} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <ArrowLeft size={24} className="text-slate-400" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <PersonNameTag name={`${person.firstName} ${person.lastName}`} isPresumedNonExistent={person.isPresumedNonExistent} />
            </h1>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${activeVolPeriod ? 'bg-green-900/40 text-green-400 border border-green-800' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                {activeVolPeriod ? t('people.volunteer') : t('people.notVolunteer', { defaultValue: 'people.notVolunteer' })}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${activeSocioPeriod ? 'bg-blue-900/40 text-blue-400 border border-blue-800' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                {activeSocioPeriod ? t('people.member') : t('people.notMember', { defaultValue: 'people.notMember' })}
              </span>
            </div>
          </div>
        </div>
        <div className="flex space-x-3">
          {canEdit && activeTab === 'profile' && !isProfileEditing && (
            <div className="flex space-x-2">
              <button
                onClick={openDeletePersonModal}
                className="bg-red-900/20 hover:bg-red-900/40 text-red-500 border border-red-900/50 px-3 py-2 rounded-lg flex items-center space-x-2 font-bold transition-all"
                title={t('people.deletePerson', { defaultValue: 'Delete Person' })}
              >
                <Trash2 size={16} />
              </button>
              {canCreateUser && !person?.userId && (
                <button
                  onClick={() => setShowCreateUserModal(true)}
                  className="bg-purple-900/20 hover:bg-purple-900/40 text-purple-400 border border-purple-900/50 px-4 py-2 rounded-lg flex items-center space-x-2 font-bold transition-all"
                  title="Create user account for this person"
                >
                  <UserPlus size={16} />
                  <span>Crea Account</span>
                </button>
              )}
              <button onClick={() => setIsProfileEditing(true)} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 font-bold transition-all">
                <Edit2 size={16} />
                <span>{t('common.actions.editProfile', { defaultValue: 'Edit Profile' })}</span>
              </button>
            </div>
          )}
          {canEdit && activeTab === 'profile' && isProfileEditing && (
            <div className="flex space-x-2">
              <button
                onClick={() => setIsProfileEditing(false)}
                className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-bold transition-all"
              >
                {t('common.actions.cancel')}
              </button>
              <button
                onClick={() => setIsProfileEditing(false)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2 font-bold transition-all"
              >
                <Check size={16} />
                <span>{t('common.actions.save')}</span>
              </button>
            </div>
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
          { id: 'compliance', label: t('nav.compliance', { defaultValue: 'Compliance' }), icon: FileCheck }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-6 py-2 rounded-lg font-medium transition-all ${activeTab === tab.id ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <tab.icon size={18} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl min-h-[400px]">
        {activeTab === 'profile' && person && (
          <ProfileTab
            person={person as any}
            compliance={compliance ?? undefined}
            canEdit={canEdit}
            refresh={refresh}
            onRequestDeleteRole={(roleId: string) => setDeleteModal({
              isOpen: true,
              type: 'role',
              id: roleId,
              title: t('people.deleteRole'),
              message: t('people.deleteRoleConfirm'),
              confirmPhrase: 'DELETE',
              confirmValue: '',
              isLoading: false
            })}
            onRequestEditRole={(role?: any) => setDeleteModal({
              isOpen: true,
              type: 'role',
              id: role?.id || null,
              title: t('people.editRole'),
              message: t('people.editRoleConfirm'),
              confirmPhrase: 'EDIT',
              confirmValue: '',
              isLoading: false
            })}
          />
        )}

        {activeTab === 'volunteer' && person && (
          <VolunteerTab
            id={id!}
            person={person as any}
            canEdit={canEdit}
            startVolunteering={startVolunteering}
            endVolunteering={endVolunteering}
            updateVolunteerPeriod={updateVolunteerPeriod}
            refresh={refresh}
            refreshCompliance={refreshCompliance}
            onRequestDelete={(config) => setDeleteModal({ ...config, isOpen: true })}
          />
        )}

        {activeTab === 'member' && person && (
          <MemberTab
            person={person as any}
            canEdit={canEdit}
            startMembership={startMembership}
            endMembership={endMembership}
            updateMemberPeriod={updateMemberPeriod}
            refresh={refresh}
            refreshCompliance={refreshCompliance}
            onRequestDelete={(config) => setDeleteModal({ ...config, isOpen: true })}
          />
        )}

        {activeTab === 'board' && person && (
          <BoardTab person={person as any} />
        )}

        {activeTab === 'compliance' && (
          <ComplianceTab
            compliance={compliance ?? undefined}
            rules={rules ?? undefined}
            id={id!}
            canEdit={canEdit}
            createRole={createRole}
            updateRole={updateRole}
            createDocument={createDocument}
            updateDocument={updateDocument}
            createFlag={async (data: any) => {
              const { documentId, ...flagData } = data;
              if (documentId) {
                await createFlag(documentId, flagData);
              }
            }}
            updateFlag={updateFlag}
            suppressAlert={async (data: any) => {
              await suppressAlert(data.alertKey, data.reason, data.note, data.untilDate, data.personId || id);
            }}
            releaseSuppression={releaseSuppression}
            refreshCompliance={refreshCompliance}
            onRequestDelete={(config) => setDeleteModal({ ...config, isOpen: true })}
          />
        )}
      </div>

      {/* Create User Modal */}
      {showCreateUserModal && person && (
        <CreateUserForPersonModal
          personId={person.id}
          firstName={person.firstName}
          lastName={person.lastName}
          authDomain={branding?.authDomain}
          onSuccess={refresh}
          onClose={() => setShowCreateUserModal(false)}
        />
      )}

      {/* Delete Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        title={deleteModal.title}
        description={deleteModal.message}
        expectedText={deleteModal.confirmPhrase}
        value={deleteModal.confirmValue}
        onChange={(val: string) => setDeleteModal(prev => ({ ...prev, confirmValue: val }))}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
        isSubmitting={deleteModal.isLoading}
      />
    </div>
  );
};

export default PersonaDetails;
