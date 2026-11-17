import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import ConsentRow from '../ui/ConsentRow';

interface PrivacyStatusSectionProps {
  privacyStatus?: any;
}

const PrivacyStatusSection = ({ privacyStatus }: PrivacyStatusSectionProps) => {
  const { t } = useTranslation();

  return (
    <div className="border border-neutral-800 rounded-xl p-5 bg-neutral-950/40 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-fg">{t('people.currentPrivacy', { defaultValue: 'Current Privacy' })}</h3>
          <p className="text-sm text-neutral-400 mt-1">{t('people.currentPrivacySubtitle', { defaultValue: 'Currently valid privacy version and consents.' })}</p>
        </div>
      </div>

      {privacyStatus ? (
        <div className="space-y-3">
          <div className="text-fg font-semibold">{t('common.fields.version')}: {privacyStatus.version || 'N/D'}</div>
          {Object.entries(privacyStatus.consentsByType).length > 0 ? (
            Object.entries(privacyStatus.consentsByType).map(([type, entry]) => (
              <ConsentRow
                key={type}
                label={t(`people.consents.${type}`, { defaultValue: type })}
                value={(entry as any).status === 'granted'}
              />
            ))
          ) : (
            <div className="text-sm text-neutral-500 italic">{t('people.noConsentsRecorded', { defaultValue: 'No consents recorded for this document.' })}</div>
          )}
          {privacyStatus.driveUrl && (
            <a href={privacyStatus.driveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-accent-300 hover:text-accent-200">
              {t('compliance.openDriveLink', { defaultValue: 'Open Drive link' })} <ExternalLink size={14} />
            </a>
          )}
        </div>
      ) : (
        <div className="text-sm text-neutral-500 italic">{t('people.noCurrentPrivacy', { defaultValue: 'No current privacy document.' })}</div>
      )}
    </div>
  );
};

export default PrivacyStatusSection;
