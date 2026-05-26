import { useState } from 'react';
import { Loader2, User, X } from 'lucide-react';

export interface MemberCandidate {
  id: string;
  nome: string;
  label?: string;
}

export const SingleMemberPicker = ({
  candidates,
  value,
  onChange,
  loading,
  placeholder = 'Cerca…',
  openUpward = false,
}: {
  candidates: MemberCandidate[];
  value: string; // personId
  onChange: (id: string) => void;
  loading: boolean;
  placeholder?: string;
  openUpward?: boolean;
}) => {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const filtered = candidates.filter(c => c.nome.toLowerCase().includes(search.toLowerCase()));
  const selectedCandidate = candidates.find(c => c.id === value);

  if (loading && !selectedCandidate) {
    return (
      <div className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-500 text-sm flex items-center gap-2">
        <Loader2 size={14} className="animate-spin" /> Caricamento…
      </div>
    );
  }

  if (value && selectedCandidate) {
    return (
      <div className="flex items-center gap-2 w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200">
        <User size={16} className="text-purple-400 shrink-0" />
        <span className="flex-1 text-sm">{selectedCandidate.nome}</span>
        <button type="button" onClick={() => onChange('')} className="text-slate-500 hover:text-white transition-colors">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <input
          type="text"
          placeholder={placeholder}
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-slate-200 focus:ring-2 focus:ring-purple-600 transition-all outline-none text-sm"
        />
      </div>
      {open && (
        <div className={`absolute z-50 w-full bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-h-48 overflow-y-auto ${openUpward ? 'bottom-full mb-1' : 'mt-1'}`}>
          {filtered.length === 0 ? (
            <p className="text-slate-500 text-xs p-3">{candidates.length === 0 ? 'Nessun membro disponibile.' : 'Nessun risultato.'}</p>
          ) : filtered.map(c => (
            <button
              key={c.id}
              type="button"
              onMouseDown={() => { onChange(c.id); setSearch(''); setOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800/60 text-left transition-colors"
            >
              <span className="flex-1 text-sm text-slate-200">{c.nome}</span>
              {c.label && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-slate-800 text-slate-400 border-slate-700">
                  {c.label}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
