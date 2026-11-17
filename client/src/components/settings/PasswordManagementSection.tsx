import { useTranslation } from 'react-i18next';
import { LockKeyhole, ChevronDown, Shield } from 'lucide-react';

interface PasswordManagementSectionProps {
  expanded: boolean;
  form: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  };
  message: string | null;
  saving: boolean;
  onToggle: () => void;
  onFormChange: (field: 'currentPassword' | 'newPassword' | 'confirmPassword', value: string) => void;
  onChangePassword: () => void;
}

export const PasswordManagementSection = ({
  expanded,
  form,
  message,
  saving,
  onToggle,
  onFormChange,
  onChangePassword,
}: PasswordManagementSectionProps) => {
  const { t } = useTranslation();

  return (
    <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-xl space-y-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-3">
          <LockKeyhole className="text-success-400" />
          <div className="text-left">
            <h2 className="text-lg font-semibold text-fg">{t('settings.password.title')}</h2>
            <p className="text-sm text-neutral-500">{t('settings.password.description')}</p>
          </div>
        </div>
        <ChevronDown size={20} className={`text-neutral-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="space-y-4 max-w-3xl mx-auto">
          <div className="grid grid-cols-1 gap-4">
            <input
              type="password"
              placeholder={t('settings.password.currentPasswordPlaceholder')}
              value={form.currentPassword}
              onChange={(e) => onFormChange('currentPassword', e.target.value)}
              className="bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-fg"
            />
            <input
              type="password"
              placeholder={t('settings.password.newPasswordPlaceholder')}
              value={form.newPassword}
              onChange={(e) => onFormChange('newPassword', e.target.value)}
              className="bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-fg"
            />
            <input
              type="password"
              placeholder={t('settings.password.confirmPasswordPlaceholder')}
              value={form.confirmPassword}
              onChange={(e) => onFormChange('confirmPassword', e.target.value)}
              className="bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-fg"
            />
          </div>

          {message && <p className="text-sm text-neutral-300">{message}</p>}

          <button
            onClick={onChangePassword}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-success-600 hover:bg-success-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold"
          >
            <Shield size={16} />
            {t('settings.password.updatePassword')}
          </button>
        </div>
      )}
    </section>
  );
};
