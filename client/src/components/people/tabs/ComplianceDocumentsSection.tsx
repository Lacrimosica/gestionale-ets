import { useTranslation } from 'react-i18next';
import { Clock, AlertTriangle, ExternalLink } from 'lucide-react';
import { formatDate } from '../../../lib/date-utils';
import type { ComplianceDocument, ComplianceFlag, ComplianceRules } from '../../../hooks/useCompliance';

interface ComplianceDocumentsSectionProps {
  documents?: ComplianceDocument[];
  rules?: ComplianceRules;
  canEdit: boolean;
  onAddDocument: () => void;
  onEditDocument: (document: ComplianceDocument) => void;
  onDeleteDocument: (documentId: string, docType: string) => void;
  onFlagDocument: (documentId: string) => void;
  onEditFlag: (documentId: string, flag: ComplianceFlag) => void;
  onDeleteFlag: (flagId: string) => void;
}

const ComplianceDocumentsSection = ({
  documents,
  rules,
  canEdit,
  onAddDocument,
  onEditDocument,
  onDeleteDocument,
  onFlagDocument,
  onEditFlag,
  onDeleteFlag,
}: ComplianceDocumentsSectionProps) => {
  const { t } = useTranslation();

  const sortedDocuments = documents?.slice().sort((a, b) => (b.signedAt || b.createdAt).localeCompare(a.signedAt || a.createdAt)) ?? [];

  return (
    <div className="border border-neutral-800 rounded-xl p-5 bg-neutral-950/40 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-fg">{t('compliance.documentsTitle', { defaultValue: 'Documents' })}</h3>
          <p className="text-sm text-neutral-400 mt-1">{t('compliance.documentsSubtitle', { defaultValue: 'NDAs, privacy, enrollment and membership forms.' })}</p>
        </div>
        {canEdit && (
          <button onClick={onAddDocument} className="bg-accent-600 hover:bg-accent-500 text-white px-3 py-2 rounded-lg text-sm font-semibold">
            {t('compliance.addDocument', { defaultValue: 'Add Document' })}
          </button>
        )}
      </div>

      <div className="space-y-4">
        {sortedDocuments.length ? sortedDocuments.map((document) => {
          const docTypeConfig = rules?.documentTypes[document.documentType];
          const currentVersion = docTypeConfig?.currentVersion;
          const isSuperseded = !document.isCurrent;
          const isVersionOutdated = document.isCurrent && !!currentVersion && !!document.version && document.version !== currentVersion;
          const requiredConsentTypes: string[] =
            docTypeConfig?.consentTypes && docTypeConfig.consentTypes.length > 0
              ? docTypeConfig.consentTypes
              : docTypeConfig?.hasConsents
                ? ['third_party', 'image_use']
                : [];
          const missingConsents = document.isCurrent && requiredConsentTypes.filter(
            ct => !document.consentsByType?.[ct]
          );
          const hasMissingConsents = !!(missingConsents && missingConsents.length > 0);

          return (
            <div
              key={document.id}
              className={`border rounded-xl p-4 transition-colors ${
                isSuperseded
                  ? 'border-neutral-700 bg-neutral-950/20 opacity-70'
                  : isVersionOutdated
                    ? 'border-warning-900/50 bg-warning-950/10'
                    : 'border-neutral-800'
              }`}
            >
              {(isSuperseded || isVersionOutdated || hasMissingConsents) && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {isSuperseded && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-neutral-800 text-neutral-400 border border-neutral-700">
                      {t('compliance.badges.superseded', { defaultValue: 'Superseded' })}
                    </span>
                  )}
                  {isVersionOutdated && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-warning-900/40 text-warning-300 border border-warning-800/60">
                      <Clock size={10} />
                      {t('compliance.badges.outdatedVersion', { defaultValue: 'Outdated version' })}
                    </span>
                  )}
                  {hasMissingConsents && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-warning-900/30 text-warning-400 border border-warning-800/50">
                      <AlertTriangle size={10} />
                      {t('compliance.badges.consentsNotRecorded', { defaultValue: 'Consents not recorded' })}
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <div className="font-semibold text-fg">
                    {docTypeConfig?.label ? t(docTypeConfig.label as string) : document.documentType}
                  </div>
                  <div className="text-sm text-neutral-400">
                    {t('common.fields.version')}: {document.version || 'N/D'} | {t('common.fields.signedAt', { defaultValue: 'Data firma' })}: {document.signedAt ? formatDate(document.signedAt) : 'N/D'} | <span>{t('compliance.states.isCurrent')}: <span className={document.isCurrent ? 'text-success-400 font-medium' : 'text-danger-400 font-medium'}>{document.isCurrent ? t('common.status.yes') : t('common.status.no')}</span></span>
                  </div>
                  <div className="text-sm text-neutral-500 flex flex-wrap gap-x-3">
                    <span>{t('compliance.states.isSigned')}: <span className={document.isSigned ? 'text-success-400 font-medium' : 'text-danger-400 font-medium'}>{document.isSigned ? t('common.status.yes') : t('common.status.no')}</span></span>
                    <span>{t('compliance.states.isDated')}: <span className={document.isDated ? 'text-success-400 font-medium' : 'text-danger-400 font-medium'}>{document.isDated ? t('common.status.yes') : t('common.status.no')}</span></span>
                  </div>
                  {document.driveUrl && (
                    <a href={document.driveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-accent-300 hover:text-accent-200">
                      {t('compliance.openDriveLink')} <ExternalLink size={14} />
                    </a>
                  )}
                  {document.notes && <div className="text-xs text-neutral-500">{document.notes}</div>}
                </div>
                {canEdit && (
                  <div className="flex items-center gap-3 shrink-0">
                    <button onClick={() => onEditDocument(document)} className="text-sm text-accent-300 hover:text-accent-200">
                      {t('common.actions.edit')}
                    </button>
                    <button onClick={() => onFlagDocument(document.id)} className="text-sm text-warning-300 hover:text-warning-200">
                      Flag
                    </button>
                    <button onClick={() => onDeleteDocument(document.id, document.documentType)} className="text-sm text-danger-400 hover:text-danger-300">
                      {t('common.actions.delete')}
                    </button>
                  </div>
                )}
              </div>

              {document.flags?.length > 0 && (
                <div className="mt-4 space-y-2">
                  {document.flags.map((flag) => (
                    <div key={flag.id} className="text-sm border border-neutral-800 bg-neutral-900/60 rounded-lg px-3 py-2 text-neutral-300">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="font-semibold text-fg">{flag.label}</span>
                          <span className="text-neutral-500"> ({flag.severity})</span>
                          {flag.note ? ` - ${flag.note}` : ''}
                        </div>
                        {canEdit && (
                          <div className="flex items-center gap-3 shrink-0">
                            <button onClick={() => onEditFlag(document.id, flag)} className="text-accent-300 hover:text-accent-200 text-xs">
                              {t('common.actions.edit')}
                            </button>
                            <button onClick={() => onDeleteFlag(flag.id)} className="text-danger-400 hover:text-danger-300 text-xs">
                              {t('common.actions.delete')}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        }) : (
          <div className="text-sm text-neutral-500 italic">{t('people.noDocuments', { defaultValue: 'No documents registered.' })}</div>
        )}
      </div>
    </div>
  );
};

export default ComplianceDocumentsSection;
