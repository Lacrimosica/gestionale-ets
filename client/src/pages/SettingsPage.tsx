import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, ChevronDown, ShieldCheck, X, Sparkles, Palette } from 'lucide-react';
import ComplianceRulesEditor from '../components/ComplianceRulesEditor';
import DocumentSettingsSection from '../components/settings/DocumentSettingsSection';
import { buildPreviewText } from '../components/settings/documentTemplates';
import { BrandingSection } from '../components/settings/BrandingSection';
import { UsersManagementSection } from '../components/settings/UsersManagementSection';
import { PasswordManagementSection } from '../components/settings/PasswordManagementSection';
import { AddressesSection } from '../components/settings/AddressesSection';
import { ThemeSection } from '../components/settings/ThemeSection';
import { ExportSection } from '../components/settings/ExportSection';
import { ImportSection } from '../components/settings/ImportSection';
import { useAuth } from '../hooks/useAuth';
import { useBranding } from '../hooks/useBranding';
import { resetUserPassword, useDocumentSettings, useModalityOptions, type DocumentSettings } from '../hooks/useSettings';
import { getPermissionsForRole, PERMISSIONS, type Permission } from '../lib/permissions';
import { useCompliance } from '../hooks/useCompliance';
import { useBrandingForm } from '../hooks/useBrandingForm';
import { useUserManagement } from '../hooks/useUserManagement';
import { usePasswordManagement } from '../hooks/usePasswordManagement';
import { useAddressManagement } from '../hooks/useAddressManagement';


const SettingsPage = () => {
  const { user, hasPermission, login, token } = useAuth();
  const { t } = useTranslation();
  const { branding, updateBranding } = useBranding();
  const isCoreAdmin = user?.role === 'core_admin';
  const canManageUsers = hasPermission(PERMISSIONS.settingsUsersManage);
  const canViewUsers = hasPermission(PERMISSIONS.settingsUsersView);
  const canManagePassword = hasPermission(PERMISSIONS.settingsPasswordManage);
  const canResetPasswords = hasPermission(PERMISSIONS.settingsUsersResetPassword);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    customization: false,
    theme: false,
    branding: false,
    users: false,
    password: false,
    compliance: false,
    addresses: false,
    documents: false,
    export: false,
    import: false,
  });

  const [showInviteModal, setShowInviteModal] = useState(false);

  // Use new hooks
  const brandingForm = useBrandingForm(branding);
  const userManagement = useUserManagement(canViewUsers);
  const passwordManagement = usePasswordManagement();
  const addressManagement = useAddressManagement(expandedSections.addresses);

  const { rules, saveRules, loading: complianceLoading, error: complianceError } = useCompliance(undefined, expandedSections.compliance);
  const { settings: docSettings, save: saveDocSettings } = useDocumentSettings(expandedSections.documents);
  const { options: modalityOptions, create: createModality, update: updateModality, remove: removeModality } = useModalityOptions(expandedSections.documents);
  const [docForm, setDocForm] = useState<Partial<DocumentSettings>>({});
  const [modalityDraft, setModalityDraft] = useState({ type: 'convocation' as 'convocation' | 'minutes_opening', mode: 'any' as 'in_person' | 'remote' | 'hybrid' | 'any', label: '', value: '' });
  const [editingModalityId, setEditingModalityId] = useState<string | null>(null);
  const [editingModalityDraft, setEditingModalityDraft] = useState({ label: '', value: '', mode: 'any' as 'in_person' | 'remote' | 'hybrid' | 'any' });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<'convocation' | 'convocation_extraordinary_statute' | 'convocation_extraordinary_dissolution' | 'convocation_board' | 'minutes1a' | 'minutes2a' | 'minutes_board'>('convocation');
  const docMessage: string | null = null;
  const savingDoc = false;

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    if (docSettings) setDocForm(docSettings);
  }, [docSettings]);

  const editableUsers = useMemo(
    () =>
      userManagement.users.map((settingsUser) => ({
        ...settingsUser,
        permissions: settingsUser.permissions?.length ? settingsUser.permissions : getPermissionsForRole(settingsUser.role),
      })),
    [userManagement.users]
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

  const handleCreateUser = async () => {
    if (!userManagement.newUser.email || !userManagement.newUser.password) {
      userManagement.setUserMessage(t('settings.messages.emailPasswordRequired'));
      return;
    }

    userManagement.setSavingUser(true);
    userManagement.setUserMessage(null);
    try {
      await userManagement.createUser(userManagement.newUser);
      userManagement.setNewUser({
        email: '',
        password: '',
        role: 'viewer',
        permissions: getPermissionsForRole('viewer'),
      });
      userManagement.setUserMessage(t('settings.messages.userCreated'));
    } catch {
      userManagement.setUserMessage(t('settings.messages.errorCreatingUser'));
    } finally {
      userManagement.setSavingUser(false);
    }
  };

  const handleResetPassword = async (targetUserId: string, newPassword: string) => {
    userManagement.setResetMessage(null);
    try {
      await resetUserPassword(targetUserId, newPassword);
      userManagement.setResetMessage(t('settings.messages.userPasswordReset'));
    } catch {
      userManagement.setResetMessage(t('settings.messages.errorResettingPassword'));
    }
  };

  const handleDeleteUser = async (targetUserId: string) => {
    userManagement.setDeleteMessage(null);
    try {
      await userManagement.deleteUser(targetUserId);
      if (userManagement.editingId === targetUserId) {
        userManagement.setEditingId(null);
      }
      userManagement.setDeleteMessage(t('settings.messages.userDeleted'));
    } catch {
      userManagement.setDeleteMessage(t('settings.messages.errorDeletingUser'));
    }
  };

  const handleChangePassword = async () => {
    passwordManagement.handleChangePassword(() => {
      passwordManagement.setMessage(t('settings.messages.passwordUpdated'));
    });
  };

  const handleUpdateUser = async (draft: { id: string; email: string; role: string; permissions: Permission[] }) => {
    userManagement.setSavingUser(true);
    userManagement.setUserMessage(null);
    try {
      const updatedUser = await userManagement.updateUser(draft.id, {
        email: draft.email,
        role: draft.role,
        permissions: draft.permissions,
      });

      if (user?.id === updatedUser.id && token) {
        login(token, updatedUser);
      }

      userManagement.setEditingId(null);
      userManagement.setUserMessage(t('settings.messages.userUpdated'));
    } catch {
      userManagement.setUserMessage(t('settings.messages.errorUpdatingUser'));
    } finally {
      userManagement.setSavingUser(false);
    }
  };

  const handleSaveBranding = async () => {
    brandingForm.setSaving(true);
    brandingForm.setMessage(null);
    try {
      await updateBranding(brandingForm.form);
      brandingForm.setMessage(t('settings.messages.customizationSaved'));
    } catch {
      brandingForm.setMessage(t('settings.messages.errorSavingCustomization'));
    } finally {
      brandingForm.setSaving(false);
    }
  };

  const handleLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    brandingForm.setMessage(null);
    try {
      const logoDataUrl = await brandingForm.handleLogoChange(file);
      brandingForm.setForm((prev) => ({ ...prev, logoDataUrl }));
    } catch (error) {
      brandingForm.setMessage(error instanceof Error ? error.message : t('settings.messages.errorUploadingLogo'));
    } finally {
      event.target.value = '';
    }
  };


  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Settings className="text-cyan-400" />
          {t('settings.title')}
        </h1>
        <p className="text-slate-400 mt-1">{t('settings.subtitle')}</p>
      </div>

      {canViewUsers && (
        <UsersManagementSection
          expanded={expandedSections.users}
          canManage={canManageUsers}
          canResetPasswords={canResetPasswords}
          currentUserId={user?.id}
          users={editableUsers}
          loading={userManagement.loading}
          error={userManagement.error}
          newUser={userManagement.newUser}
          savingUser={userManagement.savingUser}
          userMessage={userManagement.userMessage}
          editingId={userManagement.editingId}
          showAddUserModal={userManagement.showAddUserModal}
          showInviteModal={showInviteModal}
          deleteTarget={userManagement.deleteTarget}
          deleteConfirmValue={userManagement.deleteConfirmValue}
          isDeletingUser={userManagement.isDeletingUser}
          deleteMessage={userManagement.deleteMessage}
          resetMessage={userManagement.resetMessage}
          onToggle={() => toggleSection('users')}
          onNewUserChange={(field, value) => {
            if (field === 'role') {
              userManagement.setNewUser((prev) => ({ ...prev, role: value, permissions: getPermissionsForRole(value) }));
            } else {
              userManagement.setNewUser((prev) => ({ ...prev, [field]: value }));
            }
          }}
          onTogglePermission={(permission) => {
            const next = userManagement.newUser.permissions.includes(permission)
              ? userManagement.newUser.permissions.filter((item) => item !== permission)
              : [...userManagement.newUser.permissions, permission];
            userManagement.setNewUser((prev) => ({ ...prev, permissions: next }));
          }}
          onShowAddModal={userManagement.setShowAddUserModal}
          onShowInviteModal={setShowInviteModal}
          onEditToggle={userManagement.setEditingId}
          onSaveUser={handleUpdateUser}
          onDeleteUser={(id, email) => {
            userManagement.setDeleteTarget({ id, email });
            userManagement.setDeleteConfirmValue('');
          }}
          onConfirmDelete={handleDeleteUser}
          onResetPassword={handleResetPassword}
          onCancelDelete={() => {
            userManagement.setDeleteTarget(null);
            userManagement.setDeleteConfirmValue('');
          }}
          onCreateUser={handleCreateUser}
        />
      )}

      {canManagePassword && (
        <PasswordManagementSection
          expanded={expandedSections.password}
          form={passwordManagement.form}
          message={passwordManagement.message}
          saving={passwordManagement.saving}
          onToggle={() => toggleSection('password')}
          onFormChange={(field, value) => passwordManagement.setForm((prev) => ({ ...prev, [field]: value }))}
          onChangePassword={handleChangePassword}
        />
      )}

      <AddressesSection
        expanded={expandedSections.addresses}
        addresses={addressManagement.addresses.map(a => ({ ...a, notes: a.notes ?? undefined }))}
        loading={addressManagement.loading}
        addressForm={addressManagement.addressForm}
        message={addressManagement.message}
        saving={addressManagement.saving}
        editingId={addressManagement.editingId}
        editingDraft={addressManagement.editingDraft}
        deletingId={addressManagement.deletingId}
        onToggle={() => toggleSection('addresses')}
        onFormChange={(field, value) => addressManagement.setAddressForm((prev) => ({ ...prev, [field]: value }))}
        onAddAddress={async () => {
          if (!addressManagement.addressForm.address || !addressManagement.addressForm.effectiveFrom) {
            addressManagement.setMessage(t('settings.addresses.addressAndDateRequired'));
            return;
          }
          addressManagement.setSaving(true);
          addressManagement.setMessage(null);
          try {
            await addressManagement.createAddress({
              address: addressManagement.addressForm.address,
              effectiveFrom: addressManagement.addressForm.effectiveFrom,
              notes: addressManagement.addressForm.notes || undefined,
            });
            addressManagement.setAddressForm({ address: '', effectiveFrom: '', notes: '' });
            addressManagement.setMessage(t('settings.addresses.addressAdded'));
          } catch {
            addressManagement.setMessage(t('settings.addresses.errorSaving'));
          } finally {
            addressManagement.setSaving(false);
          }
        }}
        onEditStart={(addr) => {
          addressManagement.setEditingId(addr.id);
          addressManagement.setEditingDraft({ address: addr.address, effectiveFrom: addr.effectiveFrom, notes: addr.notes ?? '' });
        }}
        onEditChange={(field, value) => addressManagement.setEditingDraft((prev) => ({ ...prev, [field]: value }))}
        onEditSave={async (id) => {
          try {
            await addressManagement.updateAddress(id, {
              address: addressManagement.editingDraft.address,
              effectiveFrom: addressManagement.editingDraft.effectiveFrom,
              notes: addressManagement.editingDraft.notes || undefined,
            });
            addressManagement.setEditingId(null);
          } catch {
            addressManagement.setMessage(t('settings.addresses.errorUpdating'));
          }
        }}
        onEditCancel={() => addressManagement.setEditingId(null)}
        onDeleteStart={addressManagement.setDeletingId}
        onDeleteConfirm={async (id) => {
          try {
            await addressManagement.deleteAddress(id);
            addressManagement.setDeletingId(null);
          } catch {
            addressManagement.setMessage(t('settings.addresses.errorDeleting'));
            addressManagement.setDeletingId(null);
          }
        }}
        onDeleteCancel={() => addressManagement.setDeletingId(null)}
      />

      {canManageUsers && (
        <DocumentSettingsSection
          expandedSections={expandedSections}
          docForm={docForm}
          modalityOptions={modalityOptions.map(opt => ({ ...opt, isDefault: opt.isDefault ? true : false }))}
          docMessage={docMessage}
          savingDoc={savingDoc}
          previewOpen={previewOpen}
          previewTemplate={previewTemplate}
          brandingOrganizationName={branding.name}
          onToggleSection={toggleSection}
          onFormChange={(field, value) => setDocForm((p) => ({ ...p, [field]: value }))}
          onSave={async (form) => { await saveDocSettings(form); }}
          onPreviewTemplateChange={setPreviewTemplate}
          onPreviewOpen={setPreviewOpen}
          modalityDraft={modalityDraft}
          editingModalityId={editingModalityId}
          editingModalityDraft={editingModalityDraft}
          onModalityDraftChange={setModalityDraft}
          onEditingModalityChange={setEditingModalityDraft}
          onEditingModalityIdChange={setEditingModalityId}
          onCreateModality={createModality}
          onUpdateModality={updateModality}
          onRemoveModality={removeModality}
        />
      )}

      {canManageUsers && previewOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setPreviewOpen(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
              <span className="text-sm font-semibold text-white">
                Preview — {{
                  convocation: 'Convocazione Ordinaria',
                  convocation_extraordinary_statute: 'Convocazione Straordinaria — Modifica Statuto',
                  convocation_extraordinary_dissolution: 'Convocazione Straordinaria — Scioglimento',
                  convocation_board: 'Convocazione Riunione CD',
                  minutes1a: 'Verbale 1a (deserta)',
                  minutes2a: 'Verbale 2a',
                  minutes_board: 'Verbale Riunione CD',
                }[previewTemplate] ?? previewTemplate}
              </span>
              <button onClick={() => setPreviewOpen(false)} className="text-slate-400 hover:text-white"><X size={16} /></button>
            </div>
            <pre className="overflow-y-auto p-6 text-sm text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
              {buildPreviewText(docForm, previewTemplate, branding.name)}
            </pre>
          </div>
        </div>
      )}

      {isCoreAdmin && (
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <button
            onClick={() => toggleSection('compliance')}
            className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-emerald-400" size={20} />
              <div className="text-left">
                <h2 className="text-lg font-semibold text-white">{t('settings.compliance.title')}</h2>
                <p className="text-sm text-slate-500">{t('settings.compliance.description')}</p>
              </div>
            </div>
            <ChevronDown size={20} className={`text-slate-400 transition-transform ${expandedSections.compliance ? 'rotate-180' : ''}`} />
          </button>

          {expandedSections.compliance && (
            <div className="space-y-4 max-w-3xl mx-auto">
              <div className="rounded-lg border border-amber-800/40 bg-amber-900/10 px-4 py-3 text-sm text-amber-300/80">
                {t('settings.compliance.warning')} {t('settings.compliance.labelsInfo', { example: 'compliance.documents.nda_dia' })}
              </div>
              {complianceLoading ? (
                <div className="flex items-center gap-3 rounded-lg border border-slate-700/50 bg-slate-900/80 px-4 py-5 text-sm text-slate-300">
                  <div className="h-5 w-5 border-4 border-slate-500 border-t-transparent rounded-full animate-spin" />
                  <span>{t('common.status.loading')}</span>
                </div>
              ) : complianceError ? (
                <div className="rounded-lg border border-red-700/50 bg-red-900/10 px-4 py-4 text-sm text-red-300">
                  {complianceError}
                </div>
              ) : (
                <ComplianceRulesEditor initialRules={rules} onSave={async (r) => { await saveRules(r); }} />
              )}
            </div>
          )}
        </section>
      )}

      {(isCoreAdmin || user?.role === 'admin') && (
        <>
          <ExportSection
            expanded={expandedSections.export}
            onToggle={() => toggleSection('export')}
          />
          <ImportSection
            expanded={expandedSections.import}
            onToggle={() => toggleSection('import')}
          />
        </>
      )}

      {/* Customization Section */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <button
          onClick={() => toggleSection('customization')}
          className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-3">
            <Sparkles className="text-purple-400" size={20} />
            <div className="text-left">
              <h2 className="text-lg font-semibold text-white">{t('settings.customization.title')}</h2>
              <p className="text-sm text-slate-500">{t('settings.customization.description')}</p>
            </div>
          </div>
          <ChevronDown size={20} className={`text-slate-400 transition-transform ${expandedSections.customization ? 'rotate-180' : ''}`} />
        </button>

        {expandedSections.customization && (
          <div className="space-y-4">
            {/* Theme Section */}
            <div className="rounded-lg border border-slate-700 bg-slate-800/50">
              <button
                className="flex w-full items-center justify-between p-4 hover:opacity-80 transition-opacity"
                onClick={() => toggleSection('theme')}
              >
                <div className="flex items-center gap-3">
                  <Palette className="text-cyan-400" size={18} />
                  <div className="text-left">
                    <h3 className="font-semibold text-slate-200">{t('settings.theme.title')}</h3>
                    <p className="text-xs text-slate-400">{t('settings.theme.description')}</p>
                  </div>
                </div>
                <ChevronDown
                  size={18}
                  className={`transition-transform ${expandedSections.theme ? 'rotate-180' : ''}`}
                />
              </button>
              {expandedSections.theme && (
                <div className="border-t border-slate-700 p-4">
                  <ThemeSection />
                </div>
              )}
            </div>

            {/* Branding Section */}
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 overflow-hidden">
              <BrandingSection
                expanded={expandedSections.branding}
                form={brandingForm.form}
                message={brandingForm.message}
                saving={brandingForm.saving}
                onToggle={() => toggleSection('branding')}
                onFormChange={(field, value) => brandingForm.setForm((prev) => ({ ...prev, [field]: value }))}
                onLogoChange={handleLogoChange}
                onSave={handleSaveBranding}
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
};


export default SettingsPage;
