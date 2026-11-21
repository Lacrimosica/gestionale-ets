import type { DeleteRequest } from '../types/delete-request';
import type { ComplianceRole } from '../hooks/useCompliance';

type TabId = 'profile' | 'volunteer' | 'member' | 'board' | 'compliance';
import { errorMessage } from '../lib/api-error';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/auth-context';
import { PERMISSIONS } from '../lib/permissions';
import { usePerson } from '../hooks/usePerson';
import { usePeriods } from '../hooks/usePeriods';
import { useCompliance } from '../hooks/useCompliance';
import { useBranding } from '../hooks/branding-context';
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
  const activeTab = (searchParams.get('tab') as TabId) || 'profile';

  const setActiveTab = (tab: TabId) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', tab);
    setSearchParams(nextParams, { replace: true });
  };

  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState<DeleteRequest>({
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
    } catch (err: unknown) {
      alert(errorMessage(err) ?? 'Error');
      console.error('Delete failed', err);
    } finally {
      setDeleteModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 text-neutral-500">
      <div className="w-8 h-8 border-4 border-accent-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p>{t('common.status.loadingDetails', { defaultValue: 'Loading details...' })}</p>
    </div>
  );

  if (error || !person) return (
    <div className="bg-danger-900/20 border border-danger-900 text-danger-400 p-6 rounded-xl flex items-center space-x-4">
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
          <button onClick={() => navigate('/people')} className="p-2 hover:bg-neutral-800 rounded-full transition-colors">
            <ArrowLeft size={24} className="text-neutral-400" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-fg flex items-center gap-3">
              <PersonNameTag name={`${person.firstName} ${person.lastName}`} isPresumedNonExistent={person.isPresumedNonExistent} />
            </h1>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${activeVolPeriod ? 'bg-success-900/40 text-success-400 border border-success-800' : 'bg-neutral-800 text-neutral-500 border border-neutral-700'}`}>
                {activeVolPeriod ? t('people.volunteer') : t('people.notVolunteer', { defaultValue: 'people.notVolunteer' })}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${activeSocioPeriod ? 'bg-accent-900/40 text-accent-400 border border-accent-800' : 'bg-neutral-800 text-neutral-500 border border-neutral-700'}`}>
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
                className="bg-danger-900/20 hover:bg-danger-900/40 text-danger-500 border border-danger-900/50 px-3 py-2 rounded-lg flex items-center space-x-2 font-bold transition-all"
                title={t('people.deletePerson', { defaultValue: 'Delete Person' })}
              >
                <Trash2 size={16} />
              </button>
              {canCreateUser && !person?.userId && (
                <button
                  onClick={() => setShowCreateUserModal(true)}
                  className="bg-special-900/20 hover:bg-special-900/40 text-special-400 border border-special-900/50 px-4 py-2 rounded-lg flex items-center space-x-2 font-bold transition-all"
                  title="Create user account for this person"
                >
                  <UserPlus size={16} />
                  <span>Crea Account</span>
                </button>
              )}
              <button onClick={() => setIsProfileEditing(true)} className="bg-neutral-800 hover:bg-neutral-700 text-fg px-4 py-2 rounded-lg flex items-center space-x-2 font-bold transition-all">
                <Edit2 size={16} />
                <span>{t('common.actions.editProfile', { defaultValue: 'Edit Profile' })}</span>
              </button>
            </div>
          )}
          {canEdit && activeTab === 'profile' && isProfileEditing && (
            <div className="flex space-x-2">
              <button
                onClick={() => setIsProfileEditing(false)}
                className="bg-neutral-800 hover:bg-neutral-700 text-fg px-4 py-2 rounded-lg font-bold transition-all"
              >
                {t('common.actions.cancel')}
              </button>
              <button
                onClick={() => setIsProfileEditing(false)}
                className="bg-accent-600 hover:bg-accent-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2 font-bold transition-all"
              >
                <Check size={16} />
                <span>{t('common.actions.save')}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800 w-fit">
        {[
          { id: 'profile', label: t('people.tabs.profile', { defaultValue: 'Profile' }), icon: User },
          { id: 'volunteer', label: t('people.tabs.volunteer', { defaultValue: 'Volunteering' }), icon: History },
          { id: 'member', label: t('people.tabs.member', { defaultValue: 'Membership' }), icon: ShieldCheck },
          { id: 'board', label: t('people.tabs.board', { defaultValue: 'Board' }), icon: Briefcase },
          { id: 'compliance', label: t('nav.compliance', { defaultValue: 'Compliance' }), icon: FileCheck }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabId)}
            className={`flex items-center space-x-2 px-6 py-2 rounded-lg font-medium transition-all ${activeTab === tab.id ? 'bg-neutral-800 text-fg shadow-lg' : 'text-neutral-400 hover:text-neutral-200'
              }`}
          >
            <tab.icon size={18} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl min-h-[400px]">
        {activeTab === 'profile' && person && (
          <ProfileTab
            person={person}
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
            onRequestEditRole={(role?: ComplianceRole) => setDeleteModal({
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
            person={person}
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
            person={person}
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
          <BoardTab person={person} />
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
            createFlag={async ({ documentId, ...flagData }) => {
              await createFlag(documentId, flagData);
            }}
            updateFlag={updateFlag}
            suppressAlert={async (data) => {
              await suppressAlert(data.alertKey, data.reason, data.note ?? undefined, data.untilDate ?? undefined, data.personId || id);
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
