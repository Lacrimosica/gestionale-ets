import { type DocumentSettings } from '../../hooks/useSettings';

interface OrgInfoFieldsProps {
  city: string | null;
  maxProxies: number | null;
  onFormChange: (field: keyof DocumentSettings, value: any) => void;
}

const OrgInfoFields = ({ city, maxProxies, onFormChange }: OrgInfoFieldsProps) => {
  return (
    <div className="border border-slate-800 rounded-xl p-5 bg-slate-950/40 space-y-4">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Org Info</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-xs text-slate-500 mb-1">City</span>
          <input
            value={city ?? ''}
            onChange={(e) => onFormChange('city', e.target.value)}
            placeholder="Torino"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
          />
        </label>
        <label className="block">
          <span className="block text-xs text-slate-500 mb-1">Max proxies per member</span>
          <input
            type="number"
            value={maxProxies ?? ''}
            onChange={(e) => onFormChange('maxProxies', e.target.value === '' ? null : Number(e.target.value))}
            placeholder="3"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
          />
        </label>
      </div>
    </div>
  );
};

export default OrgInfoFields;
