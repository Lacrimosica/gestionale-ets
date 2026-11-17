import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, ChevronDown, ImageUp, Save } from 'lucide-react';

interface BrandingFormState {
  name: string;
  shortName: string;
  authDomain: string;
  tagline: string;
  supportEmail: string;
  logoDataUrl: string | null;
}

interface BrandingSectionProps {
  expanded: boolean;
  form: BrandingFormState;
  message: string | null;
  saving: boolean;
  onToggle: () => void;
  onFormChange: (field: keyof BrandingFormState, value: any) => void;
  onLogoChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
}

export const BrandingSection = ({
  expanded,
  form,
  message,
  saving,
  onToggle,
  onFormChange,
  onLogoChange,
  onSave,
}: BrandingSectionProps) => {
  const { t } = useTranslation();

  return (
    <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-xl space-y-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-3">
          <Building2 className="text-special-400" />
          <div className="text-left">
            <h2 className="text-lg font-semibold text-fg">{t('settings.branding.title')}</h2>
            <p className="text-sm text-neutral-500">{t('settings.branding.description')}</p>
          </div>
        </div>
        <ChevronDown size={20} className={`text-neutral-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="space-y-4 max-w-3xl mx-auto">
          <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 px-4 py-3 text-sm text-neutral-300">
            {t('settings.branding.currentCustomization')}
          </div>

          <div className="flex flex-col gap-4">
            <div className="border border-neutral-800 rounded-xl p-5 bg-neutral-950/40 space-y-4">
              <div className="h-56 rounded-2xl border border-dashed border-neutral-700 bg-neutral-950 flex items-center justify-center overflow-hidden">
                {form.logoDataUrl ? (
                  <img src={form.logoDataUrl} alt={`Logo ${form.name}`} className="h-full w-full object-contain p-4" />
                ) : (
                  <div className="text-center px-6">
                    <div className="mx-auto mb-3 h-16 w-16 rounded-2xl bg-special-500/10 border border-special-500/20 text-special-300 flex items-center justify-center text-2xl font-bold">
                      {form.shortName.slice(0, 2).toUpperCase() || 'AS'}
                    </div>
                    <p className="text-sm text-neutral-400">{t('settings.branding.noLogoUploaded')}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <label className="inline-flex items-center justify-center gap-2 bg-special-600 hover:bg-special-500 text-white px-4 py-2 rounded-lg font-semibold cursor-pointer">
                  <ImageUp size={16} />
                  {t('settings.branding.uploadLogo')}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={onLogoChange}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => onFormChange('logoDataUrl', null)}
                  className="text-sm text-neutral-400 hover:text-fg"
                >
                  {t('settings.branding.removeLogo')}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <label className="block">
                  <span className="block text-xs text-neutral-500 mb-1">{t('settings.branding.fullOrganizationName')}</span>
                  <input
                    value={form.name}
                    onChange={(e) => onFormChange('name', e.target.value)}
                    placeholder={t('settings.branding.fullOrganizationNamePlaceholder')}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-fg"
                  />
                </label>
                <label className="block">
                  <span className="block text-xs text-neutral-500 mb-1">{t('settings.branding.shortName')}</span>
                  <input
                    value={form.shortName}
                    onChange={(e) => onFormChange('shortName', e.target.value)}
                    placeholder={t('settings.branding.shortNamePlaceholder')}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-fg"
                  />
                </label>
              </div>

              <label className="block">
                <span className="block text-xs text-neutral-500 mb-1">{t('settings.branding.loginDomain')}</span>
                <input
                  value={form.authDomain}
                  onChange={(e) => onFormChange('authDomain', e.target.value.toLowerCase())}
                  placeholder={t('settings.branding.loginDomainPlaceholder')}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-fg"
                />
              </label>

              <label className="block">
                <span className="block text-xs text-neutral-500 mb-1">{t('settings.branding.tagline')}</span>
                <input
                  value={form.tagline}
                  onChange={(e) => onFormChange('tagline', e.target.value)}
                  placeholder={t('settings.branding.taglinePlaceholder')}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-fg"
                />
              </label>

              <label className="block">
                <span className="block text-xs text-neutral-500 mb-1">{t('settings.branding.supportEmail')}</span>
                <input
                  value={form.supportEmail}
                  onChange={(e) => onFormChange('supportEmail', e.target.value)}
                  placeholder={t('settings.branding.supportEmailPlaceholder')}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-fg"
                />
              </label>

              <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
                <p className="text-xs uppercase tracking-wider text-neutral-500 mb-2">{t('settings.branding.previewTitle')}</p>
                <p className="text-xl font-semibold text-fg">{form.shortName || t('settings.branding.previewShortNameDefault')}</p>
                <p className="text-sm text-neutral-400 mt-1">{form.name || t('settings.branding.previewOrganizationNameDefault')}</p>
                {form.authDomain && <p className="text-xs text-info-300 mt-2">{t('settings.branding.accessDomain', { domain: form.authDomain })}</p>}
                {form.tagline && <p className="text-sm text-neutral-500 mt-2">{form.tagline}</p>}
              </div>

              {message && <p className="text-sm text-neutral-300">{message}</p>}

              <button
                onClick={onSave}
                disabled={saving}
                className="inline-flex items-center gap-2 bg-special-600 hover:bg-special-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold"
              >
                <Save size={16} />
                {t('settings.branding.saveCustomization')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
