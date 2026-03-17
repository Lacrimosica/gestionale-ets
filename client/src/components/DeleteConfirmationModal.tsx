import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  expectedText: string;
  value: string;
  isSubmitting?: boolean;
  submitLabel?: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

const DeleteConfirmationModal = ({
  isOpen,
  title,
  description,
  expectedText,
  value,
  isSubmitting = false,
  submitLabel = 'Elimina',
  onChange,
  onCancel,
  onConfirm,
}: DeleteConfirmationModalProps) => {
  if (!isOpen) return null;

  const isMatch = value.trim() === expectedText;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-red-900/50 bg-slate-900 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-800 p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-red-950/40 p-3 text-red-400">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{title}</h2>
              <p className="mt-2 text-sm text-slate-400">{description}</p>
            </div>
          </div>
          <button onClick={onCancel} className="rounded-full p-1 text-slate-500 hover:bg-slate-800 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Testo richiesto</p>
            <p className="mt-2 font-mono text-sm text-red-300">{expectedText}</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Digita esattamente il testo sopra per confermare
            </label>
            <input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none transition-all focus:border-red-500 focus:ring-1 focus:ring-red-500"
              placeholder={expectedText}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-800 p-6">
          <button onClick={onCancel} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700">
            Annulla
          </button>
          <button
            onClick={onConfirm}
            disabled={!isMatch || isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 size={16} />
            {isSubmitting ? 'Eliminazione...' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
