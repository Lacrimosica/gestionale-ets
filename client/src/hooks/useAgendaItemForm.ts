import { useState } from 'react';
import type { WorkflowItemType } from '../types/assembly';

export const useAgendaItemForm = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [number, setNumber] = useState('');
  const [workflowType, setWorkflowType] = useState<WorkflowItemType | ''>('');
  const [adding, setAdding] = useState(false);

  const reset = () => {
    setTitle('');
    setDescription('');
    setNumber('');
    setWorkflowType('');
  };

  return {
    form: { title, description, number, workflowType },
    setTitle,
    setDescription,
    setNumber,
    setWorkflowType,
    adding,
    setAdding,
    reset,
  };
};
