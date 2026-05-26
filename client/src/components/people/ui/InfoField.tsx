const InfoField = ({ label, value, mono = false }: any) => (
  <div className="space-y-0.5">
    <div className="text-xs text-slate-500 font-bold uppercase tracking-tighter">{label}</div>
    <div className={`text-slate-200 ${mono ? 'font-mono' : ''}`}>{value || 'N/D'}</div>
  </div>
);

export default InfoField;
