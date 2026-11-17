const InfoField = ({ label, value, mono = false }: any) => (
  <div className="space-y-0.5">
    <div className="text-xs text-neutral-500 font-bold uppercase tracking-tighter">{label}</div>
    <div className={`text-neutral-200 ${mono ? 'font-mono' : ''}`}>{value || 'N/D'}</div>
  </div>
);

export default InfoField;
