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
                ? 'border-blue-500 bg-blue-500/10 text-blue-400 font-semibold'
                : 'border-slate-700 text-slate-300 hover:border-slate-500'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span
              className="inline-block h-4 w-4 rounded-full border border-white/20"
              style={{ backgroundColor: theme.vars['--theme-bg-primary'] }}
            />
            {theme.label}
          </button>
        ))}
      </div>

      {/* Custom theme toggle */}
      <button
        className="text-xs text-slate-400 hover:text-slate-200 underline"
        onClick={() => setShowCustom((v) => !v)}
      >
        {showCustom ? t('settings.theme.hideCustom') : t('settings.theme.createCustom')}
      </button>

      {showCustom && (
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 space-y-3">
          <p className="text-xs text-slate-400">{t('settings.theme.customDescription')}</p>
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
              <span className="text-slate-300">{label}</span>
              <input
                type="color"
                value={(customVars[cssVar] as string) ?? '#000000'}
                onChange={(e) => setCustomVars((prev) => ({ ...prev, [cssVar]: e.target.value }))}
                className="h-8 w-12 rounded cursor-pointer border border-slate-600"
              />
            </label>
          ))}
          <button
            onClick={handleCustomSave}
            disabled={saving}
            className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? t('common.status.saving') : t('settings.theme.applyCustom')}
          </button>
        </div>
      )}
    </div>
  );
};
