import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus, Trash2, ChevronDown, ChevronUp, FileText, GitMerge,
} from 'lucide-react';
import { Tag } from 'lucide-react';
import type { ComplianceRules } from '../../hooks/useCompliance';
import {
  SectionHeader, Chip, FieldInput, emptyRoleForm,
  type RoleForm,
} from './ComplianceEditorShared';

interface RolesSectionProps {
  rules: ComplianceRules;
  onUpdateRole: (key: string, patch: Partial<ComplianceRules['roles'][string]>) => void;
  onDeleteRole: (key: string) => void;
  onAddRole: (form: RoleForm, rules: ComplianceRules) => void;
  onDeleteRequest: (target: { type: 'role'; key: string }) => void;
}

export const RolesSection = ({
  rules,
  onUpdateRole,
  onAddRole,
  onDeleteRequest,
}: RolesSectionProps) => {
  const { t } = useTranslation();
  const [expandedRoleKey, setExpandedRoleKey] = useState<string | null>(null);
  const [newRoleForm, setNewRoleForm] = useState<RoleForm | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const translateIfPossible = (key: string) => {
    if (!key) return key;
    const translated = t(key, { defaultValue: key });
    return translated !== key ? translated : key;
  };

  const handleAddRole = () => {
    if (!newRoleForm) return;
    const key = newRoleForm.key.trim().toLowerCase().replace(/\s+/g, '_');
    if (!key || rules.roles[key]) {
      setMessage(
        rules.roles[key] ? `Key "${key}" already exists.` : 'Key is required.',
      );
      return;
    }
    onAddRole(newRoleForm, rules);
    setNewRoleForm(null);
    setMessage(null);
  };

  const docTypeKeys = Object.keys(rules.documentTypes);

  return (
    <div className="bg-neutral-950/40 border border-neutral-800 rounded-xl p-5 space-y-3">
      <SectionHeader
        icon={<Tag className="text-accent-400" size={18} />}
        title={t('settings.compliance.sections.roles')}
        subtitle={t('settings.compliance.sections.rolesSubtitle')}
      />

      <div className="space-y-2">
        {Object.entries(rules.roles).map(([key, config]) => {
          const isExpanded = expandedRoleKey === key;
          const displayLabel = translateIfPossible(config.label);
          return (
            <div
              key={key}
              className="border border-neutral-800 rounded-lg overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-900/60">
                <div className="flex items-center gap-2.5 min-w-0 flex-wrap gap-y-1">
                  <span className="font-mono text-xs text-neutral-500 bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700 shrink-0">
                    {key}
                  </span>
                  <span className="text-sm text-neutral-200 font-medium">
                    {displayLabel}
                  </span>
                  {config.description && (
                    <span className="text-xs text-neutral-500 italic truncate max-w-[200px] border-l border-neutral-800 pl-2 ml-1">
                      {config.description}
                    </span>
                  )}
                  {(config.requiredDocuments ?? []).map((d) => (
                    <Chip key={d} label={d} color="blue" />
                  ))}
                  {(config.inherits ?? []).map((r) => (
                    <Chip key={r} label={`→ ${r}`} color="indigo" />
                  ))}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedRoleKey(isExpanded ? null : key)
                    }
                    className="p-1.5 rounded text-neutral-400 hover:text-fg hover:bg-neutral-800 transition-colors"
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
                      onDeleteRequest({ type: 'role', key })
                    }
                    className="p-1.5 rounded text-neutral-600 hover:text-danger-400 hover:bg-danger-900/20 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 py-3 bg-neutral-950/40 border-t border-neutral-800 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FieldInput
                      label={t('settings.compliance.fields.labelI18nKey')}
                      value={config.label}
                      onChange={(v) =>
                        onUpdateRole(key, { label: v })
                      }
                      placeholder="compliance.roles.my_role"
                      mono
                    />
                    <FieldInput
                      label={t('settings.compliance.fields.description')}
                      value={config.description || ''}
                      onChange={(v) =>
                        onUpdateRole(key, { description: v })
                      }
                      placeholder="Short description of this role"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                      <FileText size={10} /> {t('settings.compliance.fields.requiredDocuments')}
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {(config.requiredDocuments ?? []).map((d) => (
                        <Chip
                          key={d}
                          label={d}
                          color="blue"
                          onRemove={() =>
                            onUpdateRole(key, {
                              requiredDocuments: (
                                config.requiredDocuments ?? []
                              ).filter((x) => x !== d),
                            })
                          }
                        />
                      ))}
                      {(config.requiredDocuments ?? []).length === 0 && (
                        <span className="text-xs text-neutral-600 italic">
                          {t('settings.compliance.fields.none')}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {docTypeKeys
                        .filter(
                          (d) =>
                            !(config.requiredDocuments ?? []).includes(d),
                        )
                        .map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() =>
                              onUpdateRole(key, {
                                requiredDocuments: [
                                  ...(config.requiredDocuments ?? []),
                                  d,
                                ],
                              })
                            }
                            className="text-xs px-2 py-0.5 rounded-full border border-dashed border-neutral-700 text-neutral-500 hover:border-accent-500 hover:text-accent-400 transition-colors"
                          >
                            + {d}
                          </button>
                        ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                      <GitMerge size={10} /> {t('settings.compliance.fields.inheritsFrom')}
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {(config.inherits ?? []).map((r) => (
                        <Chip
                          key={r}
                          label={r}
                          color="indigo"
                          onRemove={() =>
                            onUpdateRole(key, {
                              inherits: (config.inherits ?? []).filter(
                                (x) => x !== r,
                              ),
                            })
                          }
                        />
                      ))}
                      {(config.inherits ?? []).length === 0 && (
                        <span className="text-xs text-neutral-600 italic">
                          {t('settings.compliance.fields.noInheritance')}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.keys(rules.roles)
                        .filter(
                          (r) =>
                            r !== key && !(config.inherits ?? []).includes(r),
                        )
                        .map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() =>
                              onUpdateRole(key, {
                                inherits: [
                                  ...(config.inherits ?? []),
                                  r,
                                ],
                              })
                            }
                            className="text-xs px-2 py-0.5 rounded-full border border-dashed border-neutral-700 text-neutral-500 hover:border-accent-500 hover:text-accent-400 transition-colors"
                          >
                            + {r}
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add new role form */}
      {newRoleForm ? (
        <div className="border border-accent-700/40 rounded-xl p-4 bg-accent-900/10 space-y-3">
          <p className="text-xs font-bold text-accent-400 uppercase tracking-widest">
            {t('settings.compliance.forms.newRole')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FieldInput
              label={t('settings.compliance.fields.key')}
              value={newRoleForm.key}
              onChange={(v) =>
                setNewRoleForm((f) =>
                  f ? { ...f, key: v } : f,
                )
              }
              placeholder="my_team"
              mono
            />
            <FieldInput
              label={t('settings.compliance.fields.labelI18nKey')}
              value={newRoleForm.label}
              onChange={(v) =>
                setNewRoleForm((f) =>
                  f ? { ...f, label: v } : f,
                )
              }
              placeholder="compliance.roles.my_team"
              mono
            />
          </div>
          <FieldInput
            label={t('settings.compliance.fields.description')}
            value={newRoleForm.description}
            onChange={(v) =>
              setNewRoleForm((f) =>
                f ? { ...f, description: v } : f,
              )
            }
            placeholder="Short description"
          />

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              {t('settings.compliance.fields.requiredDocuments')}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {docTypeKeys.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() =>
                    setNewRoleForm((f) => {
                      if (!f) return f;
                      const has = f.requiredDocuments.includes(d);
                      return {
                        ...f,
                        requiredDocuments: has
                          ? f.requiredDocuments.filter((x) => x !== d)
                          : [...f.requiredDocuments, d],
                      };
                    })
                  }
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                    newRoleForm.requiredDocuments.includes(d)
                      ? 'bg-accent-900/40 text-accent-300 border-accent-700'
                      : 'border-dashed border-neutral-700 text-neutral-500 hover:border-accent-500 hover:text-accent-400'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAddRole}
              className="px-3 py-1.5 bg-accent-600 text-white text-sm font-semibold rounded-lg hover:bg-accent-500"
            >
              {t('settings.compliance.forms.add')}
            </button>
            <button
              type="button"
              onClick={() => setNewRoleForm(null)}
              className="px-3 py-1.5 bg-neutral-800 text-neutral-300 text-sm rounded-lg hover:bg-neutral-700"
            >
              {t('settings.compliance.forms.cancel')}
            </button>
            {message && (
              <span className="text-sm text-danger-400">{message}</span>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setNewRoleForm(emptyRoleForm())}
          className="flex items-center gap-2 text-sm text-accent-400 hover:text-accent-300 font-semibold transition-colors"
        >
          <Plus size={16} /> {t('settings.compliance.forms.addRole')}
        </button>
      )}
    </div>
  );
};
