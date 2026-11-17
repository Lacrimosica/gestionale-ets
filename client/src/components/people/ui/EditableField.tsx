const EditableField = ({ label, value, onChange, type = 'text', mono = false, uppercase = false }: any) => (
  <div className="space-y-1">
    <label className="text-xs text-neutral-500 font-bold uppercase tracking-tighter">{label}</label>
    <input
      type={type}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      className={`w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-fg text-sm transition-colors focus:border-accent-500 focus:ring-1 focus:ring-accent-500 outline-none ${mono ? 'font-mono' : ''} ${uppercase ? 'uppercase' : ''}`}
    />
  </div>
);

export default EditableField;
