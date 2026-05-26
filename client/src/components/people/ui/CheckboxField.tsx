import { Check } from 'lucide-react';

const CheckboxField = ({ label, checked, onChange, tooltip }: { label: string; checked: boolean; onChange: (v: boolean) => void; tooltip?: string }) => (
  <label className="flex items-center gap-3 cursor-pointer group select-none" title={tooltip}>
    <div onClick={() => onChange(!checked)} className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${checked ? 'bg-blue-600 border-blue-500' : 'bg-slate-950 border-slate-700 group-hover:border-slate-500'}`}>
      {checked && <Check size={14} className="text-white" />}
    </div>
    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{label}</span>
  </label>
);

export default CheckboxField;
