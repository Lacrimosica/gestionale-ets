import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  accentClassName?: string;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const defaultOptions = [10, 20, 50, 100];

const PaginationControls = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  accentClassName = 'text-blue-400',
  pageSizeOptions = defaultOptions,
  onPageChange,
  onPageSizeChange,
}: PaginationControlsProps) => {
  return (
    <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex flex-col gap-3 px-6 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-2 text-sm text-slate-500 md:flex-row md:items-center md:gap-4">
        <div>
          Pagina <span className="text-slate-200 font-bold">{currentPage}</span> di <span className="text-slate-200 font-bold">{Math.max(totalPages, 1)}</span>
        </div>
        <label className="flex items-center gap-2">
          <span>Elementi per pagina</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-200"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <div>
          Totale <span className={`font-bold ${accentClassName}`}>{totalItems}</span>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:hover:bg-slate-800 transition-all"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
          className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:hover:bg-slate-800 transition-all"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default PaginationControls;
