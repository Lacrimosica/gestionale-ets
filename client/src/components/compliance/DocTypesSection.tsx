import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus, Trash2, ChevronDown, ChevronUp, Info,
} from 'lucide-react';
import { FileText } from 'lucide-react';
import type { ComplianceRules } from '../../hooks/useCompliance';
import {
  SectionHeader, Chip, FieldInput, emptyDocTypeForm,
  type DocTypeForm,
} from './ComplianceEditorShared';

interface DocTypesSectionProps {
  rules: ComplianceRules;
  onUpdateDocType: (key: string, patch: Partial<ComplianceRules['documentTypes'][string]>) => void;
  onDeleteDocType: (key: string) => void;
  onAddDocType: (form: DocTypeForm, rules: ComplianceRules) => void;
  onDeleteRequest: (target: { type: 'docType'; key: string }) => void;
}

export const DocTypesSection = ({
  rules,
  onUpdateDocType,
  onAddDocType,
  onDeleteRequest,
}: DocTypesSectionProps) => {
  const { t } = useTranslation();
  const [expandedDocKey, setExpandedDocKey] = useState<string | null>(null);
  const [newDocForm, setNewDocForm] = useState<DocTypeForm | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const translateIfPossible = (key: string) => {
    if (!key) return key;
    const translated = t(key, { defaultValue: key });
    return translated !== key ? translated : key;
  };

  const handleAddDocType = () => {
    if (!newDocForm) return;
    const key = newDocForm.key.trim().toLowerCase().replace(/\s+/g, '_');
    if (!key || rules.documentTypes[key]) {
      setMessage(
        rules.documentTypes[key]
          ? `Key "${key}" already exists.`
          : 'Key is required.',
      );
      return;
    }
    const parsedVersions = newDocForm.versions
      ? newDocForm.versions
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
      : undefined;
    const parsedConsentTypes = newDocForm.consentTypes
      ? newDocForm.consentTypes
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
      : undefined;

    onAddDocType(
      {
        ...newDocForm,
        key,
        versions: parsedVersions ? parsedVersions.join(',') : '',
        consentTypes: parsedConsentTypes ? parsedConsentTypes.join(',') : '',
      },
      rules,
    );
    setNewDocForm(null);
    setMessage(null);
  };

  const docTypeKeys = Object.keys(rules.documentTypes);

  return (
    <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-5 space-y-3">
      <SectionHeader
        icon={<FileText className="text-blue-400" size={18} />}
        title={t('settings.compliance.sections.documentTypes')}
        subtitle={t('settings.compliance.sections.documentTypesSubtitle')}
      />

      <div className="space-y-2">
        {docTypeKeys.map((key) => {
          const config = rules.documentTypes[key];
          const isExpanded = expandedDocKey === key;
          const displayLabel = translateIfPossible(config.label);
          return (
            <div
              key={key}
              className="border border-slate-800 rounded-lg overflow-hidden"
            >
              {/* Header row */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/60">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 shrink-0">
                    {key}
                  </span>
                  <span className="text-sm text-slate-200 font-medium truncate">
                    {displayLabel}
                  </span>
                  {(config.consentTypes ?? (config.hasConsents ? ['third_party', 'image_use'] : [])).map((ct) => (
                    <Chip key={ct} label={ct} color="amber" />
                  ))}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setExpandedDocKey(isExpanded ? null : key)}
                    className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronUp size={14} />
                    ) : (
                      <ChevronDown size={14} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onDeleteRequest({ type: 'docType', key })
                    }
                    className="p-1.5 rounded text-slate-600 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Edit body */}
              {isExpanded && (
                <div className="px-4 py-3 bg-slate-950/40 border-t border-slate-800 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FieldInput
                      label={t('settings.compliance.fields.labelI18nKey')}
                      value={config.label}
                      onChange={(v) =>
                        onUpdateDocType(key, { label: v })
                      }
                      placeholder="compliance.documents.my_doc"
                      mono
                    />
                    <FieldInput
                      label={t('settings.compliance.fields.description')}
                      value={config.description}
                      onChange={(v) =>
                        onUpdateDocType(key, { description: v })
                      }
                      placeholder="Short description of this document"
                    />
                  </div>
                  <FieldInput
                    label={t('settings.compliance.fields.consentTypes')}
                    value={(config.consentTypes ?? []).join(', ')}
                    onChange={(v) =>
                      onUpdateDocType(key, {
                        consentTypes: v
                          ? v
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean)
                          : undefined,
                      })
                    }
                    placeholder="third_party, image_use"
                    mono
                  />
                  <FieldInput
                    label={t('settings.compliance.fields.availableVersions')}
                    value={(config.versions ?? []).join(', ')}
                    onChange={(v) =>
                      onUpdateDocType(key, {
                        versions: v
                          ? v
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean)
                          : undefined,
                      })
                    }
                    placeholder="OLD, NEW"
                  />
                  {(config.versions ?? []).length > 0 && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {t('settings.compliance.fields.currentRequiredVersion')}
                      </label>
                      <select
                        value={config.currentVersion ?? ''}
                        onChange={(e) =>
                          onUpdateDocType(key, {
                            currentVersion: e.target.value || undefined,
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      >
                        <option value="">— {t('settings.compliance.fields.none')} —</option>
                        {(config.versions ?? []).map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="pt-1">
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Info size={11} /> {t('settings.compliance.preview')}{' '}
                      <span className="text-slate-300 ml-1">
                        {displayLabel}
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add new doc type form */}
      {newDocForm ? (
        <div className="border border-blue-700/40 rounded-xl p-4 bg-blue-900/10 space-y-3">
          <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">
            {t('settings.compliance.forms.newDocumentType')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FieldInput
              label={t('settings.compliance.fields.key')}
              value={newDocForm.key}
              onChange={(v) =>
                setNewDocForm((f) =>
                  f ? { ...f, key: v } : f,
                )
              }
              placeholder="nda_my_team"
              mono
            />
            <FieldInput
              label={t('settings.compliance.fields.labelI18nKey')}
              value={newDocForm.label}
              onChange={(v) =>
                setNewDocForm((f) =>
                  f ? { ...f, label: v } : f,
                )
              }
              placeholder="compliance.documents.nda_my_team"
              mono
            />
          </div>
          <FieldInput
            label={t('settings.compliance.fields.description')}
            value={newDocForm.description}
            onChange={(v) =>
              setNewDocForm((f) =>
                f ? { ...f, description: v } : f,
              )
            }
            placeholder="Short description"
          />
          <FieldInput
            label={t('settings.compliance.fields.consentTypes')}
            value={newDocForm.consentTypes}
            onChange={(v) =>
              setNewDocForm((f) =>
                f ? { ...f, consentTypes: v } : f,
              )
            }
            placeholder="third_party, image_use"
            mono
          />
          <FieldInput
            label={t('settings.compliance.fields.availableVersions')}
            value={newDocForm.versions}
            onChange={(v) =>
              setNewDocForm((f) =>
                f ? { ...f, versions: v, currentVersion: '' } : f,
              )
            }
            placeholder="OLD, NEW"
          />
          {newDocForm.versions.trim() && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {t('settings.compliance.fields.currentRequiredVersion')}
              </label>
              <select
                value={newDocForm.currentVersion}
                onChange={(e) =>
                  setNewDocForm((f) =>
                    f
                      ? { ...f, currentVersion: e.target.value }
                      : f,
                  )
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                <option value="">— {t('settings.compliance.fields.none')} —</option>
                {newDocForm.versions
                  .split(',')
                  .map((v) => v.trim())
                  .filter(Boolean)
                  .map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
              </select>
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAddDocType}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-500"
            >
              {t('settings.compliance.forms.add')}
            </button>
            <button
              type="button"
              onClick={() => setNewDocForm(null)}
              className="px-3 py-1.5 bg-slate-800 text-slate-300 text-sm rounded-lg hover:bg-slate-700"
            >
              {t('settings.compliance.forms.cancel')}
            </button>
            {message && (
              <span className="text-sm text-red-400">{message}</span>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setNewDocForm(emptyDocTypeForm())}
          className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 font-semibold transition-colors"
        >
          <Plus size={16} /> {t('settings.compliance.forms.addDocumentType')}
        </button>
      )}
    </div>
  );
};
