import { Check } from 'lucide-react';

const CheckboxField = ({ label, checked, onChange, tooltip }: { label: string; checked: boolean; onChange: (v: boolean) => void; tooltip?: string }) => (
  <label className="flex items-center gap-3 cursor-pointer group select-none" title={tooltip}>
    <div onClick={() => onChange(!checked)} className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${checked ? 'bg-accent-600 border-accent-500' : 'bg-neutral-950 border-neutral-700 group-hover:border-neutral-500'}`}>
      {checked && <Check size={14} className="text-fg" />}
    </div>
    <span className="text-sm text-neutral-300 group-hover:text-fg transition-colors">{label}</span>
  </label>
);

export default CheckboxField;
