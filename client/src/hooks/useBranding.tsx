import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import axios from 'axios';

import { API_BASE_URL } from '../config';
import { useAuth } from './useAuth';
const MAX_LOGO_FILE_SIZE = 800 * 1024;

export interface BrandingSettings {
  name: string;
  shortName: string;
  authDomain: string;
  tagline: string;
  supportEmail: string;
  logoDataUrl: string | null;
  createdAt?: string | null;
}

export interface BrandingUpdateInput {
  name: string;
  shortName: string;
  authDomain: string;
  tagline: string;
  supportEmail: string;
  logoDataUrl: string | null;
}

const defaultBranding: BrandingSettings = {
  name: 'Organizzazione',
  shortName: 'Gestionale',
  authDomain: '',
  tagline: 'Accesso area riservata',
  supportEmail: '',
  logoDataUrl: null,
  createdAt: null,
};

interface BrandingContextType {
  branding: BrandingSettings;
  loading: boolean;
  refreshBranding: () => Promise<BrandingSettings>;
  updateBranding: (input: BrandingUpdateInput) => Promise<BrandingSettings>;
}

const BrandingContext = createContext<BrandingContextType | null>(null);

export const fetchPublicBranding = async () => {
  try {
    const response = await axios.get<BrandingSettings>(`${API_BASE_URL}/settings/branding`);
    return { ...defaultBranding, ...response.data };
  } catch (error) {
    console.warn('Failed to fetch branding, using defaults', error);
    return defaultBranding;
  }
};

export const updateBrandingSettings = async (input: BrandingUpdateInput) => {
  const response = await axios.put<BrandingSettings>(`${API_BASE_URL}/settings/branding`, input);
  return { ...defaultBranding, ...response.data };
};

export const readLogoFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    if (file.size > MAX_LOGO_FILE_SIZE) {
      reject(new Error('Il logo supera il limite di 800KB.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('Impossibile leggere il file selezionato.'));
    };
    reader.onerror = () => reject(new Error('Impossibile leggere il file selezionato.'));
    reader.readAsDataURL(file);
  });

export const BrandingProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const [branding, setBranding] = useState<BrandingSettings>(defaultBranding);
  const [loading, setLoading] = useState(true);

  const refreshBranding = async () => {
    const nextBranding = await fetchPublicBranding();
    setBranding(nextBranding);
    return nextBranding;
  };

  const updateBranding = async (input: BrandingUpdateInput) => {
    const nextBranding = await updateBrandingSettings(input);
    setBranding(nextBranding);
    return nextBranding;
  };

  useEffect(() => {
    const load = async () => {
      if (!isAuthenticated) {
        setBranding(defaultBranding);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        await refreshBranding();
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isAuthenticated]);

  useEffect(() => {
    document.title = branding.shortName === 'Gestionale' ? 'Gestionale' : `${branding.shortName} Gestionale`;
  }, [branding.shortName]);

  return (
    <BrandingContext.Provider value={{ branding, loading, refreshBranding, updateBranding }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};
