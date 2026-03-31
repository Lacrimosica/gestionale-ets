import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Building2, ImageUp, KeyRound, LockKeyhole, Save, Settings, Shield, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import ComplianceRulesEditor from '../components/ComplianceRulesEditor';
import { useAuth } from '../hooks/useAuth';
import { readLogoFileAsDataUrl, useBranding } from '../hooks/useBranding';
import { changePassword, resetUserPassword, useSettingsUsers } from '../hooks/useSettings';
import { getPermissionsForRole, PERMISSIONS, type Permission } from '../lib/permissions';
import { useCompliance } from '../hooks/useCompliance';

const roleOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'core_admin', label: 'Core Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'viewer', label: 'Viewer' },
];

const groupedPermissions = [
  {
    title: 'Modules',
    items: [
      PERMISSIONS.dashboardView,
      PERMISSIONS.peopleView,
      PERMISSIONS.volunteersView,
      PERMISSIONS.membersView,
      PERMISSIONS.boardView,
      PERMISSIONS.assembliesView,
      PERMISSIONS.convocationsView,
      PERMISSIONS.timelineView,
      PERMISSIONS.resignationsView,
      PERMISSIONS.settingsView,
      PERMISSIONS.settingsUsersView,
    ],
  },
  {
    title: 'Actions',
    items: [
      PERMISSIONS.peopleEdit,
      PERMISSIONS.assembliesEdit,
      PERMISSIONS.convocationsEdit,
      PERMISSIONS.settingsUsersManage,
      PERMISSIONS.settingsPasswordManage,
      PERMISSIONS.settingsUsersResetPassword,
    ],
  },
];

const SettingsPage = () => {
  const { user, hasPermission, login, token } = useAuth();
  const { branding, updateBranding } = useBranding();
  const { rules, saveRules } = useCompliance();
  const isCoreAdmin = user?.role === 'core_admin';
  const canManageUsers = hasPermission(PERMISSIONS.settingsUsersManage);
  const canViewUsers = hasPermission(PERMISSIONS.settingsUsersView);
  const canManagePassword = hasPermission(PERMISSIONS.settingsPasswordManage);
  const canResetPasswords = hasPermission(PERMISSIONS.settingsUsersResetPassword);
  const { users, loading, error, createUser, updateUser, deleteUser } = useSettingsUsers(canViewUsers);
  const [brandingForm, setBrandingForm] = useState({
    organizationName: branding.organizationName,
    shortName: branding.shortName,
    authDomain: branding.authDomain,
    tagline: branding.tagline,
    supportEmail: branding.supportEmail,
    logoDataUrl: branding.logoDataUrl,
  });
  const [brandingMessage, setBrandingMessage] = useState<string | null>(null);
  const [savingBranding, setSavingBranding] = useState(false);

  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    role: 'viewer',
    permissions: getPermissionsForRole('viewer') as Permission[],
  });
  const [savingUser, setSavingUser] = useState(false);
  const [userMessage, setUserMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; email: string } | null>(null);
  const [deleteConfirmValue, setDeleteConfirmValue] = useState('');
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  useEffect(() => {
    setBrandingForm({
      organizationName: branding.organizationName,
      shortName: branding.shortName,
      authDomain: branding.authDomain,
      tagline: branding.tagline,
      supportEmail: branding.supportEmail,
      logoDataUrl: branding.logoDataUrl,
    });
  }, [branding]);

  const editableUsers = useMemo(
    () =>
      users.map((settingsUser) => ({
        ...settingsUser,
        permissions: settingsUser.permissions?.length ? settingsUser.permissions : getPermissionsForRole(settingsUser.role),
      })),
    [users]
  );

  useEffect(() => {
    if (!user?.id || !token || editableUsers.length === 0) return;

    const latestCurrentUser = editableUsers.find((settingsUser) => settingsUser.id === user.id);
    if (!latestCurrentUser) return;

    const sameRole = latestCurrentUser.role === user.role;
    const samePermissions =
      latestCurrentUser.permissions.length === user.permissions.length &&
      latestCurrentUser.permissions.every((permission) => user.permissions.includes(permission));

    if (!sameRole || !samePermissions) {
      login(token, latestCurrentUser);
    }
  }, [editableUsers, login, token, user]);

  const togglePermission = (
    currentPermissions: Permission[],
    permission: Permission,
    onChange: (permissions: Permission[]) => void
  ) => {
    const next = currentPermissions.includes(permission)
      ? currentPermissions.filter((item) => item !== permission)
      : [...currentPermissions, permission];
    onChange(next);
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password) {
      setUserMessage('Email and password are required.');
      return;
    }

    setSavingUser(true);
    setUserMessage(null);
    try {
      await createUser(newUser);
      setNewUser({
        email: '',
        password: '',
        role: 'viewer',
        permissions: getPermissionsForRole('viewer'),
      });
      setUserMessage('User created successfully.');
    } catch {
      setUserMessage('Error creating user.');
    } finally {
      setSavingUser(false);
    }
  };

  const handleResetPassword = async (targetUserId: string, newPassword: string) => {
    setResetMessage(null);
    try {
      await resetUserPassword(targetUserId, newPassword);
      setResetMessage('User password reset successfully.');
    } catch {
      setResetMessage('Error resetting user password.');
    }
  };

  const handleDeleteUser = async (targetUserId: string) => {
    setDeleteMessage(null);
    try {
      await deleteUser(targetUserId);
      if (editingId === targetUserId) {
        setEditingId(null);
      }
      setDeleteMessage('User deleted successfully.');
    } catch {
      setDeleteMessage('Error deleting user.');
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage('New passwords do not match.');
      return;
    }

    setSavingPassword(true);
    setPasswordMessage(null);
    try {
      await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordMessage('Password updated successfully.');
    } catch {
      setPasswordMessage('Error updating password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleUpdateUser = async (draft: { id: string; email: string; role: string; permissions: Permission[] }) => {
    setSavingUser(true);
    setUserMessage(null);
    try {
      const updatedUser = await updateUser(draft.id, {
        email: draft.email,
        role: draft.role,
        permissions: draft.permissions,
      });

      if (user?.id === updatedUser.id && token) {
        login(token, updatedUser);
      }

      setEditingId(null);
      setUserMessage('User updated successfully.');
    } catch {
      setUserMessage('Error updating user.');
    } finally {
      setSavingUser(false);
    }
  };

  const handleLogoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setBrandingMessage(null);
    try {
      const logoDataUrl = await readLogoFileAsDataUrl(file);
      setBrandingForm((prev) => ({ ...prev, logoDataUrl }));
    } catch (error) {
      setBrandingMessage(error instanceof Error ? error.message : 'Error uploading logo.');
    } finally {
      event.target.value = '';
    }
  };

  const handleSaveBranding = async () => {
    setSavingBranding(true);
    setBrandingMessage(null);
    try {
      await updateBranding(brandingForm);
      setBrandingMessage('Customization updated successfully.');
    } catch {
      setBrandingMessage('Error saving customization.');
    } finally {
      setSavingBranding(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Settings className="text-cyan-400" />
          Settings
        </h1>
        <p className="text-slate-400 mt-1">Backoffice for administrators, roles, permissions and account security.</p>
      </div>

      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
        <div className="flex items-center gap-3">
          <Building2 className="text-fuchsia-400" />
          <div>
            <h2 className="text-lg font-semibold text-white">Organization Identity</h2>
            <p className="text-sm text-slate-500">Configure logo, name and base texts to make the project reusable for other organizations.</p>
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-300">
          Current customization of the management system. If saving is rejected, the backend recognizes your user as not `core_admin`.
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[260px,minmax(0,1fr)] gap-6">
          <div className="border border-slate-800 rounded-xl p-5 bg-slate-950/40 space-y-4">
            <div className="h-56 rounded-2xl border border-dashed border-slate-700 bg-slate-950 flex items-center justify-center overflow-hidden">
              {brandingForm.logoDataUrl ? (
                <img src={brandingForm.logoDataUrl} alt={`Logo ${brandingForm.organizationName}`} className="h-full w-full object-contain p-4" />
              ) : (
                <div className="text-center px-6">
                  <div className="mx-auto mb-3 h-16 w-16 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-300 flex items-center justify-center text-2xl font-bold">
                    {brandingForm.shortName.slice(0, 2).toUpperCase() || 'AS'}
                  </div>
                  <p className="text-sm text-slate-400">No logo uploaded</p>
                </div>
              )}
            </div>

            <label className="inline-flex items-center justify-center gap-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-4 py-2 rounded-lg font-semibold cursor-pointer">
              <ImageUp size={16} />
              Upload logo
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleLogoChange}
              />
            </label>

            <button
              type="button"
              onClick={() => setBrandingForm((prev) => ({ ...prev, logoDataUrl: null }))}
              className="text-sm text-slate-400 hover:text-white"
            >
              Remove logo
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                value={brandingForm.organizationName}
                onChange={(e) => setBrandingForm((prev) => ({ ...prev, organizationName: e.target.value }))}
                placeholder="Full organization name"
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
              <input
                value={brandingForm.shortName}
                onChange={(e) => setBrandingForm((prev) => ({ ...prev, shortName: e.target.value }))}
                placeholder="Short name"
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <input
              value={brandingForm.authDomain}
              onChange={(e) => setBrandingForm((prev) => ({ ...prev, authDomain: e.target.value.toLowerCase() }))}
              placeholder="Login domain (e.g. deb.org)"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
            />

            <input
              value={brandingForm.tagline}
              onChange={(e) => setBrandingForm((prev) => ({ ...prev, tagline: e.target.value }))}
              placeholder="Tagline or subtitle"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
            />

            <input
              value={brandingForm.supportEmail}
              onChange={(e) => setBrandingForm((prev) => ({ ...prev, supportEmail: e.target.value }))}
              placeholder="Reference email"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
            />

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Preview</p>
              <p className="text-xl font-semibold text-white">{brandingForm.shortName || 'Short Name'} Gestionale</p>
              <p className="text-sm text-slate-400 mt-1">{brandingForm.organizationName || 'Full Organization Name'}</p>
              {brandingForm.authDomain && <p className="text-xs text-cyan-300 mt-2">Access domain: {brandingForm.authDomain}</p>}
              {brandingForm.tagline && <p className="text-sm text-slate-500 mt-2">{brandingForm.tagline}</p>}
            </div>

            {brandingMessage && <p className="text-sm text-slate-300">{brandingMessage}</p>}

            <button
              onClick={handleSaveBranding}
              disabled={savingBranding}
              className="inline-flex items-center gap-2 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold"
            >
              <Save size={16} />
              Save customisation
            </button>
          </div>
        </div>
      </section>

      {canViewUsers && (
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-3">
            <Users className="text-cyan-400" />
            <div>
              <h2 className="text-lg font-semibold text-white">Administrative Users</h2>
              <p className="text-sm text-slate-500">Backoffice access management with role and permission array.</p>
            </div>
          </div>

          {canManageUsers && (
            <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/40 space-y-4">
              <div className="flex items-center gap-2 text-slate-200 font-medium">
                <UserPlus size={18} className="text-cyan-400" />
                New admin/backoffice user
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  value={newUser.email}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="Email"
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
                <input
                  value={newUser.password}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Initial password"
                  type="password"
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
                <select
                  value={newUser.role}
                  onChange={(e) => {
                    const role = e.target.value;
                    setNewUser((prev) => ({ ...prev, role, permissions: getPermissionsForRole(role) }));
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
                permissions={newUser.permissions}
                onToggle={(permission) => togglePermission(newUser.permissions, permission, (permissions) => setNewUser((prev) => ({ ...prev, permissions })))}
              />

              <button
                onClick={handleCreateUser}
                disabled={savingUser}
                className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold"
              >
                <Save size={16} />
                Create user
              </button>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
          {userMessage && <p className="text-sm text-slate-300">{userMessage}</p>}
          {resetMessage && <p className="text-sm text-slate-300">{resetMessage}</p>}
          {deleteMessage && <p className="text-sm text-slate-300">{deleteMessage}</p>}

          <div className="space-y-4">
            {loading ? (
              <div className="text-slate-500">Loading users...</div>
            ) : editableUsers.length === 0 ? (
              <div className="text-slate-500">No users configured.</div>
            ) : (
              editableUsers.map((settingsUser) => (
                <EditableUserCard
                  key={settingsUser.id}
                  user={settingsUser}
                  canManage={canManageUsers}
                  canResetPasswords={canResetPasswords}
                  currentUserId={user?.id}
                  isEditing={editingId === settingsUser.id}
                  onEditToggle={() => setEditingId(editingId === settingsUser.id ? null : settingsUser.id)}
                  onSave={handleUpdateUser}
                  onResetPassword={handleResetPassword}
                  onDeleteUser={() => {
                    setDeleteTarget({ id: settingsUser.id, email: settingsUser.email });
                    setDeleteConfirmValue('');
                  }}
                />
              ))
            )}
          </div>
        </section>
      )}

      {canManagePassword && (
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3">
            <LockKeyhole className="text-emerald-400" />
            <div>
              <h2 className="text-lg font-semibold text-white">Sicurezza account</h2>
              <p className="text-sm text-slate-500">Aggiorna la password del tuo account.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="password"
              placeholder="Password attuale"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
            />
            <input
              type="password"
              placeholder="Nuova password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
            />
            <input
              type="password"
              placeholder="Conferma nuova password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
            />
          </div>

          {passwordMessage && <p className="text-sm text-slate-300">{passwordMessage}</p>}

          <button
            onClick={handleChangePassword}
            disabled={savingPassword}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold"
          >
            <Shield size={16} />
            Update password
          </button>
        </section>
      )}

      {isCoreAdmin && rules && (
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-emerald-400" size={20} />
            <div>
              <h2 className="text-lg font-semibold text-white">Compliance Rules</h2>
              <p className="text-sm text-slate-500">Define compliance document types, roles, inheritance, and base requirements. Changes are saved to the database and take effect immediately.</p>
            </div>
          </div>
          <div className="rounded-lg border border-amber-800/40 bg-amber-900/10 px-4 py-3 text-sm text-amber-300/80">
            ⚠ These rules drive the compliance engine. Changing them affects alerts for all people in the system.
            Labels should be i18n keys (e.g. <span className="font-mono text-amber-400">compliance.documents.nda_dia</span>) that exist in your locale files.
          </div>
          <ComplianceRulesEditor initialRules={rules} onSave={async (r) => { await saveRules(r); }} />
        </section>
      )}

      <DeleteConfirmationModal
        isOpen={!!deleteTarget}
        title="Confirm user deletion"
        description="This action will permanently delete the backoffice user. Access will be revoked immediately."
        expectedText={deleteTarget ? `DELETE ${deleteTarget.email}` : ''}
        value={deleteConfirmValue}
        isSubmitting={isDeletingUser}
        submitLabel="Delete user"
        onChange={setDeleteConfirmValue}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteConfirmValue('');
        }}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setIsDeletingUser(true);
          try {
            await handleDeleteUser(deleteTarget.id);
          } finally {
            setIsDeletingUser(false);
            setDeleteTarget(null);
            setDeleteConfirmValue('');
          }
        }}
      />
    </div>
  );
};

const PermissionChecklist = ({
  permissions,
  onToggle,
}: {
  permissions: Permission[];
  onToggle: (permission: Permission) => void;
}) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    {groupedPermissions.map((group) => (
      <div key={group.title} className="bg-slate-950/40 border border-slate-800 rounded-lg p-4">
        <p className="text-sm font-semibold text-slate-300 mb-3">{group.title}</p>
        <div className="grid grid-cols-1 gap-2">
          {group.items.map((permission) => (
            <label key={permission} className="flex items-center gap-2 text-sm text-slate-400">
              <input
                type="checkbox"
                checked={permissions.includes(permission)}
                onChange={() => onToggle(permission)}
              />
              {permission}
            </label>
          ))}
        </div>
      </div>
    ))}
  </div>
);

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
  user: { id: string; email: string; role: string; permissions: Permission[]; createdAt: string; isCoreAdmin?: boolean };
  canManage: boolean;
  canResetPasswords: boolean;
  currentUserId?: string;
  isEditing: boolean;
  onEditToggle: () => void;
  onSave: (user: { id: string; email: string; role: string; permissions: Permission[] }) => void;
  onResetPassword: (userId: string, newPassword: string) => void;
  onDeleteUser: () => void;
}) => {
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
    <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/30 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-white font-medium">{user.email}</p>
          <p className="text-xs text-slate-500">Created on {new Date(user.createdAt).toLocaleDateString('en-GB')}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-cyan-300 border border-slate-700">
            {user.isCoreAdmin ? 'core_admin' : user.role}
          </span>
          {canManage && (
            <button onClick={onEditToggle} className="text-sm text-slate-400 hover:text-white">
              {isEditing ? 'Close' : 'Edit'}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {user.permissions.map((permission) => (
          <span key={permission} className="px-2 py-1 rounded-md text-xs bg-slate-900 border border-slate-800 text-slate-300">
            {permission}
          </span>
        ))}
      </div>

      {isEditing && canManage && (
        <div className="border border-slate-800 rounded-lg p-4 bg-slate-950/60 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              Save user
            </button>
            <button onClick={onEditToggle} className="text-sm text-slate-400 hover:text-white">
              Cancel
            </button>
          </div>
        </div>
      )}

      {canResetPasswords && (
        <div className="border border-slate-800 rounded-lg p-4 bg-slate-950/40 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
            <KeyRound size={16} className="text-amber-400" />
            Reset password utente
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              type="password"
              value={resetPasswordDraft.password}
              onChange={(e) => {
                setResetPasswordError(null);
                setResetPasswordDraft((prev) => ({ ...prev, password: e.target.value }));
              }}
              placeholder="Nuova password"
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
            />
            <input
              type="password"
              value={resetPasswordDraft.confirmPassword}
              onChange={(e) => {
                setResetPasswordError(null);
                setResetPasswordDraft((prev) => ({ ...prev, confirmPassword: e.target.value }));
              }}
              placeholder="Conferma nuova password"
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
            />
          </div>
          {resetPasswordError && <p className="text-sm text-red-400">{resetPasswordError}</p>}
          <div className="flex justify-end">
            <button
              onClick={() => {
                if (!resetPasswordDraft.password || !resetPasswordDraft.confirmPassword) {
                  setResetPasswordError('Inserisci nuova password e conferma.');
                  return;
                }
                if (resetPasswordDraft.password !== resetPasswordDraft.confirmPassword) {
                  setResetPasswordError('Le password non coincidono.');
                  return;
                }
                onResetPassword(user.id, resetPasswordDraft.password);
                setResetPasswordDraft({ password: '', confirmPassword: '' });
                setResetPasswordError(null);
              }}
              className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg font-semibold"
            >
              Reset password
            </button>
          </div>
        </div>
      )}

      {canDelete && (
        <div className="border border-red-900/40 rounded-lg p-4 bg-red-950/20 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-red-300">
            <Trash2 size={16} />
            Delete user
          </div>
          <button
            onClick={onDeleteUser}
            className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-semibold"
          >
            Delete user
          </button>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
