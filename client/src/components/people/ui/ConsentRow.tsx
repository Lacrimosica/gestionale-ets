const ConsentRow = ({ label, value }: { label: string; value: boolean | null }) => (
  <div className="flex items-center justify-between text-sm py-1 border-b border-slate-900 last:border-0">
    <span className="text-slate-400">{label}</span>
    <span className={value ? 'text-green-400' : 'text-red-400'}>{value ? 'Concesso' : 'Negato'}</span>
  </div>
);

export default ConsentRow;
