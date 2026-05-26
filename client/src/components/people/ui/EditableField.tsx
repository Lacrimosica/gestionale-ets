const EditableField = ({ label, value, onChange, type = 'text', mono = false, uppercase = false }: any) => (
  <div className="space-y-1">
    <label className="text-xs text-slate-500 font-bold uppercase tracking-tighter">{label}</label>
    <input
      type={type}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      className={`w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none ${mono ? 'font-mono' : ''} ${uppercase ? 'uppercase' : ''}`}
    />
  </div>
);

export default EditableField;
