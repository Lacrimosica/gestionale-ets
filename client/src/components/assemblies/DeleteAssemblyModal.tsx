import { Trash2, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DeleteAssemblyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

export const DeleteAssemblyModal = ({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteAssemblyModalProps) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-red-900/50 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3">
          <div className="bg-red-900/30 p-2 rounded-lg text-red-400">
            <Trash2 size={20} />
          </div>
          <h2 className="text-lg font-bold text-white">
            {t('common.actions.delete')} {t('assemblies.labels.assembly', { defaultValue: 'Assembly' })}
          </h2>
        </div>
        <p className="text-slate-400 text-sm">
          {t('common.confirmDelete', {
            defaultValue: 'This action cannot be undone. All agenda items, convocations, and attendance records for this assembly will also be deleted.',
          })}
        </p>
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-5 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors font-medium"
          >
            {t('common.actions.cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white font-bold transition-colors"
          >
            {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            {t('common.actions.delete')}
          </button>
        </div>
      </div>
    </div>
  );
};
