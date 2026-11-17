import { useState, useCallback, type SetStateAction } from 'react';
import { AGENDA_TEMPLATES } from '../components/assemblies/assemblyConstants';
import type { Assembly } from './useAssemblies';
import type { Candidate } from '../types/assembly';
import { formatItalianList, resolveMemberNames } from '../lib/agenda-members';

interface AgendaItem {
  title: string;
  workflowType: string;
  number: number;
  /** Person ids, sent as memberIds when the agenda item is created. */
  memberIds?: string[];
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

/** @param memberCandidates people offered by the agenda member picker, used to name them in auto-generated titles. */
const withTypeDefaults = (form: AssemblyForm): AssemblyForm => {
  switch (form.type) {
    case 'board_council':
      return { ...form, subtype: 'ordinary' };
    case 'extraordinary':
      return { ...form, subtype: 'generic' };
    case 'constitution':
      return { ...form, subtype: '', firstCallTime: '' };
    default:
      return { ...form, subtype: '' };
  }
};

export const useAssemblyForm = (memberCandidates: Candidate[] = []) => {
  const [form, setFormState] = useState<AssemblyForm>(() => {
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

  /**
   * Form setter that applies per-type defaults whenever the assembly type
   * changes. Done in the update itself (rather than an effect on form.type) so
   * consumers never see a render with a stale subtype.
   */
  const setForm = useCallback((update: SetStateAction<AssemblyForm>) => {
    setFormState((prev) => {
      const next = typeof update === 'function' ? update(prev) : update;
      return next.type === prev.type ? next : withTypeDefaults(next);
    });
  }, []);

  const [newAgendaTitle, setNewAgendaTitle] = useState('');
  const [newAgendaWorkflow, setNewAgendaWorkflowState] = useState('');
  const [newAgendaMemberIds, setNewAgendaMemberIdsState] = useState<string[]>([]);

  /** Changing the workflow clears picked members and proposes a default title. */
  const setNewAgendaWorkflow = (workflow: string) => {
    setNewAgendaWorkflowState(workflow);
    setNewAgendaMemberIdsState([]);
    if (workflow === 'member_admission') setNewAgendaTitle('Ammissione soci');
    if (workflow === 'member_resignation') setNewAgendaTitle("Presa d'atto dimissioni");
  };

  /** Picking members regenerates the title from their names. */
  const setNewAgendaMemberIds = (memberIds: string[]) => {
    setNewAgendaMemberIdsState(memberIds);
    if (!newAgendaWorkflow || memberIds.length === 0) return;

    const names = formatItalianList(resolveMemberNames(memberIds, [], memberCandidates).map((m) => m.name));
    if (newAgendaWorkflow === 'member_admission') {
      setNewAgendaTitle(`Approvazione dell'ammissione alla qualità di socio di ${names}`);
    } else if (newAgendaWorkflow === 'member_resignation') {
      setNewAgendaTitle(`Presa d'atto delle dimissioni dalla qualità di soci di ${names}`);
    }
  };

  const addAgendaItem = (title: string, workflowType: string) => {
    if (!title.trim()) return;

    const memberIds = newAgendaMemberIds.length > 0 ? newAgendaMemberIds : undefined;

    setForm((prev) => ({
      ...prev,
      initialAgenda: [
        ...prev.initialAgenda,
        {
          title,
          workflowType,
          number: prev.initialAgenda.length + 1,
          memberIds,
        },
      ],
    }));
    setNewAgendaTitle('');
    setNewAgendaWorkflowState('');
    setNewAgendaMemberIdsState([]);
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
    newAgendaMemberIds,
    setNewAgendaMemberIds,
    addAgendaItem,
    removeAgendaItem,
    applyCurrentTemplate,
    computeConvocationDate,
  };
};
