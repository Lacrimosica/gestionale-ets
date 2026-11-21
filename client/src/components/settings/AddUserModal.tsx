import { useTranslation } from 'react-i18next';
import { UserPlus, Save } from 'lucide-react';
import { type Permission } from '../../lib/permissions';
import PermissionChecklist from './PermissionChecklist';

const roleOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'viewer', label: 'Viewer' },
];

const AddUserModal = ({
  newUser,
  onFieldChange,
  onTogglePermission,
  onSave,
  onClose,
  message,
  saving,
}: {
  newUser: { email: string; password: string; role: string; permissions: Permission[] };
  onFieldChange: (field: 'email' | 'password' | 'role', value: string) => void;
  onTogglePermission: (permission: Permission) => void;
  onSave: () => void;
  onClose: () => void;
  message: string | null;
  saving: boolean;
}) => {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 w-full max-w-2xl space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-neutral-200 font-semibold">
            <UserPlus size={18} className="text-info-400" />
            {t('settings.users.newUserModalTitle')}
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-fg text-lg leading-none">
            ✕
          </button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input
              value={newUser.email}
              onChange={(e) => onFieldChange('email', e.target.value)}
              placeholder={t('settings.users.emailPlaceholder')}
              className="bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-fg"
            />
            <input
              value={newUser.password}
              onChange={(e) => onFieldChange('password', e.target.value)}
              placeholder={t('settings.users.initialPasswordPlaceholder')}
              type="password"
              className="bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-fg"
            />
          </div>
          <select
            value={newUser.role}
            onChange={(e) => {
              const role = e.target.value;
              onFieldChange('role', role);
            }}
            className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-fg"
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {t(`settings.roles.${option.value}`, { defaultValue: option.label })}
              </option>
            ))}
          </select>
        </div>
        <PermissionChecklist permissions={newUser.permissions} onToggle={onTogglePermission} />
        {message && <p className="text-sm text-neutral-300">{message}</p>}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-info-600 hover:bg-info-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold"
          >
            <Save size={16} />
            {t('settings.users.createUser')}
          </button>
          <button onClick={onClose} className="text-sm text-neutral-400 hover:text-fg">
            {t('common.actions.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddUserModal;
