import { useState } from 'react';
import { Loader2, User } from 'lucide-react';

export const LABEL_STYLE: Record<string, string> = {
  'Socio': 'bg-emerald-900/40 text-emerald-400 border-emerald-800',
  'Volontario': 'bg-blue-900/40 text-blue-400 border-blue-800',
  'Direttivo': 'bg-purple-900/40 text-purple-400 border-purple-800',
  'Esterno': 'bg-slate-800 text-slate-400 border-slate-700',
};

interface MemberCandidate {
  id: string;
  nome: string;
  label?: string;
}

export const MemberPickerField = ({
  candidates,
  selected,
  onChange,
  loading,
  placeholder = 'Cerca…',
}: {
  candidates: MemberCandidate[];
  selected: string[];
  onChange: (names: string[]) => void;
  loading: boolean;
  placeholder?: string;
}) => {
  const [search, setSearch] = useState('');
  const filtered = candidates.filter((c) => c.nome.toLowerCase().includes(search.toLowerCase()));
  
  const toggle = (nome: string) =>
    onChange(selected.includes(nome) ? selected.filter((n) => n !== nome) : [...selected, nome]);

  if (loading) {
    return (
      <div className="border border-slate-700 rounded-lg p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
        <Loader2 size={13} className="animate-spin" /> Caricamento…
      </div>
    );
  }

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden">
      <div className="p-2 border-b border-slate-800 bg-slate-950 flex items-center gap-2">
        <User size={14} className="text-slate-500" />
        <input
          type="text"
          placeholder={placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent text-white text-xs px-2 py-1 outline-none focus:ring-1 focus:ring-purple-600 rounded"
        />
      </div>
      <div className="max-h-48 overflow-y-auto divide-y divide-slate-800/60">
        {filtered.length === 0 ? (
          <p className="text-slate-500 text-xs p-3">
            {candidates.length === 0 ? 'Nessun candidato disponibile.' : 'Nessun risultato.'}
          </p>
        ) : filtered.map((c) => (
          <label key={c.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800/40 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(c.nome)}
              onChange={() => toggle(c.nome)}
              className="accent-purple-500 shrink-0"
            />
            <span className="flex-1 text-sm text-slate-200">{c.nome}</span>
            {c.label && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${LABEL_STYLE[c.label] ?? 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                {c.label}
              </span>
            )}
          </label>
        ))}
      </div>
    </div>
  );
};
