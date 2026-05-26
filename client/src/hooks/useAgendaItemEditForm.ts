import { useState } from 'react';
import type { AgendaItem, WorkflowItemType } from '../types/assembly';

export const useAgendaItemEditForm = () => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [number, setNumber] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [workflowType, setWorkflowType] = useState<WorkflowItemType | ''>('');
  const [saving, setSaving] = useState(false);

  const startEdit = (item: AgendaItem) => {
    setEditingId(item.id);
    setNumber(String(item.number));
    setTitle(item.title);
    setDescription(item.description ?? '');
    setWorkflowType((item.workflowType ?? '') as WorkflowItemType | '');
  };

  const cancel = () => {
    setEditingId(null);
    setNumber('');
    setTitle('');
    setDescription('');
    setWorkflowType('');
  };

  return {
    editingId,
    form: { number, title, description, workflowType },
    setNumber,
    setTitle,
    setDescription,
    setWorkflowType,
    saving,
    setSaving,
    startEdit,
    cancel,
  };
};
