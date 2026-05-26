import { type ReactNode } from 'react';

const ModalField = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</label>
    {children}
  </div>
);

export default ModalField;
