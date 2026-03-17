import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import axios from 'axios';

import { API_BASE_URL } from '../config';
const MAX_LOGO_FILE_SIZE = 800 * 1024;

export interface BrandingSettings {
  organizationName: string;
  shortName: string;
  authDomain: string;
  tagline: string;
  supportEmail: string;
  logoDataUrl: string | null;
  updatedAt?: string | null;
}

export interface BrandingUpdateInput {
  organizationName: string;
  shortName: string;
  authDomain: string;
  tagline: string;
  supportEmail: string;
  logoDataUrl: string | null;
}

export interface ResolvedBrandingSettings extends BrandingSettings {
  matchedDomain: boolean;
  enteredDomain: string;
}

const defaultBranding: BrandingSettings = {
  organizationName: 'Organizzazione',
  shortName: 'Gestionale',
  authDomain: '',
  tagline: 'Accesso area riservata',
  supportEmail: '',
  logoDataUrl: null,
  updatedAt: null,
};

interface BrandingContextType {
  branding: BrandingSettings;
  loading: boolean;
  refreshBranding: () => Promise<BrandingSettings>;
  updateBranding: (input: BrandingUpdateInput) => Promise<BrandingSettings>;
}

const BrandingContext = createContext<BrandingContextType | null>(null);

export const fetchPublicBranding = async () => {
  const response = await axios.get<BrandingSettings>(`${API_BASE_URL}/settings/public/branding`);
  return { ...defaultBranding, ...response.data };
};

export const updateBrandingSettings = async (input: BrandingUpdateInput) => {
  const response = await axios.put<BrandingSettings>(`${API_BASE_URL}/settings/branding`, input);
  return { ...defaultBranding, ...response.data };
};

export const resolveBrandingForDomain = async (domain: string) => {
  const response = await axios.get<ResolvedBrandingSettings>(`${API_BASE_URL}/settings/public/branding/resolve`, {
    params: { domain },
  });
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
      setLoading(true);
      try {
        await refreshBranding();
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

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
