import { useState, useRef } from 'react';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../../config';

interface AgendaItemRow {
  id: string;
  number: number;
  title: string;
  workflowType?: string | null;
}

interface AgendaCellProps {
  convocationId?: string | null;
  notes?: string | null;
}

export const AgendaCell = ({ convocationId, notes }: AgendaCellProps) => {
  const [items, setItems] = useState<AgendaItemRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const fetched = useRef(false);
  const cellRef = useRef<HTMLTableCellElement>(null);

  const handleMouseEnter = async () => {
    if (cellRef.current) {
      const rect = cellRef.current.getBoundingClientRect();
      setTooltipPos({ top: rect.bottom + 6, left: rect.left });
    }
    if (fetched.current || !convocationId) return;
    fetched.current = true;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/convocations/${convocationId}`);
      setItems(res.data.agendaItems ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const hasContent = convocationId || notes;

  return (
    <td
      ref={cellRef}
      className="px-6 py-4 max-w-xs"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setTooltipPos(null)}
    >
      {/* preview line */}
      {items && items.length > 0 ? (
        <p className="text-xs text-slate-400 truncate">
          {items.length} {items.length === 1 ? 'punto' : 'punti'} odg
        </p>
      ) : notes ? (
        <p className="text-xs text-slate-400 truncate max-w-[180px]">{notes}</p>
      ) : (
        <span className="text-slate-700">—</span>
      )}

      {/* tooltip rendered via fixed positioning to escape overflow clipping */}
      {tooltipPos && hasContent && (
        <div
          className="fixed z-[9999] w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 space-y-1.5 pointer-events-none"
          style={{ top: tooltipPos.top, left: tooltipPos.left }}
        >
          {loading ? (
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Loader2 size={12} className="animate-spin" /> Caricamento…
            </div>
          ) : items && items.length > 0 ? (
            <>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Ordine del giorno</p>
              {items.map((item) => (
                <div key={item.id} className="flex items-start gap-2">
                  <span className="text-[10px] font-bold text-purple-500 shrink-0 mt-0.5">{item.number}.</span>
                  <span className="text-xs text-slate-300 leading-snug">{item.title}</span>
                </div>
              ))}
            </>
          ) : items && items.length === 0 && notes ? (
            <p className="text-xs text-slate-300">{notes}</p>
          ) : items && items.length === 0 ? (
            <p className="text-xs text-slate-500 italic">Nessun punto all'ordine del giorno</p>
          ) : notes ? (
            <p className="text-xs text-slate-300">{notes}</p>
          ) : null}
        </div>
      )}
    </td>
  );
};
