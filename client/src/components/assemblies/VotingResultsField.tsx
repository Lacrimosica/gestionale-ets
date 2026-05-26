import { Users as UsersIcon, X } from 'lucide-react';
import type { VotingResult } from '../../hooks/useDocuments';

interface VotingResultsFieldProps {
  votes: VotingResult[];
  onChange: (votes: VotingResult[]) => void;
}

const DOC_INPUT_CLS = 'w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all';

export const VotingResultsField = ({ votes, onChange }: VotingResultsFieldProps) => (
  <div className="space-y-2.5 mt-2 bg-slate-900/50 rounded-lg p-3 border border-slate-800/50">
    <div className="flex items-center justify-between">
      <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
        <UsersIcon size={10} />
        Risultati Votazione
      </p>
      <button
        type="button"
        onClick={() => onChange([...votes, { outcome: "all'unanimità" }])}
        className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold uppercase transition-colors"
      >
        + Aggiungi Votazione
      </button>
    </div>

    {votes.length === 0 ? (
      <p className="text-[10px] text-slate-600 italic">Nessuna votazione registrata. Verrà usato "all'unanimità" per l'intero punto.</p>
    ) : (
      <div className="space-y-2">
        {votes.map((v, vIdx) => (
          <div key={vIdx} className="flex flex-wrap gap-2 items-start border-b border-slate-800/30 pb-2 last:border-0 last:pb-0">
            <input
              placeholder="Oggetto (es: Bilancio Consuntivo)"
              value={v.title || ''}
              onChange={(e) => onChange(votes.map((x, j) => j === vIdx ? { ...x, title: e.target.value } : x))}
              className={DOC_INPUT_CLS + " flex-1 min-w-[150px] !py-1 text-xs"}
            />
            <select
              value={v.outcome}
              onChange={(e) => onChange(votes.map((x, j) => j === vIdx ? { ...x, outcome: e.target.value } : x))}
              className={DOC_INPUT_CLS + " w-32 !py-1 text-xs"}
            >
              <option value="all'unanimità">Unanimità</option>
              <option value="a maggioranza">Maggioranza</option>
              <option value="contrarietà">Respinto</option>
            </select>
            {v.outcome === 'a maggioranza' && (
              <input
                placeholder="Note (es: 2 contrari...)"
                value={v.details || ''}
                onChange={(e) => onChange(votes.map((x, j) => j === vIdx ? { ...x, details: e.target.value } : x))}
                className={DOC_INPUT_CLS + " flex-1 min-w-[120px] !py-1 text-xs"}
              />
            )}
            <button
              type="button"
              onClick={() => onChange(votes.filter((_, j) => j !== vIdx))}
              className="p-1 text-slate-600 hover:text-red-400"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
);
