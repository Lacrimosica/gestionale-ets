import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './auth-context';
import {
  BrandingContext,
  defaultBranding,
  fetchPublicBranding,
  updateBrandingSettings,
  type BrandingSettings,
  type BrandingUpdateInput,
} from './branding-context';

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
    document.title = branding.shortName === 'Gestionale' ? 'Niki' : `${branding.shortName} | Niki`;
  }, [branding.shortName]);

  return (
    <BrandingContext.Provider value={{ branding, loading, refreshBranding, updateBranding }}>
      {children}
    </BrandingContext.Provider>
  );
};
