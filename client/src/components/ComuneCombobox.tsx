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

  useEffect(() => {
    setQuery(value ?? '');
  }, [value]);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
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
  }, [query]);

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
      <label className="text-xs text-slate-500 font-bold uppercase tracking-tighter">{label}</label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            onChange(e.target.value);
          }}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-slate-500"
          autoComplete="off"
        />
        {open && results.length > 0 && (
          <ul className={`absolute z-50 w-full bg-slate-900 border border-slate-700 rounded-lg shadow-lg max-h-60 overflow-auto ${openUpward ? 'bottom-full mb-1' : 'mt-1'}`}>
            {results.map(c => (
              <li
                key={c.code}
                onMouseDown={() => select(c)}
                className="px-3 py-2 text-sm text-white hover:bg-slate-700 cursor-pointer flex justify-between"
              >
                <span>{c.name}</span>
                <span className="text-slate-400 text-xs font-mono">{c.code}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
