import { createContext, useContext } from 'react';
import axios from 'axios';

import { API_BASE_URL } from '../config';

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

export const defaultBranding: BrandingSettings = {
  name: 'Organizzazione',
  shortName: 'Gestionale',
  authDomain: '',
  tagline: 'Accesso area riservata',
  supportEmail: '',
  logoDataUrl: null,
  createdAt: null,
};

export interface BrandingContextType {
  branding: BrandingSettings;
  loading: boolean;
  refreshBranding: () => Promise<BrandingSettings>;
  updateBranding: (input: BrandingUpdateInput) => Promise<BrandingSettings>;
}

export const BrandingContext = createContext<BrandingContextType | null>(null);

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

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};
