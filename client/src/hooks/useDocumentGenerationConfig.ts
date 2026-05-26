import { useState, useCallback } from 'react';
import type { GenConfig, WorkflowItemType } from '../types/assembly';

interface UseDocumentGenerationConfigReturn {
  config: GenConfig;
  setConfig: (config: GenConfig) => void;
  setIsOpen: (isOpen: boolean) => void;
  setActiveWorkflows: (workflows: WorkflowItemType[]) => void;
  setSelectedAgendaItemIds: (ids: string[]) => void;
  setIncludeResignations: (include: boolean) => void;
  setCity: (city: string) => void;
  setVenue: (venue: string) => void;
  setSecondCallDate: (date: string) => void;
  setSecondCallTime: (time: string) => void;
  setSociTotali: (count: string) => void;
  setSociPresenti: (count: string) => void;
  setSociOnline: (count: string) => void;
  setInPresenzaPrima: (count: string) => void;
  setInDelegaPrima: (count: string) => void;
  setInPresenzaSeconda: (count: string) => void;
  setInDelegaSeconda: (count: string) => void;
  setSignatoryRole: (role: string) => void;
  setFormulaPrima: (formula: string) => void;
  setFormulaSeconda: (formula: string) => void;
  setFormulaApertura: (formula: string) => void;
  setVoting: (voting: Record<string, any>) => void;
  setTestoVarie: (text: string) => void;
  setGenerateConvocation: (generate: boolean) => void;
  setGenerateMinutes1a: (generate: boolean) => void;
  setGenerateMinutes2a: (generate: boolean) => void;
  setGenerateGoogleDoc: (generate: boolean) => void;
  setGeneratePdf: (generate: boolean) => void;
  setDataNewMembers: (members: any[]) => void;
  setDataBudgetYear: (year: string) => void;
  setDataNewBoard: (board: any[]) => void;
  setDataExcludedMembers: (members: any[]) => void;
  setDataResignations: (resignations: any[]) => void;
  setOutputFolderOverride: (folder: string) => void;
  reset: () => void;
  syncSecondCallDate: (date: string, time: string) => void;
}

const DEFAULT_CONFIG: GenConfig = {
  isOpen: false,
  activeWorkflows: [],
  selectedAgendaItemIds: [],
  includeResignations: false,
  city: '',
  venue: '',
  secondCallDate: '',
  secondCallTime: '',
  sociTotali: '',
  sociPresenti: '',
  sociOnline: '',
  inPresenzaPrima: '2',
  inDelegaPrima: '0',
  inPresenzaSeconda: '2',
  inDelegaSeconda: '0',
  signatoryRole: 'Il Presidente',
  formulaPrima: '',
  formulaSeconda: '',
  formulaApertura: '',
  voting: {},
  testoVarie: '',
  generateConvocation: true,
  generateMinutes1a: true,
  generateMinutes2a: true,
  generateGoogleDoc: true,
  generatePdf: true,
  data: {
    newMembers: [],
    budgetYear: '',
    newBoard: [],
    excludedMembers: [],
    resignations: [{ name: '', date: '' }],
  },
  outputFolderOverride: '',
};

export const useDocumentGenerationConfig = (): UseDocumentGenerationConfigReturn => {
  const [config, setConfig] = useState<GenConfig>(DEFAULT_CONFIG);

  const reset = () => setConfig(DEFAULT_CONFIG);

  const syncSecondCallDate = useCallback((date: string, time: string) => {
    setConfig(prev => ({
      ...prev,
      secondCallDate: date,
      secondCallTime: time,
    }));
  }, []);

  const updateConfig = (updates: Partial<GenConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const updateDataField = (field: keyof GenConfig['data'], value: any) => {
    setConfig(prev => ({
      ...prev,
      data: { ...prev.data, [field]: value },
    }));
  };

  return {
    config,
    setConfig,
    setIsOpen: (isOpen) => updateConfig({ isOpen }),
    setActiveWorkflows: (activeWorkflows) => updateConfig({ activeWorkflows }),
    setSelectedAgendaItemIds: (selectedAgendaItemIds) => updateConfig({ selectedAgendaItemIds }),
    setIncludeResignations: (includeResignations) => updateConfig({ includeResignations }),
    setCity: (city) => updateConfig({ city }),
    setVenue: (venue) => updateConfig({ venue }),
    setSecondCallDate: (secondCallDate) => updateConfig({ secondCallDate }),
    setSecondCallTime: (secondCallTime) => updateConfig({ secondCallTime }),
    setSociTotali: (sociTotali) => updateConfig({ sociTotali }),
    setSociPresenti: (sociPresenti) => updateConfig({ sociPresenti }),
    setSociOnline: (sociOnline) => updateConfig({ sociOnline }),
    setInPresenzaPrima: (inPresenzaPrima) => updateConfig({ inPresenzaPrima }),
    setInDelegaPrima: (inDelegaPrima) => updateConfig({ inDelegaPrima }),
    setInPresenzaSeconda: (inPresenzaSeconda) => updateConfig({ inPresenzaSeconda }),
    setInDelegaSeconda: (inDelegaSeconda) => updateConfig({ inDelegaSeconda }),
    setSignatoryRole: (signatoryRole) => updateConfig({ signatoryRole }),
    setFormulaPrima: (formulaPrima) => updateConfig({ formulaPrima }),
    setFormulaSeconda: (formulaSeconda) => updateConfig({ formulaSeconda }),
    setFormulaApertura: (formulaApertura) => updateConfig({ formulaApertura }),
    setVoting: (voting) => updateConfig({ voting }),
    setTestoVarie: (testoVarie) => updateConfig({ testoVarie }),
    setGenerateConvocation: (generateConvocation) => updateConfig({ generateConvocation }),
    setGenerateMinutes1a: (generateMinutes1a) => updateConfig({ generateMinutes1a }),
    setGenerateMinutes2a: (generateMinutes2a) => updateConfig({ generateMinutes2a }),
    setGenerateGoogleDoc: (generateGoogleDoc) => updateConfig({ generateGoogleDoc }),
    setGeneratePdf: (generatePdf) => updateConfig({ generatePdf }),
    setDataNewMembers: (newMembers) => updateDataField('newMembers', newMembers),
    setDataBudgetYear: (budgetYear) => updateDataField('budgetYear', budgetYear),
    setDataNewBoard: (newBoard) => updateDataField('newBoard', newBoard),
    setDataExcludedMembers: (excludedMembers) => updateDataField('excludedMembers', excludedMembers),
    setDataResignations: (resignations) => updateDataField('resignations', resignations),
    setOutputFolderOverride: (outputFolderOverride) => updateConfig({ outputFolderOverride }),
    reset,
    syncSecondCallDate,
  };
};
