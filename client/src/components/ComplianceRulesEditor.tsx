import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
   Plus, Trash2, ChevronDown, ChevronUp, Save, RefreshCw,
  FileText, Tag, GitMerge, SquareDot, Info,
} from 'lucide-react';
import { type ComplianceRules } from '../hooks/useCompliance';

// ── Types ──────────────────────────────────────────────────────────────────────

interface DocTypeForm {
  key: string;
  label: string;
  description: string;
  hasConsents: boolean;
  versions: string; // comma-separated
}

interface RoleForm {
  key: string;
  label: string;
  requiredDocuments: string[]; // docType keys
  inherits: string[]; // role keys
}

const emptyDocTypeForm = (): DocTypeForm => ({
  key: '',
  label: '',
  description: '',
  hasConsents: false,
  versions: '',
});

const emptyRoleForm = (): RoleForm => ({
  key: '',
  label: '',
  requiredDocuments: [],
  inherits: [],
});

// ── Sub-components ─────────────────────────────────────────────────────────────

const SectionHeader = ({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) => (
  <div className="flex items-center gap-3 mb-4">
    {icon}
    <div>
      <h3 className="text-base font-semibold text-white">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

const Chip = ({
  label,
  onRemove,
  color = 'slate',
}: {
  label: string;
  onRemove?: () => void;
  color?: 'slate' | 'blue' | 'indigo' | 'amber';
}) => {
  const colors = {
    slate: 'bg-slate-800 text-slate-300 border-slate-700',
    blue: 'bg-blue-900/40 text-blue-300 border-blue-800',
    indigo: 'bg-indigo-900/40 text-indigo-300 border-indigo-800',
    amber: 'bg-amber-900/30 text-amber-300 border-amber-800',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${colors[color]}`}>
      {label}
      {onRemove && (
        <button type="button" onClick={onRemove} className="hover:text-red-400 transition-colors ml-0.5">×</button>
      )}
    </span>
  );
};

const FieldInput = ({ label, value, onChange, placeholder, mono = false }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean;
}) => (
  <div className="space-y-1">
    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none ${mono ? 'font-mono' : ''}`}
    />
  </div>
);

const Toggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <label className="flex items-center gap-2 cursor-pointer select-none">
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-9 h-5 rounded-full transition-colors relative ${checked ? 'bg-blue-600' : 'bg-slate-700'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : ''}`} />
    </button>
    <span className="text-xs text-slate-300">{label}</span>
  </label>
);

// ── Main Component ─────────────────────────────────────────────────────────────

export const ComplianceRulesEditor = ({
  initialRules,
  onSave,
}: {
  initialRules: ComplianceRules;
  onSave: (rules: ComplianceRules) => Promise<void>;
}) => {
  const { t } = useTranslation();
  const [rules, setRules] = useState<ComplianceRules>(structuredClone(initialRules));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Track which doc type / role is expanded for editing
  const [expandedDocKey, setExpandedDocKey] = useState<string | null>(null);
  const [expandedRoleKey, setExpandedRoleKey] = useState<string | null>(null);

  // New item draft forms
  const [newDocForm, setNewDocForm] = useState<DocTypeForm | null>(null);
  const [newRoleForm, setNewRoleForm] = useState<RoleForm | null>(null);

  // ── Doc type handlers ──────────────────────────────────────────────────────

  const updateDocType = (key: string, patch: Partial<ComplianceRules['documentTypes'][string] & { hasConsents?: boolean }>) => {
    setRules(prev => ({
      ...prev,
      documentTypes: {
        ...prev.documentTypes,
        [key]: { ...prev.documentTypes[key], ...patch },
      },
    }));
  };

  const deleteDocType = (key: string) => {
    setRules(prev => {
      const dtCopy = { ...prev.documentTypes };
      delete dtCopy[key];
      // Also remove from base requirements and role requiredDocuments
      const baseReqs = {
        isVolunteer: prev.baseRequirements.isVolunteer.filter(d => d !== key),
        isSocio: prev.baseRequirements.isSocio.filter(d => d !== key),
        isBoard: prev.baseRequirements.isBoard.filter(d => d !== key),
      };
      const roles = Object.fromEntries(
        Object.entries(prev.roles).map(([rk, rv]) => [
          rk,
          { ...rv, requiredDocuments: (rv.requiredDocuments ?? []).filter(d => d !== key) },
        ])
      );
      return { ...prev, documentTypes: dtCopy, baseRequirements: baseReqs, roles };
    });
  };

  const addDocType = () => {
    if (!newDocForm) return;
    const key = newDocForm.key.trim().toLowerCase().replace(/\s+/g, '_');
    if (!key || rules.documentTypes[key]) {
      setMessage(rules.documentTypes[key] ? `Key "${key}" already exists.` : 'Key is required.');
      return;
    }
    setRules(prev => ({
      ...prev,
      documentTypes: {
        ...prev.documentTypes,
        [key]: {
          label: newDocForm.label,
          description: newDocForm.description,
          hasConsents: newDocForm.hasConsents || undefined,
          versions: newDocForm.versions ? newDocForm.versions.split(',').map(v => v.trim()).filter(Boolean) : undefined,
        },
      },
    }));
    setNewDocForm(null);
  };

  // ── Role handlers ─────────────────────────────────────────────────────────

  const updateRole = (key: string, patch: Partial<ComplianceRules['roles'][string]>) => {
    setRules(prev => ({
      ...prev,
      roles: { ...prev.roles, [key]: { ...prev.roles[key], ...patch } },
    }));
  };

  const deleteRole = (key: string) => {
    setRules(prev => {
      const rolesCopy = { ...prev.roles };
      delete rolesCopy[key];
      // Remove this role from any other role's inherits
      const cleaned = Object.fromEntries(
        Object.entries(rolesCopy).map(([rk, rv]) => [
          rk,
          { ...rv, inherits: (rv.inherits ?? []).filter(k => k !== key) },
        ])
      );
      return { ...prev, roles: cleaned };
    });
  };

  const addRole = () => {
    if (!newRoleForm) return;
    const key = newRoleForm.key.trim().toLowerCase().replace(/\s+/g, '_');
    if (!key || rules.roles[key]) {
      setMessage(rules.roles[key] ? `Key "${key}" already exists.` : 'Key is required.');
      return;
    }
    setRules(prev => ({
      ...prev,
      roles: {
        ...prev.roles,
        [key]: {
          label: newRoleForm.label,
          requiredDocuments: newRoleForm.requiredDocuments,
          inherits: newRoleForm.inherits.length > 0 ? newRoleForm.inherits : undefined,
        },
      },
    }));
    setNewRoleForm(null);
  };

  // ── Base requirement handlers ─────────────────────────────────────────────

  const toggleBaseReq = (context: 'isVolunteer' | 'isSocio' | 'isBoard', docKey: string) => {
    setRules(prev => {
      const current = prev.baseRequirements[context];
      const updated = current.includes(docKey)
        ? current.filter(k => k !== docKey)
        : [...current, docKey];
      return { ...prev, baseRequirements: { ...prev.baseRequirements, [context]: updated } };
    });
  };

  // ── Save ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await onSave(rules);
      setMessage('Compliance rules saved successfully.');
    } catch {
      setMessage('Error saving compliance rules.');
    } finally {
      setSaving(false);
    }
  };

  const docTypeKeys = Object.keys(rules.documentTypes);
  const baseContexts: { key: 'isVolunteer' | 'isSocio' | 'isBoard'; label: string }[] = [
    { key: 'isVolunteer', label: 'Volunteer' },
    { key: 'isSocio', label: 'Member (Socio)' },
    { key: 'isBoard', label: 'Board Member' },
  ];

  const translateIfPossible = (key: string) => {
    if (!key) return key;
    const translated = t(key, { defaultValue: key });
    return translated !== key ? translated : key;
  };

  return (
    <div className="space-y-6">
      {/* ── Document Types ───────────────────────────────────────────────────── */}
      <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-5 space-y-3">
        <SectionHeader
          icon={<FileText className="text-blue-400" size={18} />}
          title="Document Types"
          subtitle="Define all compliance document types. Each key is the internal identifier (e.g. nda_dia)."
        />

        <div className="space-y-2">
          {Object.entries(rules.documentTypes).map(([key, config]) => {
            const isExpanded = expandedDocKey === key;
            const displayLabel = translateIfPossible(config.label);
            return (
              <div key={key} className="border border-slate-800 rounded-lg overflow-hidden">
                {/* Header row */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/60">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 shrink-0">{key}</span>
                    <span className="text-sm text-slate-200 font-medium truncate">{displayLabel}</span>
                    {config.hasConsents && <Chip label="consents" color="amber" />}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setExpandedDocKey(isExpanded ? null : key)}
                      className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => { if (confirm(`Delete document type "${key}"?`)) deleteDocType(key); }}
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
                        label="Label (i18n key)"
                        value={config.label}
                        onChange={v => updateDocType(key, { label: v })}
                        placeholder="compliance.documents.my_doc"
                        mono
                      />
                      <FieldInput
                        label="Description"
                        value={config.description}
                        onChange={v => updateDocType(key, { description: v })}
                        placeholder="Short description of this document"
                      />
                    </div>
                    <div className="flex items-center gap-6 flex-wrap">
                      <Toggle
                        label="Has Consent Fields (e.g. privacy)"
                        checked={!!config.hasConsents}
                        onChange={v => updateDocType(key, { hasConsents: v || undefined })}
                      />
                    </div>
                    <FieldInput
                      label="Available Versions (comma-separated, optional)"
                      value={(config.versions ?? []).join(', ')}
                      onChange={v => updateDocType(key, { versions: v ? v.split(',').map(s => s.trim()).filter(Boolean) : undefined })}
                      placeholder="OLD, NEW"
                    />
                    <div className="pt-1">
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Info size={11} /> Preview: <span className="text-slate-300 ml-1">{displayLabel}</span>
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
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">New Document Type</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FieldInput label="Key (snake_case)" value={newDocForm.key} onChange={v => setNewDocForm(f => f ? { ...f, key: v } : f)} placeholder="nda_my_team" mono />
              <FieldInput label="i18n Label Key" value={newDocForm.label} onChange={v => setNewDocForm(f => f ? { ...f, label: v } : f)} placeholder="compliance.documents.nda_my_team" mono />
            </div>
            <FieldInput label="Description" value={newDocForm.description} onChange={v => setNewDocForm(f => f ? { ...f, description: v } : f)} placeholder="Short description" />
            <Toggle label="Has Consent Fields" checked={newDocForm.hasConsents} onChange={v => setNewDocForm(f => f ? { ...f, hasConsents: v } : f)} />
            <FieldInput label="Versions (optional, comma-separated)" value={newDocForm.versions} onChange={v => setNewDocForm(f => f ? { ...f, versions: v } : f)} placeholder="OLD, NEW" />
            <div className="flex gap-2">
              <button type="button" onClick={addDocType} className="px-3 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-500">Add</button>
              <button type="button" onClick={() => setNewDocForm(null)} className="px-3 py-1.5 bg-slate-800 text-slate-300 text-sm rounded-lg hover:bg-slate-700">Cancel</button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setNewDocForm(emptyDocTypeForm())}
            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 font-semibold transition-colors"
          >
            <Plus size={16} /> Add Document Type
          </button>
        )}
      </div>

      {/* ── Roles ────────────────────────────────────────────────────────────── */}
      <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-5 space-y-3">
        <SectionHeader
          icon={<Tag className="text-indigo-400" size={18} />}
          title="Roles"
          subtitle="Define compliance roles and the documents they require. Roles can inherit requirements from other roles."
        />

        <div className="space-y-2">
          {Object.entries(rules.roles).map(([key, config]) => {
            const isExpanded = expandedRoleKey === key;
            const displayLabel = translateIfPossible(config.label);
            return (
              <div key={key} className="border border-slate-800 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/60">
                  <div className="flex items-center gap-2.5 min-w-0 flex-wrap gap-y-1">
                    <span className="font-mono text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 shrink-0">{key}</span>
                    <span className="text-sm text-slate-200 font-medium">{displayLabel}</span>
                    {(config.requiredDocuments ?? []).map(d => (
                      <Chip key={d} label={d} color="blue" />
                    ))}
                    {(config.inherits ?? []).map(r => (
                      <Chip key={r} label={`→ ${r}`} color="indigo" />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setExpandedRoleKey(isExpanded ? null : key)}
                      className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => { if (confirm(`Delete role "${key}"?`)) deleteRole(key); }}
                      className="p-1.5 rounded text-slate-600 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 py-3 bg-slate-950/40 border-t border-slate-800 space-y-3">
                    <FieldInput
                      label="Label (i18n key)"
                      value={config.label}
                      onChange={v => updateRole(key, { label: v })}
                      placeholder="compliance.roles.my_role"
                      mono
                    />

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><FileText size={10} /> Required Documents</label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {(config.requiredDocuments ?? []).map(d => (
                          <Chip key={d} label={d} color="blue" onRemove={() =>
                            updateRole(key, { requiredDocuments: (config.requiredDocuments ?? []).filter(x => x !== d) })
                          } />
                        ))}
                        {(config.requiredDocuments ?? []).length === 0 && <span className="text-xs text-slate-600 italic">None</span>}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {docTypeKeys.filter(d => !(config.requiredDocuments ?? []).includes(d)).map(d => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => updateRole(key, { requiredDocuments: [...(config.requiredDocuments ?? []), d] })}
                            className="text-xs px-2 py-0.5 rounded-full border border-dashed border-slate-700 text-slate-500 hover:border-blue-500 hover:text-blue-400 transition-colors"
                          >
                            + {d}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><GitMerge size={10} /> Inherits From</label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {(config.inherits ?? []).map(r => (
                          <Chip key={r} label={r} color="indigo" onRemove={() =>
                            updateRole(key, { inherits: (config.inherits ?? []).filter(x => x !== r) })
                          } />
                        ))}
                        {(config.inherits ?? []).length === 0 && <span className="text-xs text-slate-600 italic">No inheritance</span>}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.keys(rules.roles)
                          .filter(r => r !== key && !(config.inherits ?? []).includes(r))
                          .map(r => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => updateRole(key, { inherits: [...(config.inherits ?? []), r] })}
                              className="text-xs px-2 py-0.5 rounded-full border border-dashed border-slate-700 text-slate-500 hover:border-indigo-500 hover:text-indigo-400 transition-colors"
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
          <div className="border border-indigo-700/40 rounded-xl p-4 bg-indigo-900/10 space-y-3">
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">New Role</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FieldInput label="Key (snake_case)" value={newRoleForm.key} onChange={v => setNewRoleForm(f => f ? { ...f, key: v } : f)} placeholder="my_team" mono />
              <FieldInput label="i18n Label Key" value={newRoleForm.label} onChange={v => setNewRoleForm(f => f ? { ...f, label: v } : f)} placeholder="compliance.roles.my_team" mono />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Required Documents</label>
              <div className="flex flex-wrap gap-1.5">
                {docTypeKeys.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setNewRoleForm(f => {
                      if (!f) return f;
                      const has = f.requiredDocuments.includes(d);
                      return { ...f, requiredDocuments: has ? f.requiredDocuments.filter(x => x !== d) : [...f.requiredDocuments, d] };
                    })}
                    className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${newRoleForm.requiredDocuments.includes(d) ? 'bg-blue-900/40 text-blue-300 border-blue-700' : 'border-dashed border-slate-700 text-slate-500 hover:border-blue-500 hover:text-blue-400'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={addRole} className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-500">Add</button>
              <button type="button" onClick={() => setNewRoleForm(null)} className="px-3 py-1.5 bg-slate-800 text-slate-300 text-sm rounded-lg hover:bg-slate-700">Cancel</button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setNewRoleForm(emptyRoleForm())}
            className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
          >
            <Plus size={16} /> Add Role
          </button>
        )}
      </div>

      {/* ── Base Requirements ─────────────────────────────────────────────────── */}
      <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-5 space-y-4">
        <SectionHeader
          icon={<SquareDot className="text-emerald-400" size={18} />}
          title="Base Requirements"
          subtitle="Documents required for all persons based on their status (volunteer, member, board)."
        />
        <div className="space-y-4">
          {baseContexts.map(({ key, label }) => (
            <div key={key} className="space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</p>
              <div className="flex flex-wrap gap-2">
                {docTypeKeys.map(d => {
                  const included = rules.baseRequirements[key].includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleBaseReq(key, d)}
                      className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${included
                          ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700 shadow-sm'
                          : 'border-dashed border-slate-700 text-slate-500 hover:border-emerald-600 hover:text-emerald-400'
                        }`}
                    >
                      {included ? '✓ ' : '+ '}{d}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Save Bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        {message && (
          <p className={`text-sm ${message.includes('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
            {message}
          </p>
        )}
        {!message && <div />}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { setRules(structuredClone(initialRules)); setMessage(null); }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <RefreshCw size={14} /> Reset
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-emerald-900/30"
          >
            <Save size={14} />
            {saving ? 'Saving...' : 'Save Compliance Rules'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComplianceRulesEditor;
