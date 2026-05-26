import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound, Trash2 } from 'lucide-react';
import { getPermissionsForRole, type Permission } from '../../lib/permissions';
import PermissionChecklist from './PermissionChecklist';

const roleOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'viewer', label: 'Viewer' },
];

const EditableUserCard = ({
  user,
  canManage,
  canResetPasswords,
  currentUserId,
  isEditing,
  onEditToggle,
  onSave,
  onResetPassword,
  onDeleteUser,
}: {
  user: { id: string; email: string; role: string; permissions: Permission[]; createdAt?: string; isCoreAdmin?: boolean };
  canManage: boolean;
  canResetPasswords: boolean;
  currentUserId?: string;
  isEditing: boolean;
  onEditToggle: () => void;
  onSave: (user: { id: string; email: string; role: string; permissions: Permission[] }) => void;
  onResetPassword: (userId: string, newPassword: string) => void;
  onDeleteUser: () => void;
}) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState({
    id: user.id,
    email: user.email,
    role: user.role,
    permissions: user.permissions,
  });
  const [resetPasswordDraft, setResetPasswordDraft] = useState({
    password: '',
    confirmPassword: '',
  });
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);
  const isCurrentUser = currentUserId === user.id;
  const canDelete = canManage && !user.isCoreAdmin && !isCurrentUser;

  return (
    <div className="border border-slate-800 rounded-xl px-4 py-3 bg-slate-950/30">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-cyan-300 border border-slate-700 shrink-0">
            {user.isCoreAdmin ? 'core_admin' : user.role}
          </span>
          <p className="text-slate-200 text-sm truncate">{user.email}</p>
        </div>
        {canManage && (
          <button onClick={onEditToggle} className="text-xs text-slate-400 hover:text-white shrink-0">
            {isEditing ? t('common.actions.close') : t('common.actions.edit')}
          </button>
        )}
      </div>

      {isEditing && canManage && (
        <div className="border border-slate-800 rounded-lg p-4 bg-slate-950/60 space-y-4 mt-3">
          <div className="grid grid-cols-1 gap-4">
            <input
              value={draft.email}
              onChange={(e) => setDraft((prev) => ({ ...prev, email: e.target.value }))}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
            />
            <select
              value={draft.role}
              disabled={user.isCoreAdmin}
              onChange={(e) => {
                const role = e.target.value;
                setDraft((prev) => ({ ...prev, role, permissions: getPermissionsForRole(role) }));
              }}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <PermissionChecklist
            permissions={draft.permissions}
            onToggle={(permission) => {
              if (user.isCoreAdmin) return;
              const next = draft.permissions.includes(permission)
                ? draft.permissions.filter((item) => item !== permission)
                : [...draft.permissions, permission];
              setDraft((prev) => ({ ...prev, permissions: next }));
            }}
          />

          <div className="flex items-center gap-3">
            <button
              onClick={() => onSave(draft)}
              disabled={user.isCoreAdmin}
              className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold"
            >
              {t('settings.users.saveUserButton')}
            </button>
            <button onClick={onEditToggle} className="text-sm text-slate-400 hover:text-white">
              {t('common.actions.cancel')}
            </button>
          </div>
          {canResetPasswords && (
            <div className="border border-slate-800 rounded-lg p-4 bg-slate-950/40 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                <KeyRound size={16} className="text-amber-400" />
                {t('settings.users.resetPasswordSectionTitle')}
              </div>
              <div className="grid grid-cols-1 gap-3">
                <input
                  type="password"
                  value={resetPasswordDraft.password}
                  onChange={(e) => {
                    setResetPasswordError(null);
                    setResetPasswordDraft((prev) => ({ ...prev, password: e.target.value }));
                  }}
                  placeholder={t('settings.users.resetPasswordPlaceholder')}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
                <input
                  type="password"
                  value={resetPasswordDraft.confirmPassword}
                  onChange={(e) => {
                    setResetPasswordError(null);
                    setResetPasswordDraft((prev) => ({ ...prev, confirmPassword: e.target.value }));
                  }}
                  placeholder={t('settings.users.confirmResetPasswordPlaceholder')}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
              {resetPasswordError && <p className="text-sm text-red-400">{resetPasswordError}</p>}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    if (!resetPasswordDraft.password || !resetPasswordDraft.confirmPassword) {
                      setResetPasswordError(t('settings.users.resetPasswordErrorMissing'));
                      return;
                    }
                    if (resetPasswordDraft.password !== resetPasswordDraft.confirmPassword) {
                      setResetPasswordError(t('settings.users.resetPasswordErrorMismatch'));
                      return;
                    }
                    onResetPassword(user.id, resetPasswordDraft.password);
                    setResetPasswordDraft({ password: '', confirmPassword: '' });
                    setResetPasswordError(null);
                  }}
                  className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg font-semibold"
                >
                  {t('settings.users.resetPasswordButton')}
                </button>
              </div>
            </div>
          )}

          {canDelete && (
            <div className="border border-red-900/40 rounded-lg p-4 bg-red-950/20 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-red-300">
                <Trash2 size={16} />
                {t('settings.users.deleteUserSectionTitle')}
              </div>
              <button
                onClick={onDeleteUser}
                className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-semibold"
              >
                {t('settings.users.deleteUserButton')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EditableUserCard;
