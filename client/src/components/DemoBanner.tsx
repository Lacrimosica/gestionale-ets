import { useTranslation } from 'react-i18next';

// Published in the README so visitors can try the app; this account cannot change
// its password or manage users, and the whole demo database is reset nightly.
const DEMO_EMAIL = 'demo@example.org';
const DEMO_PASSWORD = 'demo-gestionale';

/** Strip shown on every page of the public demo build. */
const DemoBanner = () => {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      className="w-full bg-amber-400 text-amber-950 text-xs sm:text-sm px-4 py-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center"
    >
      <span className="font-black uppercase tracking-widest">{t('demo.label')}</span>
      <span>{t('demo.message')}</span>
      <span className="font-mono">{t('demo.credentials', { email: DEMO_EMAIL, password: DEMO_PASSWORD })}</span>
    </div>
  );
};

export default DemoBanner;
