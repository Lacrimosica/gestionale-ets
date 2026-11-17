import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

interface Comune {
  name: string;
  code: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  label: string;
}

export default function ComuneCombobox({ value, onChange, label }: Props) {
  const [query, setQuery] = useState(value ?? '');
  const [results, setResults] = useState<Comune[]>([]);
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const checkPosition = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setOpenUpward(spaceBelow < 260);
  }, []);

  // Re-sync the input when the parent changes the value (adjusting state during render
  // instead of in an effect avoids an extra render pass).
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    setQuery(value ?? '');
  }

  // Queries shorter than 2 characters never show results, even stale ones.
  const visibleResults = query.length < 2 ? [] : results;

  useEffect(() => {
    if (query.length < 2) return;
    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/people/comuni`, { params: { q: query } });
        setResults(res.data);
        checkPosition();
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query, checkPosition]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (comune: Comune) => {
    setQuery(comune.name);
    onChange(comune.name);
    setOpen(false);
  };

  return (
    <div className="space-y-1" ref={containerRef}>
      <label className="text-xs text-neutral-500 font-bold uppercase tracking-tighter">{label}</label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            onChange(e.target.value);
          }}
          className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-neutral-500"
          autoComplete="off"
        />
        {open && visibleResults.length > 0 && (
          <ul className={`absolute z-50 w-full bg-neutral-900 border border-neutral-700 rounded-lg shadow-lg max-h-60 overflow-auto ${openUpward ? 'bottom-full mb-1' : 'mt-1'}`}>
            {visibleResults.map(c => (
              <li
                key={c.code}
                onMouseDown={() => select(c)}
                className="px-3 py-2 text-sm text-fg hover:bg-neutral-700 cursor-pointer flex justify-between"
              >
                <span>{c.name}</span>
                <span className="text-neutral-400 text-xs font-mono">{c.code}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
