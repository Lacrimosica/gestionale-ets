import { useTranslation } from 'react-i18next';
import { Clock, AlertTriangle, ExternalLink } from 'lucide-react';
import { formatDate } from '../../../lib/date-utils';

interface ComplianceDocumentsSectionProps {
  documents?: any[];
  rules?: any;
  canEdit: boolean;
  onAddDocument: () => void;
  onEditDocument: (document: any) => void;
  onDeleteDocument: (documentId: string, docType: string) => void;
  onFlagDocument: (documentId: string) => void;
  onEditFlag: (documentId: string, flag: any) => void;
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

  const sortedDocuments = documents?.slice().sort((a: any, b: any) => (b.signedAt || b.createdAt).localeCompare(a.signedAt || a.createdAt)) ?? [];

  return (
    <div className="border border-slate-800 rounded-xl p-5 bg-slate-950/40 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white">{t('compliance.documentsTitle', { defaultValue: 'Documents' })}</h3>
          <p className="text-sm text-slate-400 mt-1">{t('compliance.documentsSubtitle', { defaultValue: 'NDAs, privacy, enrollment and membership forms.' })}</p>
        </div>
        {canEdit && (
          <button onClick={onAddDocument} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-semibold">
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
                  ? 'border-slate-700 bg-slate-950/20 opacity-70'
                  : isVersionOutdated
                    ? 'border-amber-900/50 bg-amber-950/10'
                    : 'border-slate-800'
              }`}
            >
              {(isSuperseded || isVersionOutdated || hasMissingConsents) && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {isSuperseded && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                      {t('compliance.badges.superseded', { defaultValue: 'Superseded' })}
                    </span>
                  )}
                  {isVersionOutdated && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-900/40 text-amber-300 border border-amber-800/60">
                      <Clock size={10} />
                      {t('compliance.badges.outdatedVersion', { defaultValue: 'Outdated version' })}
                    </span>
                  )}
                  {hasMissingConsents && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-900/30 text-yellow-400 border border-yellow-800/50">
                      <AlertTriangle size={10} />
                      {t('compliance.badges.consentsNotRecorded', { defaultValue: 'Consents not recorded' })}
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <div className="font-semibold text-white">
                    {docTypeConfig?.label ? t(docTypeConfig.label as string) : document.documentType}
                  </div>
                  <div className="text-sm text-slate-400">
                    {t('common.fields.version')}: {document.version || 'N/D'} | {t('common.fields.signedAt', { defaultValue: 'Data firma' })}: {document.signedAt ? formatDate(document.signedAt) : 'N/D'} | <span>{t('compliance.states.isCurrent')}: <span className={document.isCurrent ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>{document.isCurrent ? t('common.status.yes') : t('common.status.no')}</span></span>
                  </div>
                  <div className="text-sm text-slate-500 flex flex-wrap gap-x-3">
                    <span>{t('compliance.states.isSigned')}: <span className={document.isSigned ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>{document.isSigned ? t('common.status.yes') : t('common.status.no')}</span></span>
                    <span>{t('compliance.states.isDated')}: <span className={document.isDated ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>{document.isDated ? t('common.status.yes') : t('common.status.no')}</span></span>
                  </div>
                  {document.driveUrl && (
                    <a href={document.driveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200">
                      {t('compliance.openDriveLink')} <ExternalLink size={14} />
                    </a>
                  )}
                  {document.notes && <div className="text-xs text-slate-500">{document.notes}</div>}
                </div>
                {canEdit && (
                  <div className="flex items-center gap-3 shrink-0">
                    <button onClick={() => onEditDocument(document)} className="text-sm text-blue-300 hover:text-blue-200">
                      {t('common.actions.edit')}
                    </button>
                    <button onClick={() => onFlagDocument(document.id)} className="text-sm text-amber-300 hover:text-amber-200">
                      Flag
                    </button>
                    <button onClick={() => onDeleteDocument(document.id, document.documentType)} className="text-sm text-red-400 hover:text-red-300">
                      {t('common.actions.delete')}
                    </button>
                  </div>
                )}
              </div>

              {document.flags?.length > 0 && (
                <div className="mt-4 space-y-2">
                  {document.flags.map((flag: any) => (
                    <div key={flag.id} className="text-sm border border-slate-800 bg-slate-900/60 rounded-lg px-3 py-2 text-slate-300">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="font-semibold text-white">{flag.label}</span>
                          <span className="text-slate-500"> ({flag.severity})</span>
                          {flag.note ? ` - ${flag.note}` : ''}
                        </div>
                        {canEdit && (
                          <div className="flex items-center gap-3 shrink-0">
                            <button onClick={() => onEditFlag(document.id, flag)} className="text-blue-300 hover:text-blue-200 text-xs">
                              {t('common.actions.edit')}
                            </button>
                            <button onClick={() => onDeleteFlag(flag.id)} className="text-red-400 hover:text-red-300 text-xs">
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
          <div className="text-sm text-slate-500 italic">{t('people.noDocuments', { defaultValue: 'No documents registered.' })}</div>
        )}
      </div>
    </div>
  );
};

export default ComplianceDocumentsSection;
