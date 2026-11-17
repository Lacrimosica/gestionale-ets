import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';

interface AssemblySelectionToolbarProps {
  count: number;
  onCancel: () => void;
  onDeleteRequest: () => void;
}

export const AssemblySelectionToolbar = ({ count, onCancel, onDeleteRequest }: AssemblySelectionToolbarProps) => {
  const { t } = useTranslation();

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-4 bg-neutral-800 border border-neutral-700 rounded-2xl shadow-2xl px-5 py-3">
        <span className="text-sm font-semibold text-neutral-300">
          <span className="text-special-400 font-bold">{count}</span> selezionat{count === 1 ? 'a' : 'e'}
        </span>
        <div className="w-px h-5 bg-neutral-600" />
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-neutral-400 hover:text-fg transition-colors"
        >
          {t('common.actions.cancel')}
        </button>
        <button
          type="button"
          onClick={onDeleteRequest}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-danger-700 hover:bg-danger-600 text-white text-sm font-bold transition-colors"
        >
          <Trash2 size={15} />
          {t('common.actions.delete')}
        </button>
      </div>
    </div>
  );
};
