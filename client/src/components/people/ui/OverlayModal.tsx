import { type ReactNode } from 'react';
import { X } from 'lucide-react';

const OverlayModal = ({ title, children, onClose, onConfirm, confirmLabel }: { title: string; children: ReactNode; onClose: () => void; onConfirm: () => void; confirmLabel: string }) => (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
      <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
        <h3 className="text-xl font-bold text-fg">{title}</h3>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-neutral-800 text-neutral-400">
          <X size={20} />
        </button>
      </div>
      <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
        {children}
      </div>
      <div className="p-6 border-t border-neutral-800 flex justify-end gap-3 bg-neutral-950/20">
        <button onClick={onClose} className="px-5 py-2 rounded-xl bg-neutral-800 text-neutral-300 font-semibold hover:bg-neutral-700 hover:text-fg transition-all">
          Annulla
        </button>
        <button onClick={onConfirm} className="px-5 py-2 rounded-xl bg-accent-600 text-white font-bold hover:bg-accent-500 shadow-lg shadow-accent-900/30 transition-all">
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

export default OverlayModal;
