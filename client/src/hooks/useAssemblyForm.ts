import { useState } from 'react';
import { AGENDA_TEMPLATES } from '../components/assemblies/assemblyConstants';
import type { Assembly } from './useAssemblies';
import type { WorkflowItemData } from '../types/assembly';

interface AgendaItem {
  title: string;
  workflowType: string;
  number: number;
  workflowData?: WorkflowItemData;
}

export interface AssemblyForm {
  type: Assembly['type'];
  subtype: string;
  firstCallDate: string;
  firstCallTime: string;
  convocationDate: string;
  location: string;
  meetLink: string;
  mode: 'in_person' | 'remote' | 'hybrid';
  presidentId: string;
  secretaryId: string;
  boardGenerationId: string;
  hasSecondCall: boolean;
  secondCallDate: string;
  secondCallTime: string;
  secondCallLocation: string;
  secondCallMode: 'in_person' | 'remote' | 'hybrid';
  initialAgenda: AgendaItem[];
}

const computeConvocationDate = (firstCallDate: string) => {
  if (!firstCallDate) return '';
  const d = new Date(firstCallDate);
  d.setDate(d.getDate() - 15);
  return d.toISOString().split('T')[0];
};

function subtypeDefaults(type: AssemblyForm['type']): Partial<AssemblyForm> {
  if (type === 'board_council') return { subtype: 'ordinary' };
  if (type === 'extraordinary') return { subtype: 'generic' };
  if (type === 'constitution') return { subtype: '', firstCallTime: '' };
  return { subtype: '' };
}

export const useAssemblyForm = () => {
  const [form, setForm] = useState<AssemblyForm>(() => {
    const firstCallDate = new Date().toISOString().split('T')[0];
    return {
      type: 'ordinary' as Assembly['type'],
      subtype: '' as string,
      firstCallDate,
      firstCallTime: '18:00',
      convocationDate: computeConvocationDate(firstCallDate),
      location: '',
      meetLink: '',
      mode: 'in_person',
      presidentId: '',
      secretaryId: '',
      boardGenerationId: '',
      hasSecondCall: false,
      secondCallDate: '',
      secondCallTime: '18:30',
      secondCallLocation: '',
      secondCallMode: 'in_person',
      initialAgenda: [] as AgendaItem[],
    };
  });

  const [newAgendaTitle, setNewAgendaTitle] = useState('');
  const [newAgendaWorkflow, setNewAgendaWorkflow] = useState('');
  const [newAgendaMembers, setNewAgendaMembers] = useState<string[]>([]);

  // Subtype and time defaults follow the type. Adjusted during render (not in an
  // effect) so the form never renders with the previous type's defaults.
  const [trackedType, setTrackedType] = useState(form.type);
  if (form.type !== trackedType) {
    setTrackedType(form.type);
    setForm(prev => ({ ...prev, ...subtypeDefaults(form.type) }));
  }

  const formatItalianList = (items: string[]) => {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    const last = items[items.length - 1];
    const others = items.slice(0, -1);
    return `${others.join(', ')} e ${last}`;
  };

  // Title and member list follow the workflow and the picked members. Both are
  // adjusted during render, in the order the workflow change needs them.
  const [trackedWorkflow, setTrackedWorkflow] = useState(newAgendaWorkflow);
  const [trackedMembers, setTrackedMembers] = useState(newAgendaMembers);
  if (newAgendaWorkflow !== trackedWorkflow) {
    setTrackedWorkflow(newAgendaWorkflow);
    setNewAgendaMembers([]);
    if (newAgendaWorkflow === 'member_admission') setNewAgendaTitle('Ammissione soci');
    if (newAgendaWorkflow === 'member_resignation') setNewAgendaTitle("Presa d'atto dimissioni");
  } else if (newAgendaMembers !== trackedMembers) {
    setTrackedMembers(newAgendaMembers);
    if (newAgendaWorkflow && newAgendaMembers.length > 0) {
      const names = formatItalianList(newAgendaMembers);
      if (newAgendaWorkflow === 'member_admission') {
        setNewAgendaTitle(`Approvazione dell'ammissione alla qualità di socio di ${names}`);
      } else if (newAgendaWorkflow === 'member_resignation') {
        setNewAgendaTitle(`Presa d'atto delle dimissioni dalla qualità di soci di ${names}`);
      }
    }
  }

  const addAgendaItem = (title: string, workflowType: string) => {
    if (!title.trim()) return;

    const workflowData = newAgendaMembers.length > 0 ? { members: newAgendaMembers } : undefined;

    setForm((prev) => ({
      ...prev,
      initialAgenda: [
        ...prev.initialAgenda,
        {
          title,
          workflowType,
          number: prev.initialAgenda.length + 1,
          workflowData,
        },
      ],
    }));
    setNewAgendaTitle('');
    setNewAgendaWorkflow('');
    setNewAgendaMembers([]);
  };

  const removeAgendaItem = (index: number) => {
    setForm((prev) => {
      const newList = prev.initialAgenda.filter((_, i) => i !== index);
      return {
        ...prev,
        initialAgenda: newList.map((item, i) => ({ ...item, number: i + 1 })),
      };
    });
  };

  const applyTemplate = (key: string) => {
    const template = AGENDA_TEMPLATES[key] || [];
    setForm((prev) => ({
      ...prev,
      initialAgenda: template.map((t, i) => ({ ...t, number: i + 1 })),
    }));
  };

  const applyCurrentTemplate = () => {
    if (form.type === 'ordinary') {
      applyTemplate('ordinary');
    } else if (form.type === 'extraordinary' && form.subtype) {
      applyTemplate(`extraordinary_${form.subtype}`);
    } else if (form.type === 'board_council' && form.subtype) {
      applyTemplate(`board_council_${form.subtype}`);
    }
  };

  return {
    form,
    setForm,
    newAgendaTitle,
    setNewAgendaTitle,
    newAgendaWorkflow,
    setNewAgendaWorkflow,
    newAgendaMembers,
    setNewAgendaMembers,
    addAgendaItem,
    removeAgendaItem,
    applyCurrentTemplate,
    computeConvocationDate,
  };
};
