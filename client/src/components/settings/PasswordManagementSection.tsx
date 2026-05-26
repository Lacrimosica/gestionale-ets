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
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-3">
          <LockKeyhole className="text-emerald-400" />
          <div className="text-left">
            <h2 className="text-lg font-semibold text-white">{t('settings.password.title')}</h2>
            <p className="text-sm text-slate-500">{t('settings.password.description')}</p>
          </div>
        </div>
        <ChevronDown size={20} className={`text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="space-y-4 max-w-3xl mx-auto">
          <div className="grid grid-cols-1 gap-4">
            <input
              type="password"
              placeholder={t('settings.password.currentPasswordPlaceholder')}
              value={form.currentPassword}
              onChange={(e) => onFormChange('currentPassword', e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
            />
            <input
              type="password"
              placeholder={t('settings.password.newPasswordPlaceholder')}
              value={form.newPassword}
              onChange={(e) => onFormChange('newPassword', e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
            />
            <input
              type="password"
              placeholder={t('settings.password.confirmPasswordPlaceholder')}
              value={form.confirmPassword}
              onChange={(e) => onFormChange('confirmPassword', e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
            />
          </div>

          {message && <p className="text-sm text-slate-300">{message}</p>}

          <button
            onClick={onChangePassword}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold"
          >
            <Shield size={16} />
            {t('settings.password.updatePassword')}
          </button>
        </div>
      )}
    </section>
  );
};
