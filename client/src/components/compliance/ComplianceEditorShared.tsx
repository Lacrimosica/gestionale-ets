
// ── Types ──────────────────────────────────────────────────────────────────────

export interface DocTypeForm {
  key: string;
  label: string;
  description: string;
  consentTypes: string; // comma-separated consent type keys e.g. "third_party,image_use"
  versions: string; // comma-separated
  currentVersion: string;
}

export interface RoleForm {
  key: string;
  label: string;
  description: string;
  requiredDocuments: string[]; // docType keys
  inherits: string[]; // role keys
}

export const emptyDocTypeForm = (): DocTypeForm => ({
  key: '',
  label: '',
  description: '',
  consentTypes: '',
  versions: '',
  currentVersion: '',
});

export const emptyRoleForm = (): RoleForm => ({
  key: '',
  label: '',
  description: '',
  requiredDocuments: [],
  inherits: [],
});

// ── Sub-components ─────────────────────────────────────────────────────────

export const SectionHeader = ({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) => (
  <div className="flex items-center gap-3 mb-4">
    {icon}
    <div>
      <h3 className="text-base font-semibold text-fg">{title}</h3>
      {subtitle && <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

export const Chip = ({
  label,
  onRemove,
  color = 'slate',
}: {
  label: string;
  onRemove?: () => void;
  color?: 'slate' | 'blue' | 'indigo' | 'amber';
}) => {
  const colors = {
    slate: 'bg-neutral-800 text-neutral-300 border-neutral-700',
    blue: 'bg-accent-900/40 text-accent-300 border-accent-800',
    indigo: 'bg-accent-900/40 text-accent-300 border-accent-800',
    amber: 'bg-warning-900/30 text-warning-300 border-warning-800',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${colors[color]}`}
    >
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="hover:text-danger-400 transition-colors ml-0.5"
        >
          ×
        </button>
      )}
    </span>
  );
};

export const FieldInput = ({
  label,
  value,
  onChange,
  placeholder,
  mono = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
}) => (
  <div className="space-y-1">
    <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
      {label}
    </label>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-fg text-sm focus:border-accent-500 focus:ring-1 focus:ring-accent-500 outline-none ${
        mono ? 'font-mono' : ''
      }`}
    />
  </div>
);
