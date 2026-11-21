import { useTranslation } from 'react-i18next';
import { ChevronDown, Loader2, Unlink } from 'lucide-react';
import type { AssemblySummary, AssemblyDetailData } from '../../types/assembly';

interface AssemblyPairingManagerProps {
  isCurrentPrimary: boolean;
  otherAssembly: AssemblyDetailData | null;
  isDropdownOpen: boolean;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  savingPairing: boolean;
  candidates: AssemblySummary[];
  currentId: string;
  onToggleDropdown: (open: boolean) => void;
  onPairAssembly: (pairedId: string | null) => Promise<void>;
  getAssemblyLabel: (assemblyId?: string | null) => string;
}

export const AssemblyPairingManager = ({
  isCurrentPrimary,
  otherAssembly,
  isDropdownOpen,
  dropdownRef,
  savingPairing,
  candidates,
  currentId,
  onToggleDropdown,
  onPairAssembly,
  getAssemblyLabel,
}: AssemblyPairingManagerProps) => {
  const { t } = useTranslation();

  return (
    <div className="relative flex-1" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => onToggleDropdown(!isDropdownOpen)}
        className="w-full flex items-center justify-between gap-2 bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm text-neutral-200 hover:border-neutral-500 transition-colors"
      >
        <span className="truncate">
          {otherAssembly
            ? getAssemblyLabel(otherAssembly.id)
            : '— ' + t('assemblies.noSecondAssembly', { defaultValue: 'No second assembly' })}
        </span>
        {savingPairing ? <Loader2 size={13} className="animate-spin text-neutral-400" /> : <ChevronDown size={13} className="text-neutral-400 shrink-0" />}
      </button>

      {isDropdownOpen && isCurrentPrimary && (
        <div className="absolute z-50 w-full bottom-full mb-1 bg-neutral-900 border border-neutral-700 rounded-lg overflow-y-auto max-h-52 shadow-xl">
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm text-neutral-400 hover:bg-neutral-800 flex items-center gap-2"
            onClick={() => onPairAssembly(null)}
          >
            <Unlink size={13} /> {t('assemblies.noSecondAssembly', { defaultValue: 'No second assembly' })}
          </button>
          {candidates.filter((a) => a.id !== currentId).map((a) => {
            const alreadyPaired = !!a.pairedAssemblyId && a.pairedAssemblyId !== currentId;
            return (
              <button
                key={a.id}
                type="button"
                disabled={alreadyPaired}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-neutral-800 flex items-center justify-between gap-2 ${otherAssembly?.id === a.id ? 'text-success-400 bg-neutral-800' : alreadyPaired ? 'text-neutral-600 cursor-not-allowed' : 'text-fg'}`}
                onClick={() => !alreadyPaired && onPairAssembly(a.id)}
              >
                <span>{getAssemblyLabel(a.id)}</span>
                {alreadyPaired && <span className="text-[10px] text-warning-500 shrink-0">già abbinata</span>}
                {!alreadyPaired && <span className="text-[10px] text-success-500 shrink-0">libera</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
