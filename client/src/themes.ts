export interface ThemeVars {
  '--theme-bg-primary': string;
  '--theme-bg-secondary': string;
  '--theme-bg-surface': string;
  '--theme-text-primary': string;
  '--theme-text-secondary': string;
  '--theme-text-muted': string;
  '--theme-accent-primary': string;
  '--theme-accent-primary-hover': string;
  '--theme-accent-secondary': string;
  '--theme-border': string;
  '--theme-sidebar-bg': string;
  '--theme-sidebar-text': string;
  '--theme-sidebar-accent': string;
}

export interface ThemeDefinition {
  key: string;
  label: string;
  vars: ThemeVars;
}

export const PREDEFINED_THEMES: ThemeDefinition[] = [
  {
    key: 'dark-slate',
    label: 'Dark Slate (Default)',
    vars: {
      '--theme-bg-primary': '#0f172a',
      '--theme-bg-secondary': '#1e293b',
      '--theme-bg-surface': '#1e293b',
      '--theme-text-primary': '#e2e8f0',
      '--theme-text-secondary': '#94a3b8',
      '--theme-text-muted': '#64748b',
      '--theme-accent-primary': '#3b82f6',
      '--theme-accent-primary-hover': '#2563eb',
      '--theme-accent-secondary': '#60a5fa',
      '--theme-border': '#334155',
      '--theme-sidebar-bg': '#0f172a',
      '--theme-sidebar-text': '#e2e8f0',
      '--theme-sidebar-accent': '#3b82f6',
    },
  },
  {
    key: 'beige-blue-light',
    label: 'Beige & Blue (Light)',
    vars: {
      '--theme-bg-primary': '#f5f0e8',
      '--theme-bg-secondary': '#ede7d9',
      '--theme-bg-surface': '#faf7f2',
      '--theme-text-primary': '#1e293b',
      '--theme-text-secondary': '#475569',
      '--theme-text-muted': '#94a3b8',
      '--theme-accent-primary': '#2563eb',
      '--theme-accent-primary-hover': '#1d4ed8',
      '--theme-accent-secondary': '#3b82f6',
      '--theme-border': '#d6cfc4',
      '--theme-sidebar-bg': '#1e293b',
      '--theme-sidebar-text': '#e2e8f0',
      '--theme-sidebar-accent': '#3b82f6',
    },
  },
];

export const PREDEFINED_THEME_KEYS = PREDEFINED_THEMES.map((t) => t.key);

export const resolveTheme = (stored: string): ThemeVars | null => {
  const preset = PREDEFINED_THEMES.find((t) => t.key === stored);
  if (preset) return preset.vars;

  try {
    const parsed = JSON.parse(stored);
    if (typeof parsed === 'object' && parsed !== null && '--theme-bg-primary' in parsed) {
      return parsed as ThemeVars;
    }
  } catch {
    // ignore
  }

  return null;
};

export const applyThemeVars = (vars: ThemeVars): void => {
  const root = document.documentElement;
  for (const [prop, value] of Object.entries(vars)) {
    root.style.setProperty(prop, value);
  }
};

export const clearThemeVars = (): void => {
  const root = document.documentElement;
  const keys: (keyof ThemeVars)[] = [
    '--theme-bg-primary',
    '--theme-bg-secondary',
    '--theme-bg-surface',
    '--theme-text-primary',
    '--theme-text-secondary',
    '--theme-text-muted',
    '--theme-accent-primary',
    '--theme-accent-primary-hover',
    '--theme-accent-secondary',
    '--theme-border',
    '--theme-sidebar-bg',
    '--theme-sidebar-text',
    '--theme-sidebar-accent',
  ];
  keys.forEach((k) => root.style.removeProperty(k));
};
