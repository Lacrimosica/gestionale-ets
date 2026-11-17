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
  accentClassName = 'text-accent-400',
  pageSizeOptions = defaultOptions,
  onPageChange,
  onPageSizeChange,
}: PaginationControlsProps) => {
  return (
    <div className="p-4 border-t border-neutral-800 bg-neutral-900/50 flex flex-col gap-3 px-6 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-2 text-sm text-neutral-500 md:flex-row md:items-center md:gap-4">
        <div>
          Pagina <span className="text-neutral-200 font-bold">{currentPage}</span> di <span className="text-neutral-200 font-bold">{Math.max(totalPages, 1)}</span>
        </div>
        <label className="flex items-center gap-2">
          <span>Elementi per pagina</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="bg-neutral-950 border border-neutral-700 rounded-lg px-2 py-1 text-neutral-200"
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
          className="p-2 rounded-lg bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-fg disabled:opacity-30 disabled:hover:bg-neutral-800 transition-all"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
          className="p-2 rounded-lg bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-fg disabled:opacity-30 disabled:hover:bg-neutral-800 transition-all"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default PaginationControls;
