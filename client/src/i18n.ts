import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import enTranslations from './locales/en/common.json';
import itTranslations from './locales/it/common.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations
      },
      it: {
        translation: itTranslations
      }
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    }
  });

i18n.on('languageChanged', (lng) => {
  if (typeof document !== 'undefined') {
    const htmlDoc = document.documentElement;
    // Use en-GB for English to force European date/time formatting in native pickers
    htmlDoc.setAttribute('lang', lng === 'it' ? 'it' : 'en-GB');
  }
});

// Initial set
if (typeof document !== 'undefined') {
  const initialLng = i18n.language || 'en';
  document.documentElement.setAttribute('lang', initialLng === 'it' ? 'it' : 'en-GB');
}

i18n.on('languageChanged', (lng) => {
  const htmlDoc = document.documentElement;
  // If English, use 'en-GB' to force European formatting in pickers (DD/MM/YYYY and 24h)
  htmlDoc.setAttribute('lang', lng === 'it' ? 'it' : 'en-GB');
});

export default i18n;

