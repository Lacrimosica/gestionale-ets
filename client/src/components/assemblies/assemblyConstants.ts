export const AGENDA_TEMPLATES: Record<string, { title: string; workflowType: string }[]> = {
  ordinary: [
    { title: 'Approvazione Bilancio Consuntivo', workflowType: 'budget_approval' },
    { title: 'Approvazione Bilancio Preventivo', workflowType: 'budget_approval' },
    { title: 'Relazione di missione', workflowType: '' },
    { title: 'Ammissione nuovi soci', workflowType: 'member_admission' },
    { title: 'Varie ed eventuali', workflowType: '' },
  ],
  extraordinary_generic: [
    { title: 'Discussione e deliberazione', workflowType: '' },
    { title: 'Varie ed eventuali', workflowType: '' },
  ],
  extraordinary_statute_modification: [
    { title: 'Presentazione e discussione della proposta di modifica dello Statuto sociale', workflowType: '' },
    { title: 'Approvazione delle modifiche allo Statuto sociale', workflowType: '' },
    { title: 'Varie ed eventuali', workflowType: '' },
  ],
  extraordinary_dissolution: [
    { title: "Deliberazione sullo scioglimento dell'associazione", workflowType: '' },
    { title: 'Nomina del liquidatore', workflowType: '' },
    { title: 'Deliberazione sulla devoluzione del patrimonio residuo ai sensi dello Statuto', workflowType: '' },
    { title: 'Varie ed eventuali', workflowType: '' },
  ],
  extraordinary_merger_split: [
    { title: 'Presentazione della proposta di fusione/scissione', workflowType: '' },
    { title: 'Deliberazione sul piano di fusione/scissione', workflowType: '' },
    { title: 'Varie ed eventuali', workflowType: '' },
  ],
  board_council_ordinary: [
    { title: 'Approvazione verbale riunione precedente', workflowType: '' },
    { title: 'Situazione economico-finanziaria', workflowType: '' },
    { title: 'Ammissione nuovi soci', workflowType: 'member_admission' },
    { title: 'Aggiornamento attività in corso', workflowType: '' },
    { title: 'Pianificazione attività', workflowType: '' },
    { title: 'Varie ed eventuali', workflowType: '' },
  ],
  board_council_extraordinary: [
    { title: 'Presentazione della questione urgente', workflowType: '' },
    { title: 'Discussione e deliberazione', workflowType: '' },
    { title: 'Varie ed eventuali', workflowType: '' },
  ],
};

export const SUBTYPE_LABELS: Record<string, string> = {
  generic: 'Generica',
  statute_modification: 'Modifica Statuto',
  dissolution: 'Scioglimento',
  merger_split: 'Fusione/Scissione',
  ordinary: 'Ordinaria',
  extraordinary: 'Straordinaria',
};
