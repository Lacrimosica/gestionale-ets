import { useTranslation } from 'react-i18next';
import { Check, Link2, FileCode, FileDown, Video, Users as UsersIcon, Globe, CalendarIcon } from 'lucide-react';
import { formatDate } from '../../lib/date-utils';
import { AgendaCell } from './AgendaCell';
import { SUBTYPE_LABELS } from './assemblyConstants';
import type { Assembly } from '../../hooks/useAssemblies';

interface AssemblyTableRowProps {
  assembly: Assembly;
  partner: Assembly | null;
  isPaired: boolean;
  isSelected: boolean;
  canEdit: boolean;
  onSelect: (id: string) => void;
  onNavigate: (id: string) => void;
}

export const AssemblyTableRow = ({
  assembly: v,
  partner,
  isPaired,
  isSelected,
  canEdit,
  onSelect,
  onNavigate,
}: AssemblyTableRowProps) => {
  const { t } = useTranslation();

  if (isPaired && partner) {
    // PAIRED ROW
    return (
      <tr
        onClick={() => onNavigate(v.id)}
        className="hover:bg-special-950/20 transition-colors group cursor-pointer border-l-2 border-special-800/50"
      >
        {canEdit && (
          <td className="pl-5 pr-2 py-4" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => onSelect(v.id)}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 ${isSelected ? 'bg-special-600 border-special-500' : 'bg-neutral-800 border-neutral-600 hover:border-special-500'}`}
            >
              {isSelected && <Check size={11} className="text-fg" strokeWidth={3} />}
            </button>
          </td>
        )}
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center space-x-3">
            <div className="bg-special-900/40 p-2 rounded-lg text-special-400">
              <Link2 size={18} />
            </div>
            <div>
              <div className="font-bold text-neutral-200">{v.firstCallDate ? formatDate(v.firstCallDate) : 'N/A'}</div>
              <div className="text-xs text-neutral-500 mt-0.5">→ {partner.firstCallDate ? formatDate(partner.firstCallDate) : 'N/A'}</div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <span className="text-lg font-black text-fg">
            n.{v.referenceNumber} <span className="text-special-400">+</span> n.{partner.referenceNumber}
          </span>
          <p className="text-xs text-neutral-500 font-medium mt-0.5">{v.referenceYear ?? '—'}</p>
        </td>
        <td className="px-6 py-4">
          <div className="flex flex-col space-y-1">
            <span className={`inline-flex w-fit px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${v.type === 'board_council' ? 'bg-accent-900/40 text-accent-400 border-accent-800' :
              v.type === 'extraordinary' ? 'bg-warning-900/40 text-warning-400 border-warning-800' :
                v.type === 'constitution' ? 'bg-success-900/40 text-success-400 border-success-800' :
                  'bg-special-900/40 text-special-400 border-special-800'
              }`}>
              {t(`assemblies.types.${v.type}`)}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-special-400 font-semibold">
              <Link2 size={10} /> 1a + 2a conv.
            </span>
          </div>
        </td>
        <AgendaCell convocationId={v.convocationId} notes={v.notes || partner.notes} />
        <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-end space-x-3">
            {v.googleDocsLink ? (
              <a href={v.googleDocsLink} target="_blank" rel="noreferrer" className="text-accent-400 hover:text-accent-300 p-1.5 hover:bg-accent-900/20 rounded transition-all" title="Google Docs">
                <FileCode size={20} />
              </a>
            ) : (
              <FileCode size={20} className="text-neutral-800 opacity-30" />
            )}
            {v.pdfLink ? (
              <a href={v.pdfLink} target="_blank" rel="noreferrer" className="text-danger-400 hover:text-danger-300 p-1.5 hover:bg-danger-900/20 rounded transition-all" title="Signed PDF">
                <FileDown size={20} />
              </a>
            ) : (
              <FileDown size={20} className="text-neutral-800 opacity-30" />
            )}
          </div>
        </td>
      </tr>
    );
  }

  // SOLO ROW
  return (
    <tr
      onClick={() => onNavigate(v.id)}
      className="hover:bg-neutral-800/40 transition-colors group cursor-pointer"
    >
      {canEdit && (
        <td className="pl-5 pr-2 py-4" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onSelect(v.id)}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 ${isSelected ? 'bg-special-600 border-special-500' : 'bg-neutral-800 border-neutral-600 hover:border-special-500'}`}
          >
            {isSelected && <Check size={11} className="text-fg" strokeWidth={3} />}
          </button>
        </td>
      )}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center space-x-3">
          <div className="bg-neutral-800 p-2 rounded-lg text-special-400">
            <CalendarIcon size={18} />
          </div>
          <div className="font-bold text-neutral-200">{v.firstCallDate ? formatDate(v.firstCallDate) : 'N/A'}</div>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className="text-lg font-black text-fg">
          {v.type === 'board_council' ? `#${v.referenceNumber}` : `n.${v.referenceNumber}`}
        </span>
        <p className="text-xs text-neutral-500 font-medium mt-0.5">
          {v.type === 'board_council' ? 'Mandato' : (v.referenceYear ?? '—')}
        </p>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-col space-y-1">
          <span className={`inline-flex w-fit px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${v.type === 'board_council' ? 'bg-accent-900/40 text-accent-400 border-accent-800' :
            v.type === 'extraordinary' ? 'bg-warning-900/40 text-warning-400 border-warning-800' :
              'bg-special-900/40 text-special-400 border-special-800'
            }`}>
            {t(`assemblies.types.${v.type}`)}
          </span>
          {v.subtype && (
            <span className="inline-flex w-fit px-2 py-0.5 rounded text-[10px] font-semibold border bg-neutral-800/60 text-neutral-400 border-neutral-700">
              {SUBTYPE_LABELS[v.subtype] ?? v.subtype}
            </span>
          )}
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border whitespace-nowrap ${v.mode === 'in_person' ? 'bg-success-900/40 text-success-400 border-success-800' :
              v.mode === 'remote' ? 'bg-info-900/40 text-info-400 border-info-800' :
                'bg-special-900/40 text-special-400 border-special-800'
              }`}>
              {v.mode === 'in_person' && <UsersIcon size={12} />}
              {v.mode === 'remote' && <Video size={12} />}
              {v.mode === 'hybrid' && <Globe size={12} />}
              {t(`assemblies.modes.${v.mode}`)}
            </span>
          </div>
        </div>
      </td>
      <AgendaCell convocationId={v.convocationId} notes={v.notes} />
      <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-end space-x-3">
          {v.googleDocsLink ? (
            <a href={v.googleDocsLink} target="_blank" rel="noreferrer" className="text-accent-400 hover:text-accent-300 p-1.5 hover:bg-accent-900/20 rounded transition-all" title="Google Docs">
              <FileCode size={20} />
            </a>
          ) : (
            <FileCode size={20} className="text-neutral-800 opacity-30" />
          )}
          {v.pdfLink ? (
            <a href={v.pdfLink} target="_blank" rel="noreferrer" className="text-danger-400 hover:text-danger-300 p-1.5 hover:bg-danger-900/20 rounded transition-all" title="Signed PDF">
              <FileDown size={20} />
            </a>
          ) : (
            <FileDown size={20} className="text-neutral-800 opacity-30" />
          )}
        </div>
      </td>
    </tr>
  );
};
