import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import axios from 'axios';
import { resolveTheme, applyThemeVars, clearThemeVars, PREDEFINED_THEMES, type ThemeVars } from '../themes';
import { useAuth } from './useAuth';
import { API_BASE_URL } from '../config';

interface ThemeContextType {
  themeKey: string;
  themeVars: ThemeVars | null;
  loading: boolean;
  setTheme: (themeKeyOrJson: string) => Promise<void>;
  isPreset: boolean;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const DEFAULT_THEME_KEY = 'dark-slate';

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const [themeKey, setThemeKey] = useState<string>(DEFAULT_THEME_KEY);
  const [themeVars, setThemeVars] = useState<ThemeVars | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      clearThemeVars();
      setThemeKey(DEFAULT_THEME_KEY);
      setThemeVars(null);
      return;
    }

    const fetchPreferences = async () => {
      setLoading(true);
      try {
        const response = await axios.get<{ theme: string }>(`${API_BASE_URL}/settings/user-preferences`);
        const stored = response.data.theme ?? DEFAULT_THEME_KEY;
        const vars = resolveTheme(stored);
        setThemeKey(stored);
        setThemeVars(vars);
        if (vars) applyThemeVars(vars);
      } catch {
        const fallback = resolveTheme(DEFAULT_THEME_KEY)!;
        setThemeVars(fallback);
        applyThemeVars(fallback);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [isAuthenticated]);

  const setTheme = useCallback(async (value: string) => {
    const vars = resolveTheme(value);
    if (vars) {
      setThemeKey(value);
      setThemeVars(vars);
      applyThemeVars(vars);
    }

    await axios.put(`${API_BASE_URL}/settings/user-preferences`, { theme: value });
  }, []);

  const isPreset = PREDEFINED_THEMES.some((t) => t.key === themeKey);

  return (
    <ThemeContext.Provider value={{ themeKey, themeVars, loading, setTheme, isPreset }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
};
