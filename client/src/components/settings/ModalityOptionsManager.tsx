import { Pencil, Trash2, Plus } from 'lucide-react';

interface ModalityOption {
  id: string;
  type: 'convocation' | 'minutes_opening';
  label: string;
  value: string;
  mode?: 'in_person' | 'remote' | 'hybrid' | 'any';
  isDefault?: boolean;
}

type ModalityDraft = { type: 'convocation' | 'minutes_opening'; mode: 'in_person' | 'remote' | 'hybrid' | 'any'; label: string; value: string };
type EditingModalityDraft = { label: string; value: string; mode: 'in_person' | 'remote' | 'hybrid' | 'any' };

interface ModalityOptionsManagerProps {
  options: ModalityOption[];
  modalityDraft: ModalityDraft;
  editingModalityId: string | null;
  editingModalityDraft: EditingModalityDraft;
  onModalityDraftChange: (draft: ModalityDraft) => void;
  onEditingModalityChange: (draft: EditingModalityDraft) => void;
  onEditingModalityIdChange: (id: string | null) => void;
  onCreateModality: (data: { type: 'convocation' | 'minutes_opening'; mode: 'in_person' | 'remote' | 'hybrid' | 'any'; label: string; value: string }) => Promise<void>;
  onUpdateModality: (id: string, draft: EditingModalityDraft) => Promise<void>;
  onRemoveModality: (id: string) => Promise<void>;
}

const ModalityOptionsManager = ({
  options,
  modalityDraft,
  editingModalityId,
  editingModalityDraft,
  onModalityDraftChange,
  onEditingModalityChange,
  onEditingModalityIdChange,
  onCreateModality,
  onUpdateModality,
  onRemoveModality,
}: ModalityOptionsManagerProps) => {
  return (
    <div className="border border-slate-800 rounded-xl p-5 bg-slate-950/40 space-y-4">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Modality Options</h3>
      <p className="text-xs text-slate-500">Options available in the convocation and minutes opening dropdowns during document generation.</p>

      {(['convocation', 'minutes_opening'] as const).map((type) => (
        <div key={type} className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-400 uppercase">
            {type === 'convocation' ? 'Convocation notice' : 'Minutes opening'}
          </h4>
          <div className="space-y-1">
            {options.filter((o) => o.type === type).map((opt) => (
              <div key={opt.id} className="flex items-start gap-2 bg-slate-900 border border-slate-800 rounded-lg p-2">
                {editingModalityId === opt.id ? (
                  <>
                    <div className="flex-1 space-y-1">
                      <input
                        value={editingModalityDraft.label}
                        onChange={(e) => onEditingModalityChange({ ...editingModalityDraft, label: e.target.value })}
                        placeholder="Label"
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs"
                      />
                      <textarea
                        value={editingModalityDraft.value}
                        onChange={(e) => onEditingModalityChange({ ...editingModalityDraft, value: e.target.value })}
                        placeholder="Full Italian text"
                        rows={2}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs resize-none"
                      />
                      <select
                        value={editingModalityDraft.mode}
                        onChange={(e) => onEditingModalityChange({ ...editingModalityDraft, mode: e.target.value as any })}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs"
                      >
                        <option value="any">Any modality</option>
                        <option value="in_person">In person only</option>
                        <option value="remote">Remote only</option>
                        <option value="hybrid">Hybrid only</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={async () => {
                          await onUpdateModality(opt.id, editingModalityDraft);
                          onEditingModalityIdChange(null);
                        }}
                        className="text-xs bg-sky-600 hover:bg-sky-500 text-white px-2 py-1 rounded"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => onEditingModalityIdChange(null)}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white">
                        {opt.label}
                        {opt.isDefault ? <span className="ml-1 text-sky-400 text-xs">(default)</span> : null}
                        {opt.mode && opt.mode !== 'any' && (
                          <span className="ml-1.5 text-xs px-1 py-0.5 rounded bg-slate-700 text-slate-300">{opt.mode}</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{opt.value}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => {
                          onEditingModalityIdChange(opt.id);
                          onEditingModalityChange({ label: opt.label, value: opt.value, mode: opt.mode ?? 'any' });
                        }}
                        className="text-slate-400 hover:text-white"
                      >
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => onRemoveModality(opt.id)} className="text-slate-400 hover:text-red-400">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 items-end pt-1">
            <div className="flex-1 space-y-1">
              <input
                value={modalityDraft.type === type ? modalityDraft.label : ''}
                onChange={(e) => onModalityDraftChange({ ...modalityDraft, type, label: e.target.value, value: modalityDraft.type === type ? modalityDraft.value : '' })}
                placeholder="Label"
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs"
              />
              <textarea
                value={modalityDraft.type === type ? modalityDraft.value : ''}
                onChange={(e) => onModalityDraftChange({ ...modalityDraft, type, value: e.target.value })}
                placeholder="Full Italian text for document"
                rows={2}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs resize-none"
              />
              <select
                value={modalityDraft.type === type ? modalityDraft.mode : 'any'}
                onChange={(e) => onModalityDraftChange({ ...modalityDraft, type, mode: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs"
              >
                <option value="any">Any modality</option>
                <option value="in_person">In person only</option>
                <option value="remote">Remote only</option>
                <option value="hybrid">Hybrid only</option>
              </select>
            </div>
            <button
              onClick={async () => {
                if (!modalityDraft.label.trim() || !modalityDraft.value.trim()) return;
                await onCreateModality({ type, mode: modalityDraft.mode, label: modalityDraft.label, value: modalityDraft.value });
                onModalityDraftChange({ type: 'convocation', mode: 'any', label: '', value: '' });
              }}
              className="flex items-center gap-1 bg-sky-700 hover:bg-sky-600 text-white px-3 py-1.5 rounded text-xs font-semibold"
            >
              <Plus size={12} />
              Add
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ModalityOptionsManager;
