const ConsentRow = ({ label, value }: { label: string; value: boolean | null }) => (
  <div className="flex items-center justify-between text-sm py-1 border-b border-neutral-900 last:border-0">
    <span className="text-neutral-400">{label}</span>
    <span className={value ? 'text-success-400' : 'text-danger-400'}>{value ? 'Concesso' : 'Negato'}</span>
  </div>
);

export default ConsentRow;
