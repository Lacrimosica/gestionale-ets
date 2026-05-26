import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { ListOrdered } from 'lucide-react';
import { API_BASE_URL } from '../../config';
import { useAgendaItemForm } from '../../hooks/useAgendaItemForm';
import { useAgendaItemEditForm } from '../../hooks/useAgendaItemEditForm';
import { AgendaItemCard } from './AgendaItemCard';
import { AddAgendaItemForm } from './AddAgendaItemForm';
import type {
  AgendaItem,
  ConvocationDetail,
  Candidate,
  WorkflowItemData,
} from '../../types/assembly';

interface AgendaItemsListProps {
  convocationDetail: ConvocationDetail | null;
  onConvocationDetailChange: (detail: ConvocationDetail) => void;
  testoVarie: string;
  onTestoVarieChange: (text: string) => void;
  candidates: Candidate[];
  candidatesLoading: boolean;
}

export const AgendaItemsList = ({
  convocationDetail,
  onConvocationDetailChange,
  testoVarie,
  onTestoVarieChange,
  candidates,
  candidatesLoading,
}: AgendaItemsListProps) => {
  const { t } = useTranslation();

  // State management via hooks
  const [expandedOdgItems, setExpandedOdgItems] = useState<Record<string, boolean>>({});
  const [savingWorkflowId, setSavingWorkflowId] = useState<string | null>(null);

  const newItemForm = useAgendaItemForm();
  const editForm = useAgendaItemEditForm();

  // Utilities
  const updateConvocationDetailItems = (updater: (items: AgendaItem[]) => AgendaItem[]) => {
    onConvocationDetailChange(
      convocationDetail ? { ...convocationDetail, agendaItems: updater(convocationDetail.agendaItems) } : convocationDetail!
    );
  };

  const formatItalianList = (items: string[]) => {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    const last = items[items.length - 1];
    const others = items.slice(0, -1);
    return `${others.join(', ')} e ${last}`;
  };

  // Handlers
  const handleAddAgendaItem = async () => {
    if (!convocationDetail?.id || !newItemForm.form.title.trim()) return;
    newItemForm.setAdding(true);
    try {
      const items = convocationDetail.agendaItems;
      const number = newItemForm.form.number ? parseInt(newItemForm.form.number, 10) : (items.length ?? 0) + 1;
      const res = await axios.post(`${API_BASE_URL}/convocations/${convocationDetail.id}/agenda`, {
        number: Number.isNaN(number) ? (items.length ?? 0) + 1 : number,
        title: newItemForm.form.title.trim(),
        description: newItemForm.form.description.trim() || undefined,
        workflowType: newItemForm.form.workflowType || null,
      });
      updateConvocationDetailItems((items) => [...items, res.data]);
      newItemForm.reset();
      newItemForm.setNumber(String((convocationDetail.agendaItems.length ?? 0) + 2));
    } catch {
      // Error handling would be done at parent level
    } finally {
      newItemForm.setAdding(false);
    }
  };

  const handleDeleteAgendaItem = async (itemId: string) => {
    if (!convocationDetail?.id) return;
    try {
      await axios.delete(`${API_BASE_URL}/convocations/${convocationDetail.id}/agenda/${itemId}`);
      updateConvocationDetailItems((items) => items.filter((i) => i.id !== itemId));
    } catch {
      // Error handling would be done at parent level
    }
  };

  const handleStartEditAgendaItem = (item: AgendaItem) => {
    editForm.startEdit(item);
  };

  const handleSaveAgendaItem = async () => {
    if (!convocationDetail?.id || !editForm.editingId || !editForm.form.title.trim()) return;
    editForm.setSaving(true);
    try {
      const number = parseInt(editForm.form.number, 10);
      const payload = {
        number: Number.isNaN(number) ? 0 : number,
        title: editForm.form.title.trim(),
        description: editForm.form.description.trim() || null,
        workflowType: editForm.form.workflowType || null,
      };
      await axios.patch(`${API_BASE_URL}/convocations/${convocationDetail.id}/agenda/${editForm.editingId}`, payload);
      updateConvocationDetailItems((items) =>
        items.map((i) => i.id === editForm.editingId ? { ...i, ...payload } : i)
      );
      editForm.cancel();
    } catch {
      // Error handling would be done at parent level
    } finally {
      editForm.setSaving(false);
    }
  };

  const handleUpdateOdgWorkflowData = (itemId: string, workflowData: WorkflowItemData) => {
    updateConvocationDetailItems((items) =>
      items.map((i) => i.id === itemId ? { ...i, workflowData } : i)
    );
  };

  const handleSaveAgendaWorkflow = async (item: AgendaItem) => {
    if (!convocationDetail?.id) return;
    setSavingWorkflowId(item.id);
    try {
      let newTitle = item.title;
      const data = item.workflowData ?? {};
      if (data.members && data.members.length > 0) {
        const names = formatItalianList(data.members);
        if (item.workflowType === 'member_admission') {
          newTitle = `Approvazione dell'ammissione alla qualità di socio di ${names}`;
        } else if (item.workflowType === 'member_resignation') {
          newTitle = `Presa d'atto delle dimissioni dalla qualità di soci di ${names}`;
        }
      }

      const payload: any = { workflowData: item.workflowData };
      if (newTitle !== item.title) {
        payload.title = newTitle;
      }

      await axios.patch(`${API_BASE_URL}/convocations/${convocationDetail.id}/agenda/${item.id}`, payload);
      updateConvocationDetailItems((items) =>
        items.map((i) => i.id === item.id ? { ...i, ...payload } : i)
      );
    } catch {
      // Error handling would be done at parent level
    } finally {
      setSavingWorkflowId(null);
    }
  };

  if (!convocationDetail) {
    return null;
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <ListOrdered size={18} className="text-purple-400" />
          {t('assemblies.agenda')}
        </h2>

        {convocationDetail.agendaItems.length > 0 ? (
          <>
            <ol className="space-y-3 mb-6">
              {[...convocationDetail.agendaItems].sort((a, b) => a.number - b.number).map((item) => (
                <AgendaItemCard
                  key={item.id}
                  item={item}
                  isEditing={editForm.editingId === item.id}
                  isExpanded={!!expandedOdgItems[item.id]}
                  editForm={editForm.form}
                  setNumber={editForm.setNumber}
                  setTitle={editForm.setTitle}
                  setDescription={editForm.setDescription}
                  setWorkflowType={editForm.setWorkflowType}
                  saving={editForm.saving}
                  onStartEdit={handleStartEditAgendaItem}
                  onSave={handleSaveAgendaItem}
                  onCancel={editForm.cancel}
                  onDelete={handleDeleteAgendaItem}
                  onToggleExpand={(id) => setExpandedOdgItems((prev) => ({ ...prev, [id]: !prev[id] }))}
                  onWorkflowDataChange={(data) => handleUpdateOdgWorkflowData(item.id, data)}
                  onSaveWorkflow={() => handleSaveAgendaWorkflow(item)}
                  savingWorkflow={savingWorkflowId === item.id}
                  candidates={candidates}
                  candidatesLoading={candidatesLoading}
                />
              ))}

              <li className="bg-slate-950/20 rounded-lg border border-slate-800/40 border-dashed transition-colors opacity-60">
                <div className="p-4 flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-sm font-bold text-slate-500 shrink-0">
                    {convocationDetail.agendaItems.length + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-slate-400">Varie ed eventuali</h3>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">Auto-aggiunto</span>
                    </div>
                    <textarea
                      value={testoVarie}
                      onChange={(e) => onTestoVarieChange(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/50 rounded-lg px-3 py-2 text-white text-xs min-h-[60px] focus:ring-1 focus:ring-purple-500/30"
                      placeholder="Testo specifico per questo punto (lascia vuoto per usare il predefinito)..."
                    />
                  </div>
                </div>
              </li>
            </ol>
          </>
        ) : (
          <p className="text-slate-500 text-sm mb-4">{t('assemblies.noAgendaItems')}</p>
        )}

        <AddAgendaItemForm
          formState={newItemForm.form}
          setTitle={newItemForm.setTitle}
          setDescription={newItemForm.setDescription}
          setNumber={newItemForm.setNumber}
          setWorkflowType={newItemForm.setWorkflowType}
          adding={newItemForm.adding}
          onAdd={handleAddAgendaItem}
        />
      </div>
    </div>
  );
};
