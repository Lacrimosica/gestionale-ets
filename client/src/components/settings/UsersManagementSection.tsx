import { useTranslation } from 'react-i18next';
import { Users, ChevronDown, UserPlus, Mail } from 'lucide-react';
import { useMemo } from 'react';
import { getPermissionsForRole, type Permission } from '../../lib/permissions';
import EditableUserCard from './EditableUserCard';
import AddUserModal from './AddUserModal';
import InviteUserModal from './InviteUserModal';
import DeleteConfirmationModal from '../DeleteConfirmationModal';

interface User {
  id: string;
  email: string;
  role: string;
  permissions: Permission[];
  createdAt?: string;
  isCoreAdmin?: boolean;
}

interface UsersManagementSectionProps {
  expanded: boolean;
  canManage: boolean;
  canResetPasswords: boolean;
  currentUserId?: string;
  users: User[];
  loading: boolean;
  error: string | null;
  newUser: { email: string; password: string; role: string; permissions: Permission[] };
  savingUser: boolean;
  userMessage: string | null;
  editingId: string | null;
  showAddUserModal: boolean;
  showInviteModal: boolean;
  deleteTarget: { id: string; email: string } | null;
  deleteConfirmValue: string;
  isDeletingUser: boolean;
  deleteMessage: string | null;
  resetMessage: string | null;
  onToggle: () => void;
  onNewUserChange: (field: string, value: any) => void;
  onTogglePermission: (permission: Permission) => void;
  onShowAddModal: (show: boolean) => void;
  onShowInviteModal: (show: boolean) => void;
  onEditToggle: (id: string | null) => void;
  onSaveUser: (draft: { id: string; email: string; role: string; permissions: Permission[] }) => Promise<void>;
  onDeleteUser: (id: string, email: string) => void;
  onConfirmDelete: (id: string) => Promise<void>;
  onResetPassword: (userId: string, newPassword: string) => Promise<void>;
  onCancelDelete: () => void;
  onCreateUser: () => Promise<void>;
}

export const UsersManagementSection = ({
  expanded,
  canManage,
  canResetPasswords,
  currentUserId,
  users,
  loading,
  error,
  newUser,
  savingUser,
  userMessage,
  editingId,
  showAddUserModal,
  showInviteModal,
  deleteTarget,
  deleteConfirmValue,
  isDeletingUser,
  deleteMessage,
  resetMessage,
  onToggle,
  onNewUserChange,
  onTogglePermission,
  onShowAddModal,
  onShowInviteModal,
  onEditToggle,
  onSaveUser,
  onDeleteUser,
  onConfirmDelete,
  onResetPassword,
  onCancelDelete,
  onCreateUser,
}: UsersManagementSectionProps) => {
  const { t } = useTranslation();

  const editableUsers = useMemo(
    () =>
      users.map((settingsUser) => ({
        ...settingsUser,
        permissions: settingsUser.permissions?.length ? settingsUser.permissions : getPermissionsForRole(settingsUser.role),
      })),
    [users]
  );

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-3">
          <Users className="text-cyan-400" />
          <div className="text-left">
            <h2 className="text-lg font-semibold text-white">{t('settings.users.title')}</h2>
            <p className="text-sm text-slate-500">{t('settings.users.description')}</p>
          </div>
        </div>
        <ChevronDown size={20} className={`text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="space-y-4 max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex gap-2 text-sm">
              {error && <p className="text-red-400">{error}</p>}
              {userMessage && <p className="text-slate-300">{userMessage}</p>}
              {resetMessage && <p className="text-slate-300">{resetMessage}</p>}
              {deleteMessage && <p className="text-slate-300">{deleteMessage}</p>}
            </div>
            {canManage && (
              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => onShowInviteModal(true)}
                  className="inline-flex items-center gap-2 bg-amber-700 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
                >
                  <Mail size={15} />
                  {t('settings.users.inviteUser')}
                </button>
                <button
                  onClick={() => onShowAddModal(true)}
                  className="inline-flex items-center gap-2 bg-cyan-700 hover:bg-cyan-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
                >
                  <UserPlus size={15} />
                  {t('settings.users.addUser')}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {loading ? (
              <div className="text-slate-500 text-sm">{t('settings.users.loadingUsers')}</div>
            ) : editableUsers.length === 0 ? (
              <div className="text-slate-500 text-sm">{t('settings.users.noUsers')}</div>
            ) : (
              editableUsers.map((settingsUser) => (
                <EditableUserCard
                  key={settingsUser.id}
                  user={settingsUser}
                  canManage={canManage}
                  canResetPasswords={canResetPasswords}
                  currentUserId={currentUserId}
                  isEditing={editingId === settingsUser.id}
                  onEditToggle={() => onEditToggle(editingId === settingsUser.id ? null : settingsUser.id)}
                  onSave={onSaveUser}
                  onResetPassword={onResetPassword}
                  onDeleteUser={() => onDeleteUser(settingsUser.id, settingsUser.email)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {showAddUserModal && (
        <AddUserModal
          newUser={newUser}
          onFieldChange={(field, value) => {
            if (field === 'role') {
              onNewUserChange('role', value);
              onNewUserChange('permissions', getPermissionsForRole(value));
            } else {
              onNewUserChange(field, value);
            }
          }}
          onTogglePermission={onTogglePermission}
          onSave={onCreateUser}
          onClose={() => onShowAddModal(false)}
          message={userMessage}
          saving={savingUser}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmationModal
          isOpen={!!deleteTarget}
          title={t('settings.deleteUser.title')}
          description={t('settings.deleteUser.description')}
          expectedText={t('settings.deleteUser.expectedText', { email: deleteTarget.email })}
          value={deleteConfirmValue}
          isSubmitting={isDeletingUser}
          submitLabel={t('settings.deleteUser.submit')}
          onChange={() => {
            // Note: parent component should handle this state update
          }}
          onCancel={onCancelDelete}
          onConfirm={() => onConfirmDelete(deleteTarget.id)}
        />
      )}

      {showInviteModal && (
        <InviteUserModal onClose={() => onShowInviteModal(false)} />
      )}
    </section>
  );
};
