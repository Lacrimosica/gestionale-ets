import { useState, useEffect } from 'react';
import { readLogoFileAsDataUrl } from './useBranding';

interface BrandingFormState {
  name: string;
  shortName: string;
  authDomain: string;
  tagline: string;
  supportEmail: string;
  logoDataUrl: string | null;
}

export const useBrandingForm = (initialBranding: BrandingFormState) => {
  const [form, setForm] = useState(initialBranding);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initialBranding);
  }, [initialBranding]);

  const handleLogoChange = async (file: File): Promise<string | null> => {
    try {
      return await readLogoFileAsDataUrl(file);
    } catch (error) {
      throw error;
    }
  };

  return {
    form,
    setForm,
    message,
    setMessage,
    saving,
    setSaving,
    handleLogoChange,
  };
};
