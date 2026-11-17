import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { PREDEFINED_THEMES, type ThemeVars } from '../../themes';

export const ThemeSection = () => {
  const { t } = useTranslation();
  const { themeKey, setTheme, loading } = useTheme();

  const [customVars, setCustomVars] = useState<Partial<ThemeVars>>({});
  const [showCustom, setShowCustom] = useState(false);
  const [saving, setSaving] = useState(false);

  const handlePresetSelect = async (key: string) => {
    setSaving(true);
    try {
      await setTheme(key);
    } finally {
      setSaving(false);
    }
  };

  const handleCustomSave = async () => {
    setSaving(true);
    try {
      await setTheme(JSON.stringify(customVars));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Preset swatches */}
      <div className="flex flex-wrap gap-3">
        {PREDEFINED_THEMES.map((theme) => (
          <button
            key={theme.key}
            onClick={() => handlePresetSelect(theme.key)}
            disabled={saving || loading}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-all
              ${themeKey === theme.key
                ? 'border-accent-500 bg-accent-500/10 text-accent-400 font-semibold'
                : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span
              className="inline-block h-4 w-4 rounded-full border border-neutral-500/40"
              style={{ backgroundColor: theme.vars['--theme-accent-primary'] }}
              aria-hidden="true"
            />
            {theme.label}
          </button>
        ))}
      </div>

      {/* Custom theme toggle */}
      <button
        className="text-xs text-neutral-400 hover:text-neutral-200 underline"
        onClick={() => setShowCustom((v) => !v)}
      >
        {showCustom ? t('settings.theme.hideCustom') : t('settings.theme.createCustom')}
      </button>

      {showCustom && (
        <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-4 space-y-3">
          <p className="text-xs text-neutral-400">{t('settings.theme.customDescription')}</p>
          {(
            [
              ['--theme-bg-primary', t('settings.theme.bgPrimary')] as const,
              ['--theme-bg-secondary', t('settings.theme.bgSecondary')] as const,
              ['--theme-text-primary', t('settings.theme.textPrimary')] as const,
              ['--theme-accent-primary', t('settings.theme.accentPrimary')] as const,
              ['--theme-sidebar-bg', t('settings.theme.sidebarBg')] as const,
            ] as [keyof ThemeVars, string][]
          ).map(([cssVar, label]) => (
            <label key={cssVar} className="flex items-center justify-between text-sm">
              <span className="text-neutral-300">{label}</span>
              <input
                type="color"
                value={(customVars[cssVar] as string) ?? '#000000'}
                onChange={(e) => setCustomVars((prev) => ({ ...prev, [cssVar]: e.target.value }))}
                className="h-8 w-12 rounded cursor-pointer border border-neutral-600"
              />
            </label>
          ))}
          <button
            onClick={handleCustomSave}
            disabled={saving}
            className="w-full rounded bg-accent-600 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? t('common.status.saving') : t('settings.theme.applyCustom')}
          </button>
        </div>
      )}
    </div>
  );
};
