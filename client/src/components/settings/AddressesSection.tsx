import { useTranslation } from 'react-i18next';
import { MapPin, ChevronDown, Plus, Save, Pencil, Trash2 } from 'lucide-react';
import { formatDate } from '../../lib/date-utils';

interface Address {
  id: string;
  address: string;
  effectiveFrom: string;
  notes?: string;
}

interface AddressesSectionProps {
  expanded: boolean;
  addresses: Address[];
  loading: boolean;
  addressForm: { address: string; effectiveFrom: string; notes: string };
  message: string | null;
  saving: boolean;
  editingId: string | null;
  editingDraft: { address: string; effectiveFrom: string; notes: string };
  deletingId: string | null;
  onToggle: () => void;
  onFormChange: (field: 'address' | 'effectiveFrom' | 'notes', value: string) => void;
  onAddAddress: () => Promise<void>;
  onEditStart: (address: Address) => void;
  onEditChange: (field: 'address' | 'effectiveFrom' | 'notes', value: string) => void;
  onEditSave: (id: string) => Promise<void>;
  onEditCancel: () => void;
  onDeleteStart: (id: string) => void;
  onDeleteConfirm: (id: string) => Promise<void>;
  onDeleteCancel: () => void;
}

export const AddressesSection = ({
  expanded,
  addresses,
  loading,
  addressForm,
  message,
  saving,
  editingId,
  editingDraft,
  deletingId,
  onToggle,
  onFormChange,
  onAddAddress,
  onEditStart,
  onEditChange,
  onEditSave,
  onEditCancel,
  onDeleteStart,
  onDeleteConfirm,
  onDeleteCancel,
}: AddressesSectionProps) => {
  const { t } = useTranslation();

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-3">
          <MapPin className="text-amber-400" />
          <div className="text-left">
            <h2 className="text-lg font-semibold text-white">{t('settings.addresses.title')}</h2>
            <p className="text-sm text-slate-500">{t('settings.addresses.description')}</p>
          </div>
        </div>
        <ChevronDown size={20} className={`text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="space-y-4 max-w-3xl mx-auto">
          <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/40 space-y-3">
            <div className="flex items-center gap-2 text-slate-200 font-medium text-sm">
              <Plus size={16} className="text-amber-400" />
              {t('settings.addresses.addAddress')}
            </div>
            <div className="grid grid-cols-1 gap-3">
              <input
                value={addressForm.address}
                onChange={(e) => onFormChange('address', e.target.value)}
                placeholder={t('settings.addresses.addressPlaceholder')}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
              />
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">{t('settings.addresses.effectiveFrom')}</label>
                  <input
                    type="date"
                    value={addressForm.effectiveFrom}
                    onChange={(e) => onFormChange('effectiveFrom', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">{t('settings.addresses.notesOptional')}</label>
                  <input
                    value={addressForm.notes}
                    onChange={(e) => onFormChange('notes', e.target.value)}
                    placeholder={t('settings.addresses.notesPlaceholder')}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
              </div>
            </div>
            {message && <p className="text-sm text-slate-300">{message}</p>}
            <button
              disabled={saving}
              onClick={onAddAddress}
              className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold text-sm"
            >
              <Save size={14} />
              {t('common.actions.save')}
            </button>
          </div>

          {loading ? (
            <p className="text-slate-500 text-sm">{t('settings.addresses.loading')}</p>
          ) : addresses.length === 0 ? (
            <p className="text-slate-500 text-sm">{t('settings.addresses.noAddresses')}</p>
          ) : (
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left">{t('settings.addresses.address')}</th>
                    <th className="px-4 py-3 text-left">{t('settings.addresses.effectiveFrom')}</th>
                    <th className="px-4 py-3 text-left">{t('settings.addresses.notes')}</th>
                    <th className="px-4 py-3 text-right">{t('settings.addresses.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {addresses.map((addr, idx) => (
                    <tr key={addr.id} className={idx === 0 ? 'bg-amber-950/10' : ''}>
                      {editingId === addr.id ? (
                        <>
                          <td className="px-4 py-2" colSpan={3}>
                            <div className="grid grid-cols-1 gap-2">
                              <input
                                value={editingDraft.address}
                                onChange={(e) => onEditChange('address', e.target.value)}
                                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm"
                              />
                              <div className="flex gap-2">
                                <input
                                  type="date"
                                  value={editingDraft.effectiveFrom}
                                  onChange={(e) => onEditChange('effectiveFrom', e.target.value)}
                                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm"
                                />
                                <input
                                  value={editingDraft.notes}
                                  onChange={(e) => onEditChange('notes', e.target.value)}
                                  placeholder="Note"
                                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm"
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => onEditSave(addr.id)}
                                className="text-xs bg-amber-600 hover:bg-amber-500 text-white px-2 py-1 rounded"
                              >
                                {t('common.actions.save')}
                              </button>
                              <button
                                onClick={onEditCancel}
                                className="text-xs text-slate-400 hover:text-white"
                              >
                                {t('common.actions.cancel')}
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-slate-200">
                            {addr.address}
                            {idx === 0 && <span className="ml-2 text-xs text-amber-400 font-medium">{t('settings.addresses.currentLabel')}</span>}
                          </td>
                          <td className="px-4 py-3 text-slate-400">{formatDate(addr.effectiveFrom)}</td>
                          <td className="px-4 py-3 text-slate-500">{addr.notes ?? '—'}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => onEditStart(addr)}
                                className="text-slate-400 hover:text-white"
                                title={t('settings.addresses.edit')}
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => onDeleteStart(addr.id)}
                                className="text-slate-500 hover:text-red-400"
                                title={t('settings.addresses.delete')}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {deletingId && (
            <div className="border border-red-900/40 rounded-xl p-4 bg-red-950/20 space-y-3">
              <p className="text-sm text-red-300">{t('settings.addresses.confirmDelete')}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => onDeleteConfirm(deletingId)}
                  className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-semibold text-sm"
                >
                  {t('common.actions.delete')}
                </button>
                <button
                  onClick={onDeleteCancel}
                  className="text-sm text-slate-400 hover:text-white"
                >
                  {t('common.actions.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
