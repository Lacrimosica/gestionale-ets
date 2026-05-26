import { useState, useEffect } from 'react';
import {
  Save, Loader2, AlertCircle, X
} from 'lucide-react';
import { useDocuments, type GenerateInput, type WorkflowType, type GenerateResult } from '../../hooks/useDocuments';
import { useModalityOptions, useDocumentSettings } from '../../hooks/useSettings';
import type {
  GenConfig,
  AssemblyDetailData,
  ConvocationDetail,
} from '../../types/assembly';

const DOC_INPUT_CLS = 'w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all';

const ODG_TO_DOC_WORKFLOW: Record<string, WorkflowType> = {
  'member_admission': 'member_admission',
  'member_resignation': 'member_resignation',
  'member_exclusion': 'member_exclusion',
  'budget_approval': 'budget_approval',
  'board_election': 'board_election'
};

interface DocumentGenerationPanelProps {
  assemblyId?: string;
  data: AssemblyDetailData | null;
  convocationDetail: ConvocationDetail | null;
  genConfig: GenConfig;
  onGenConfigChange: (genConfig: GenConfig) => void;
}

export const DocumentGenerationPanel = ({
  assemblyId,
  data,
  convocationDetail,
  genConfig,
  onGenConfigChange,
}: DocumentGenerationPanelProps) => {
  const { generateDocuments } = useDocuments();
  const { options: modalityOptions } = useModalityOptions(true);
  const { settings: docSettings } = useDocumentSettings(true);
  const [docGenerating, setDocGenerating] = useState(false);
  const [docResult, setDocResult] = useState<GenerateResult | null>(null);
  const [docGenError, setDocGenError] = useState<string | null>(null);

  // Helpers
  const setGenField = <K extends keyof GenConfig>(field: K, value: GenConfig[K]) => {
    onGenConfigChange({ ...genConfig, [field]: value });
  };

  const toggleWorkflow = (wf: WorkflowType) => {
    onGenConfigChange({
      ...genConfig,
      activeWorkflows: genConfig.activeWorkflows.includes(wf)
        ? genConfig.activeWorkflows.filter(t => t !== wf)
        : [...genConfig.activeWorkflows, wf]
    });
  };


  // Auto-fill from ODG when opened
  useEffect(() => {
    if (!genConfig.isOpen || !convocationDetail) return;

    const odgWorkflows = convocationDetail.agendaItems
      .filter(item => item.workflowType && item.workflowType in ODG_TO_DOC_WORKFLOW)
      .map(item => ODG_TO_DOC_WORKFLOW[item.workflowType!]!);

    const admissionItem = convocationDetail.agendaItems.find((i) => i.workflowType === 'member_admission');
    const exclusionItem = convocationDetail.agendaItems.find((i) => i.workflowType === 'member_exclusion');
    const electionItem = convocationDetail.agendaItems.find((i) => i.workflowType === 'board_election');
    const budgetItem = convocationDetail.agendaItems.find((i) => i.workflowType === 'budget_approval');
    const resignationItem = convocationDetail.agendaItems.find((i) => i.workflowType === 'member_resignation');

    const genericItemIds = convocationDetail.agendaItems
      .filter((item) => {
        const lowTitle = item.title.toLowerCase().trim();
        const isWorkflow = !!item.workflowType;
        const isVarie = lowTitle === 'varie ed eventuali';
        return !isWorkflow && !isVarie;
      })
      .map(i => i.id);

    onGenConfigChange({
      ...genConfig,
      activeWorkflows: odgWorkflows.length > 0 ? odgWorkflows : genConfig.activeWorkflows,
      selectedAgendaItemIds: genericItemIds,
      includeResignations: !!resignationItem,
      secondCallDate: (convocationDetail.assembly2 as any)?.firstCallDate || genConfig.secondCallDate,
      secondCallTime: (convocationDetail.assembly2 as any)?.firstCallTime || genConfig.secondCallTime,
      city: docSettings?.city || genConfig.city,
      venue: data?.location || genConfig.venue,

      formulaPrima: data?.modalityFormulaPrima || genConfig.formulaPrima,
      formulaSeconda: convocationDetail.assembly2?.modalityFormulaPrima || genConfig.formulaSeconda,
      formulaApertura: data?.modalityFormulaApertura || genConfig.formulaApertura,

      data: {
        ...genConfig.data,
        newMembers: admissionItem?.workflowData?.members || genConfig.data.newMembers,
        excludedMembers: exclusionItem?.workflowData?.members || genConfig.data.excludedMembers,
        newBoard: electionItem?.workflowData?.members || genConfig.data.newBoard,
        budgetYear: budgetItem?.workflowData?.budgetYear ? String(budgetItem.workflowData.budgetYear) : genConfig.data.budgetYear,
        resignations: resignationItem?.workflowData?.members?.map((m: any) => ({ name: m, date: resignationItem?.workflowData?.resignationDate || '' })) || genConfig.data.resignations,
      }
    });
  }, [genConfig.isOpen, convocationDetail, docSettings, data?.location]);

  // Handle Modality defaults
  useEffect(() => {
    if (!genConfig.isOpen || !docSettings) return;

    // Phase 5: Use new field name with fallback to old
    const defaultVarie = docSettings.miscellaneousDefaultText ?? docSettings.varieDefaultText;
    if (!genConfig.testoVarie && defaultVarie) {
      setGenField('testoVarie', defaultVarie);
    }
  }, [genConfig.isOpen, docSettings]);

  useEffect(() => {
    if (!genConfig.isOpen || !modalityOptions) return;

    if (!genConfig.formulaPrima && !genConfig.formulaSeconda && !genConfig.formulaApertura) {
      const assemblyMode = data?.mode;
      const defConv = modalityOptions.find(o => o.type === 'convocation' && o.isDefault && (o.mode === 'any' || o.mode === assemblyMode))?.value || '';
      const defMin = modalityOptions.find(o => o.type === 'minutes_opening' && o.isDefault && (o.mode === 'any' || o.mode === assemblyMode))?.value || '';

      onGenConfigChange({
        ...genConfig,
        formulaPrima: defConv,
        formulaSeconda: convocationDetail?.assembly2
          ? (modalityOptions.find(o => o.type === 'convocation' && o.isDefault && (o.mode === 'any' || o.mode === convocationDetail.assembly2?.mode))?.value || '')
          : '',
        formulaApertura: defMin,
      });
    }
  }, [genConfig.isOpen, modalityOptions, genConfig.formulaPrima, genConfig.formulaSeconda, genConfig.formulaApertura, data?.mode, convocationDetail]);

  const handleGenerateDocuments = async () => {
    if (!data || !assemblyId) return;
    setDocGenerating(true);
    setDocGenError(null);
    setDocResult(null);

    const {
      activeWorkflows, includeResignations, selectedAgendaItemIds,
      sociTotali, sociPresenti, sociOnline, inPresenzaPrima, inDelegaPrima, inPresenzaSeconda, inDelegaSeconda,
      signatoryRole, formulaPrima, formulaSeconda, formulaApertura, voting, testoVarie,
      generateConvocation, generateMinutes1a, generateMinutes2a, generateGoogleDoc, generatePdf,
      city, venue, outputFolderOverride, data: workflowData
    } = genConfig;

    try {
      const firstCallDate = data.firstCallDate ?? '';
      const firstCallTime = data.firstCallTime ?? '00:00';
      const firstCallStart = `${firstCallDate}T${firstCallTime}`;
      const sCallTime = genConfig.secondCallTime || '00:00';
      const secondCallStart = data.type === 'board_council'
        ? firstCallStart
        : `${genConfig.secondCallDate}T${sCallTime}`;

      if (activeWorkflows.length === 0 && !includeResignations && selectedAgendaItemIds.length === 0) {
        setDocGenError('Seleziona almeno un tipo di documento o punto dell\'ordine del giorno.');
        setDocGenerating(false);
        return;
      }

      if (activeWorkflows.includes('member_admission') && workflowData.newMembers.length === 0) {
        setDocGenError('Seleziona almeno un nuovo socio per Ammissione soci.');
        setDocGenerating(false);
        return;
      }
      if (activeWorkflows.includes('board_election') && workflowData.newBoard.length === 0) {
        setDocGenError('Seleziona almeno un membro per Elezione direttivo.');
        setDocGenerating(false);
        return;
      }
      if (activeWorkflows.includes('member_exclusion') && workflowData.excludedMembers.length === 0) {
        setDocGenError('Seleziona almeno un socio da escludere.');
        setDocGenerating(false);
        return;
      }

      const agenda = convocationDetail?.agendaItems ?? [];
      const sortedAgenda = [...agenda].sort((a, b) => a.number - b.number);

      const extraAgendaItems = sortedAgenda
        .filter(item => selectedAgendaItemIds.includes(item.id))
        .map(item => ({ id: item.id, title: item.title, body: item.description ?? undefined }));

      const input: GenerateInput = {
        workflowTypes: activeWorkflows,
        assemblyId: assemblyId,
        assemblyNumber: data.referenceNumber,
        firstCallStart,
        secondCallStart,
        endTime: data.endTime || undefined,
        totalMembers: Number(sociTotali),
        presentMembers: Number(sociPresenti),
        president: data.presidentName,
        secretary: data.secretaryName,
        signatoryRole,
        firstCallModality: formulaPrima,
        secondCallModality: formulaSeconda,
        minutesOpeningModality: formulaApertura,
        votingResults: voting,
        city: city || undefined,
        venue: venue || undefined,
        generateConvocation,
        generateMinutes1a,
        generateMinutes2a,
        generateGoogleDoc,
        generatePdf,
      };

      if (sociOnline !== '') input.onlineMembers = Number(sociOnline);
      if (inPresenzaPrima !== '') input.inPersonMembersFirst = Number(inPresenzaPrima);
      if (inDelegaPrima !== '') input.proxyMembersFirst = Number(inDelegaPrima);
      if (inPresenzaSeconda !== '') input.inPersonMembersSecond = Number(inPresenzaSeconda);
      if (inDelegaSeconda !== '') input.proxyMembersSecond = Number(inDelegaSeconda);
      if (outputFolderOverride.trim()) input.outputFolderIdOverride = outputFolderOverride.trim();

      if (activeWorkflows.includes('member_admission')) input.newMembers = workflowData.newMembers.join('\n');
      if (activeWorkflows.includes('budget_approval')) input.budgetYear = Number(workflowData.budgetYear);
      if (activeWorkflows.includes('board_election')) input.newBoard = workflowData.newBoard.join('\n');
      if (activeWorkflows.includes('member_exclusion')) input.excludedMembers = workflowData.excludedMembers.join('\n');

      if (includeResignations) input.resignations = workflowData.resignations.filter((d) => d.name.trim() !== '');
      if (extraAgendaItems.length > 0) input.extraAgendaItems = extraAgendaItems;
      if (testoVarie.trim()) input.varieOverrideText = testoVarie.trim();

      const res = await generateDocuments(input);
      setDocResult(res);
    } catch (err: any) {
      const apiError = err?.response?.data?.error;
      setDocGenError(apiError ?? err.message ?? 'Errore durante la generazione');
    } finally {
      setDocGenerating(false);
    }
  };

  if (!genConfig.isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-2xl w-full my-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Generazione Documenti</h2>
          <button
            onClick={() => onGenConfigChange({ ...genConfig, isOpen: false })}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {docGenError && (
          <div className="mb-4 p-4 bg-red-950/30 border border-red-800 rounded-lg flex items-start gap-3">
            <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-200">{docGenError}</p>
          </div>
        )}

        {docResult && (
          <div className="mb-4 p-4 bg-emerald-950/30 border border-emerald-800 rounded-lg">
            <p className="text-sm text-emerald-200">Documentos generados correctamente</p>
          </div>
        )}

        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Workflow Selection */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide block mb-2">Tipi di Documento</label>
            <div className="space-y-2">
              {[
                { key: 'member_admission', label: 'Ammissione Soci' },
                { key: 'budget_approval', label: 'Approvazione Bilancio' },
                { key: 'board_election', label: 'Elezione Direttivo' },
                { key: 'member_exclusion', label: 'Esclusione Soci' },
                { key: 'member_resignation', label: 'Dimissioni Soci' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/30 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={genConfig.activeWorkflows.includes(key as WorkflowType)}
                    onChange={() => toggleWorkflow(key as WorkflowType)}
                    className="w-4 h-4 accent-emerald-500"
                  />
                  <span className="text-sm text-slate-300">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Attendance Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Soci Totali</label>
              <input
                type="number"
                value={genConfig.sociTotali}
                onChange={(e) => setGenField('sociTotali', e.target.value)}
                className={DOC_INPUT_CLS}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Soci Presenti</label>
              <input
                type="number"
                value={genConfig.sociPresenti}
                onChange={(e) => setGenField('sociPresenti', e.target.value)}
                className={DOC_INPUT_CLS}
              />
            </div>
          </div>

          {/* Workflow Data Fields */}
          {genConfig.activeWorkflows.includes('member_admission') && (
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Nuovi Soci</label>
              <textarea
                value={genConfig.data.newMembers.join('\n')}
                onChange={(e) => setGenField('data', {
                  ...genConfig.data,
                  newMembers: e.target.value.split('\n').filter(m => m.trim())
                })}
                rows={3}
                className={`${DOC_INPUT_CLS} resize-none`}
                placeholder="Un nome per riga"
              />
            </div>
          )}

          {/* Signatory Role */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Ruolo Firmatario</label>
            <input
              type="text"
              value={genConfig.signatoryRole}
              onChange={(e) => setGenField('signatoryRole', e.target.value)}
              className={DOC_INPUT_CLS}
            />
          </div>

          {/* Formula Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Formula Convocazione</label>
              <select
                value={genConfig.formulaPrima}
                onChange={(e) => setGenField('formulaPrima', e.target.value)}
                className={DOC_INPUT_CLS}
              >
                <option value="">— Seleziona —</option>
                {modalityOptions?.filter(o => o.type === 'convocation').map(opt => (
                  <option key={opt.id} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Formula Apertura</label>
              <select
                value={genConfig.formulaApertura}
                onChange={(e) => setGenField('formulaApertura', e.target.value)}
                className={DOC_INPUT_CLS}
              >
                <option value="">— Seleziona —</option>
                {modalityOptions?.filter(o => o.type === 'minutes_opening').map(opt => (
                  <option key={opt.id} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Generate Button */}
          <button
            type="button"
            disabled={docGenerating || !genConfig.sociTotali || !genConfig.sociPresenti}
            onClick={handleGenerateDocuments}
            className="w-full relative flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-sm transition-all shadow-lg hover:shadow-emerald-900/20 active:scale-[0.98]"
          >
            {docGenerating ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {docGenerating ? 'Generazione in corso...' : 'Genera Documenti'}
          </button>
        </div>
      </div>
    </div>
  );
};
