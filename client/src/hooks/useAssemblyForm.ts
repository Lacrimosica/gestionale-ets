import { useState, useEffect } from 'react';
import { AGENDA_TEMPLATES } from '../components/assemblies/assemblyConstants';
import type { Assembly } from './useAssemblies';

interface AgendaItem {
  title: string;
  workflowType: string;
  number: number;
  workflowData?: any;
}

interface AssemblyForm {
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

  // Reset subtype and time defaults when type changes
  useEffect(() => {
    if (form.type === 'board_council') {
      setForm(prev => ({ ...prev, subtype: 'ordinary' }));
    } else if (form.type === 'extraordinary') {
      setForm(prev => ({ ...prev, subtype: 'generic' }));
    } else if (form.type === 'constitution') {
      setForm(prev => ({ ...prev, subtype: '', firstCallTime: '' }));
    } else {
      setForm(prev => ({ ...prev, subtype: '' }));
    }
  }, [form.type]);

  const formatItalianList = (items: string[]) => {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    const last = items[items.length - 1];
    const others = items.slice(0, -1);
    return `${others.join(', ')} e ${last}`;
  };

  // Auto-generate title based on members
  useEffect(() => {
    if (!newAgendaWorkflow || newAgendaMembers.length === 0) return;

    const names = formatItalianList(newAgendaMembers);
    if (newAgendaWorkflow === 'member_admission') {
      setNewAgendaTitle(`Approvazione dell'ammissione alla qualità di socio di ${names}`);
    } else if (newAgendaWorkflow === 'member_resignation') {
      setNewAgendaTitle(`Presa d'atto delle dimissioni dalla qualità di soci di ${names}`);
    }
  }, [newAgendaWorkflow, newAgendaMembers]);

  // Reset members when workflow changes
  useEffect(() => {
    setNewAgendaMembers([]);
    if (newAgendaWorkflow === 'member_admission') setNewAgendaTitle('Ammissione soci');
    if (newAgendaWorkflow === 'member_resignation') setNewAgendaTitle("Presa d'atto dimissioni");
  }, [newAgendaWorkflow]);

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
