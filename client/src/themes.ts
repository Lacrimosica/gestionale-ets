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
  // Niki brand palettes — see docs/brand/README.md. The interactive accents are darker
  // than the logo's vermilion/coral so white button text keeps ≥4.5:1 contrast.
  {
    key: 'niki-light',
    label: 'Niki Red (Light)',
    vars: {
      '--theme-bg-primary': '#F8F5F0',
      '--theme-bg-secondary': '#EFE9E2',
      '--theme-bg-surface': '#FCFAF7',
      '--theme-text-primary': '#1F1D24',
      '--theme-text-secondary': '#4A4650',
      '--theme-text-muted': '#8A8490',
      '--theme-accent-primary': '#C0303D',
      '--theme-accent-primary-hover': '#8E1B2C',
      '--theme-accent-secondary': '#E4572E',
      '--theme-border': '#E3DAD0',
      '--theme-sidebar-bg': '#1F1D24',
      '--theme-sidebar-text': '#F8F5F0',
      '--theme-sidebar-accent': '#EE7B67',
    },
  },
  {
    key: 'niki-dark',
    label: 'Niki Red (Dark)',
    vars: {
      '--theme-bg-primary': '#17151B',
      '--theme-bg-secondary': '#211E26',
      '--theme-bg-surface': '#26222C',
      '--theme-text-primary': '#F3EEE8',
      '--theme-text-secondary': '#B9B1AA',
      '--theme-text-muted': '#7D7680',
      '--theme-accent-primary': '#CF3F3F',
      '--theme-accent-primary-hover': '#B32F37',
      '--theme-accent-secondary': '#EE7B67',
      '--theme-border': '#3A3440',
      '--theme-sidebar-bg': '#121015',
      '--theme-sidebar-text': '#F3EEE8',
      '--theme-sidebar-accent': '#EE7B67',
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
  {
    key: 'dark-slate',
    label: 'Slate (Dark)',
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

// Custom themes only carry the legacy --theme-* variables. They borrow the token
// scales (index.css) of a preset with the same light/dark polarity, and their accent
// colours override the accent scale steps components actually use.
const CUSTOM_ACCENT_STEPS: Record<string, keyof ThemeVars> = {
  '--accent-300': '--theme-accent-secondary',
  '--accent-400': '--theme-accent-secondary',
  '--accent-500': '--theme-accent-primary-hover',
  '--accent-600': '--theme-accent-primary',
  '--accent-700': '--theme-accent-primary-hover',
};

const isLightColor = (hex: string): boolean => {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return false;
  const n = parseInt(match[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 140;
};

/** Apply a resolved theme: select its token palette and set the legacy variables. */
export const applyTheme = (themeKey: string, vars: ThemeVars): void => {
  const root = document.documentElement;
  const isPreset = PREDEFINED_THEME_KEYS.includes(themeKey);
  root.dataset.theme = isPreset
    ? themeKey
    : isLightColor(vars['--theme-bg-primary']) ? 'beige-blue-light' : 'dark-slate';

  applyThemeVars(vars);
  for (const [token, source] of Object.entries(CUSTOM_ACCENT_STEPS)) {
    if (!isPreset && vars[source]) root.style.setProperty(token, vars[source]);
    else root.style.removeProperty(token);
  }
};

export const applyThemeVars = (vars: ThemeVars): void => {
  const root = document.documentElement;
  for (const [prop, value] of Object.entries(vars)) {
    root.style.setProperty(prop, value);
  }
};

export const clearThemeVars = (): void => {
  const root = document.documentElement;
  delete root.dataset.theme;
  Object.keys(CUSTOM_ACCENT_STEPS).forEach((k) => root.style.removeProperty(k));
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
