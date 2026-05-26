import { getAccessToken, type GoogleAuthEnv } from '../services/google-auth';
import { copyFile, exportAsPdf, savePdf } from '../services/google-drive';
import { fillPlaceholders } from '../services/google-docs';
import {
  subtract14Days,
  add35Minutes,
  add2Hours,
  add1Year,
  formatItalianDate,
  formatItalianTime,
} from './date-utils';

export type WorkflowType =
  | 'member_admission'
  | 'budget_approval'
  | 'board_election'
  | 'member_exclusion'
  | 'member_resignation';

export const ALL_WORKFLOW_TYPES: WorkflowType[] = [
  'member_admission',
  'budget_approval',
  'board_election',
  'member_exclusion',
  'member_resignation',
];

export type DimissioneSocio = {
  name: string;
  date: string; // free text, e.g. "15 marzo 2026"
};

export type AgendaItemExtra = {
  id?: string;
  title: string;
  body?: string; // optional verbale body text for this point
};

export type VotingResult = {
  title?: string;
  outcome: string;
  details?: string;
};

// Org-level settings loaded from the DB at generation time
export type OrgSettings = {
  organizationName: string;
  city: string;
  address: string;       // resolved from organizationAddress table at the assembly date
  statuteArticleConvocation: string;
  statuteArticleProxies: string;
  statuteArticleMembers: string;
  statuteArticleBoardVote: string;
  statuteArticleBoardElection: string;
  maxProxies: number;
  outputFolderId: string;
  templateConvocationId: string;
  templateMinutes1aId?: string | null;
  templateMinutes2aId?: string | null;
  // Phase 5: Renamed from varieDefaultText to miscellaneousDefaultText
  miscellaneousDefaultText?: string | null;
  // Keep old name for backward compatibility during transition
  varieDefaultText?: string | null;
};

export type WorkflowInput = {
  workflowTypes: WorkflowType[];       // replaces single workflowType
  assemblyNumber: number;
  firstCallStart: string;              // ISO8601
  secondCallStart: string;             // ISO8601
  totalMembers: number;
  presentMembers: number;
  onlineMembers?: number;              // defaults to presentMembers - inPersonMembersSecond
  inPersonMembersFirst?: number;       // defaults to 2; = proxyMembersFirst + in-person-proprio
  proxyMembersFirst?: number;          // members attending by proxy at 1a convocazione; defaults to 0
  inPersonMembersSecond?: number;      // defaults to 2; = proxyMembersSecond + in-person-proprio-2a
  proxyMembersSecond?: number;         // members attending by proxy at 2a convocazione; defaults to 0
  secondCallEnd?: string;              // ISO8601 or HH:mm
  varieOverrideText?: string;
  city?: string;                       // override for orgSettings.city
  venue?: string;                      // override for orgSettings.address (statutory seat)
  votingResults?: Record<string, VotingResult[]>; // keyed by workflow type or other point identifiers
  president: string;
  secretary: string;
  signatoryRole: string;               // e.g. "Il Presidente"
  firstCallModality: string;           // full Italian text for convocation
  secondCallModality: string;          // full Italian text for convocation
  minutesOpeningModality: string;      // full Italian text for verbale 2a opening
  voteOutcome?: string;                // defaults to "all'unanimità"
  outputFolderIdOverride?: string;     // overrides org setting at generation time
  // generation flags
  generateConvocation?: boolean;       // default true
  generateMinutes1a?: boolean;         // default true
  generateMinutes2a?: boolean;         // default true
  generateGoogleDoc?: boolean;         // default true
  generatePdf?: boolean;               // default true
  // workflow-specific
  newMembers?: string;                 // member_admission
  budgetYear?: number;                 // budget_approval
  newBoard?: string;                   // board_election
  excludedMembers?: string;            // member_exclusion
  // optional extra sections
  resignations?: DimissioneSocio[];
  extraAgendaItems?: AgendaItemExtra[];
};

export type GenerationResult = {
  convocation?: { driveUrl: string; pdfUrl: string };
  minutes1a?: { driveUrl: string; pdfUrl: string };
  minutes2a?: { driveUrl: string; pdfUrl: string };
};

export type DAMEnv = GoogleAuthEnv;

export function buildMeetingCode(year: number, assemblyNumber: number): string {
  return `${year}_${assemblyNumber}`;
}

export function toBulletList(raw: string): string {
  return raw
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => `- ${line.trim()}\n`)
    .join('');
}

/**
 * Renders one or more voting results for a deliberation block.
 * If multiple votes are present, they are listed. If one, it is rendered inline.
 */
function renderVotingResults(type: string, input: WorkflowInput, defaultActionText: string): string {
  const votes = input.votingResults?.[type] || [];
  
  if (votes.length === 0) {
    const legacyVote = input.voteOutcome || "all'unanimità";
    return `${legacyVote}, ${defaultActionText}`;
  }

  if (votes.length === 1) {
    const v = votes[0];
    const detail = v.details ? ` (${v.details})` : '';
    return `${v.outcome}${detail}, ${defaultActionText}`;
  }

  // Multiple votes
  const list = votes
    .map((v) => {
      const title = v.title ? `[${v.title}] ` : '';
      const detail = v.details ? ` (${v.details})` : '';
      return `${title}${v.outcome}${detail}`;
    })
    .join('; ');

  return `con i seguenti esiti: ${list}, ${defaultActionText}`;
}

// ── Deliberation block builders ───────────────────────────────────────────────
// Each returns the verbale body text for one agenda point, given its point number.

function buildDeliberationAmmissioneSoci(pointNumber: number, input: WorkflowInput, orgSettings: OrgSettings): string {
  const list = toBulletList(input.newMembers!);
  return (
    `${pointNumber}) ${getAgendaTitle('member_admission', input)}\n` +
    `Sul primo punto all'ordine del giorno prende la parola ${input.president}, il quale informa l'assemblea della decisione del consiglio direttivo di ammettere nuovi soci all'interno dell'associazione.\n` +
    `Come previsto dallo statuto ${orgSettings.statuteArticleMembers}, viene attestato che tutte le persone di seguito elencate hanno presentato regolare domanda di ammissione in forma scritta, e hanno preso diversi impegni nei confronti dell'associazione, come regolamentato dallo stesso articolo dello statuto.\n` +
    `Viene discussa l'ammissione di:\n${list}\n` +
    `Al termine della discussione l'assemblea delibera, ${renderVotingResults('member_admission', input, "di approvare l'ammissione dei nuovi soci sopra elencati.")}`
  );
}

function buildDeliberationApprovazioneBilancio(pointNumber: number, input: WorkflowInput, orgSettings: OrgSettings): string {
  const year = input.budgetYear!;
  return (
    `${pointNumber}) ${getAgendaTitle('budget_approval', input)}\n` +
    `Sul primo punto all'ordine del giorno prende la parola il presidente, illustrando le principali attività realizzate dall'associazione nel corso dell'anno ${year}, soffermandosi sull'azione di promozione culturale svolta sul territorio e le collaborazioni intraprese con gli enti terzi, sia pubblici che privati.\n` +
    `Segue dibattito al termine del quale l'assemblea delibera, ${renderVotingResults('budget_approval', input, `di approvare il bilancio consuntivo ${year} così come predisposto dal Consiglio Direttivo.`)} Come regolamentato dallo statuto ${orgSettings.statuteArticleBoardVote}, i membri del Consiglio Direttivo presenti non prendono parte alla votazione.`
  );
}

function buildDeliberationElezioneDirettivo(pointNumber: number, input: WorkflowInput, orgSettings: OrgSettings, mandateExpiry: string): string {
  const list = toBulletList(input.newBoard!);
  return (
    `${pointNumber}) ${getAgendaTitle('board_election', input)}\n` +
    `Sul primo punto all'ordine del giorno prende la parola ${input.president}, il quale illustra le previsioni dello statuto che disciplinano l'elezione del Consiglio Direttivo, in particolare la previsione dello ${orgSettings.statuteArticleBoardElection} che richiede che ogni anno l'assemblea dei soci elegga un Consiglio Direttivo composto da al più 11 consiglieri.\n` +
    `Vengono presentati quindi i candidati al ruolo di consigliere, raccogliendo le candidature spontanee dei presenti. Alla presentazione segue un breve dibattito, durante il quale i candidati illustrano gli obiettivi che perseguirebbero qualora fossero eletti.\n` +
    `Al termine della discussione il presidente dichiara aperta la votazione per l'elezione dei singoli candidati come presentati. La votazione si tiene per alzata di mano tramite collegamento video.\n` +
    `L'assemblea delibera ${renderVotingResults('board_election', input, 'di approvare i candidati presentati.')} Al termine delle votazioni il presidente presenta dunque il nuovo Consiglio Direttivo come risultante dalle elezioni:\n${list}\n` +
    `Il Consiglio Direttivo così eletto sarà in carica fino al ${mandateExpiry} e si impegna a riunirsi in prima seduta entro 30 giorni per eleggere al suo interno il presidente, il vice presidente e il tesoriere, come disciplinato dallo ${orgSettings.statuteArticleBoardElection} dello statuto.`
  );
}

function buildDeliberationEsclusioneSoci(pointNumber: number, input: WorkflowInput, orgSettings: OrgSettings): string {
  const list = toBulletList(input.excludedMembers!);
  return (
    `${pointNumber}) ${getAgendaTitle('member_exclusion', input)}\n` +
    `Sul primo punto all'ordine del giorno prende la parola ${input.president}, il quale informa l'assemblea della proposta del consiglio direttivo di escludere alcuni associati dall'Assemblea dei Soci.\n` +
    `Il presidente illustra come le persone di seguito elencate abbiano attuato comportamenti contrari agli scopi dell'associazione stessa, fornendo diversi esempi. Su queste basi, il presidente invoca lo ${orgSettings.statuteArticleMembers} dello statuto, chiedendo all'assemblea di esprimersi in merito allo scioglimento del rapporto di associazione di:\n${list}\n` +
    `Al termine della discussione l'assemblea delibera, ${renderVotingResults('member_exclusion', input, "di approvare l'esclusione degli associati sopra elencati.")}`
  );
}

// ── Agenda title per workflow type ────────────────────────────────────────────

export function getAgendaTitle(type: WorkflowType, input: WorkflowInput): string {
  switch (type) {
    case 'member_admission':       return "Approvazione dell'ammissione di nuovi associati";
    case 'budget_approval':        return `Approvazione rendiconto gestionale anno ${input.budgetYear}`;
    case 'board_election':         return "Elezione dell'organo sociale: Consiglio Direttivo";
    case 'member_exclusion':       return "Proposta di esclusione associati";
    case 'member_resignation':     return "Presa d'atto delle dimissioni soci";
  }
}

// ── Placeholder builder ───────────────────────────────────────────────────────

export function buildPlaceholders(input: WorkflowInput, orgSettings: OrgSettings): Map<string, string> {
  const firstCall = new Date(input.firstCallStart);
  const secondCall = new Date(input.secondCallStart);
  const inPersonFirst = input.inPersonMembersFirst ?? 2;
  const proxyFirst = input.proxyMembersFirst ?? 0;
  const inPersonSecond = input.inPersonMembersSecond ?? 2;
  const proxySecond = input.proxyMembersSecond ?? 0;
  const onlineMembers = input.onlineMembers ?? input.presentMembers - inPersonSecond;

  const hasResignations = Array.isArray(input.resignations) && input.resignations.length > 0;
  const extraItems: AgendaItemExtra[] = input.extraAgendaItems?.filter((i) => i.title.trim()) ?? [];

  // ── Agenda numbering ──────────────────────────────────────────────────────
  // Points 1..N: one per selected workflow type
  // Then: resignations (if any)
  // Then: extra items
  // Last: Varie ed eventuali

  let nextPoint = (input.workflowTypes?.length ?? 0) + 1;
  let resignationsPoint = 0;
  const extraItemPoints: number[] = [];

  if (hasResignations) {
    resignationsPoint = nextPoint++;
  }
  for (let i = 0; i < extraItems.length; i++) {
    extraItemPoints.push(nextPoint++);
  }
  const totalPoints = nextPoint; // varie ed eventuali number

  // ── ODG lines ─────────────────────────────────────────────────────────────
  const odgLines: string[] = [];
  (input.workflowTypes || []).forEach((type, i) => {
    odgLines.push(`${i + 1}) ${getAgendaTitle(type, input)}`);
  });
  if (hasResignations) {
    odgLines.push(
      `${resignationsPoint}) Presa d'atto delle dimissioni dalla qualità di socio di ${input.resignations!.map((d) => d.name).join(', ')}`
    );
  }
  for (let i = 0; i < extraItems.length; i++) {
    odgLines.push(`${extraItemPoints[i]}) ${extraItems[i].title}`);
  }
  odgLines.push(`${totalPoints}) Varie ed eventuali`);
  const agenda = odgLines.join('\n');

  // ── Resignations section ──────────────────────────────────────────────────
  let resignationsSection = '';
  if (hasResignations) {
    const list = input.resignations!
      .map((d) => `- ${d.name}, con comunicazione scritta in data ${d.date};`)
      .join('\n');
    resignationsSection =
      `${resignationsPoint}) Presa d'atto delle dimissioni dalla qualità di socio\n` +
      `Sul punto all'ordine del giorno prende la parola ${input.president}, il quale informa l'assemblea che, nel periodo intercorso dall'ultima assemblea, i seguenti soci hanno comunicato per iscritto le proprie dimissioni dalla qualità di socio, come previsto dallo ${orgSettings.statuteArticleMembers} comma 5 lettera a) dello Statuto:\n\n` +
      `${list}\n\n` +
      `Il presidente dà atto che le dimissioni hanno efficacia dalla data di ricezione della relativa comunicazione scritta da parte dell'associazione, e che i nominativi sopra indicati sono pertanto da considerarsi non più iscritti al libro dei soci a partire dalle rispettive date. Viene fatto mandato al Consiglio Direttivo di aggiornare il libro dei soci di conseguenza.\n` +
      `L'assemblea prende atto.`;
  }

  // ── Extra sections ────────────────────────────────────────────────────────
  const extraSections = extraItems
    .map((item, i) => {
      const n = extraItemPoints[i];
      const voteKey = item.id || item.title;
      // Default action text for generic items
      const defaultActionText = 'di approvare quanto sopra riportato.';
      const votingText = renderVotingResults(voteKey, input, defaultActionText);
      const body = item.body?.trim() ? `\n${item.body.trim()}` : '';
      return `${n}) ${item.title}${body}\nAl termine della discussione l'assemblea delibera, ${votingText}`;
    })
    .join('\n\n');

  // ── Deliberation sections (one per workflow type) ─────────────────────────
  const mandateExpiry = formatItalianDate(add1Year(firstCall));

  const deliberations = (input.workflowTypes || [])
    .map((type, i) => {
      const n = i + 1;
      switch (type) {
        case 'member_admission':       return buildDeliberationAmmissioneSoci(n, input, orgSettings);
        case 'budget_approval':        return buildDeliberationApprovazioneBilancio(n, input, orgSettings);
        case 'board_election':         return buildDeliberationElezioneDirettivo(n, input, orgSettings, mandateExpiry);
        case 'member_exclusion':       return buildDeliberationEsclusioneSoci(n, input, orgSettings);
        case 'member_resignation':     break;
      }
    })
    .join('\n\n');

  const deliberationsBlock = [
    deliberations,
    resignationsSection,
    extraSections,
  ].filter(Boolean).join('\n\n');

  // ── Verbale 2a boilerplate sections ──────────────────────────────────────────
  const oraFine2a = input.secondCallEnd 
    ? (input.secondCallEnd.includes(':') ? input.secondCallEnd : formatItalianTime(new Date(input.secondCallEnd)))
    : formatItalianTime(add2Hours(secondCall));
  const proxySentence2a = proxySecond > 0
    ? `, di cui ${inPersonSecond - proxySecond} in presenza propria e ${proxySecond} per delega`
    : '';
  const sezioneApertura2a =
    `Per dare conto della presenza degli associati, il presidente invita gli stessi a presentarsi ad uno ad uno, verificandone l'identità tramite collegamento audio e video.\n` +
    `Il presidente rileva che l'assemblea è stata regolarmente convocata e che sono presenti ${input.presentMembers} soci su ${input.totalMembers} aventi diritto di voto, di cui ${inPersonSecond} in presenza fisica${proxySentence2a} e ${onlineMembers} in collegamento da remoto. Il numero delle persone presenti corrisponde a quello richiesto dallo statuto per la validità dell'assemblea di seconda convocazione.\n` +
    `Il presidente constata e fa constatare la validità dell'assemblea per deliberare sull'ordine del giorno.\n` +
    `Il presidente dichiara aperta la seduta e illustra le modalità di svolgimento dell'assemblea così come preventivamente comunicate agli associati al momento della convocazione.`;

  const sezioneChiusura2a =
    `${totalPoints}) Varie ed eventuali\n` +
    `Non vengono individuati ulteriori argomenti su cui sia necessaria discussione.\n` +
    `Esaurito così l'ordine del giorno, null'altro essendoci da deliberare, il presidente dichiara sciolta l'assemblea alle ore ${oraFine2a} dello stesso giorno dopo aver chiesto se vi siano rettifiche o interventi di qualsiasi tipo.\n` +
    `Non intervenendo nessuno, il presidente sottoscrive il presente verbale unitamente al segretario verbalizzante e ne dispone l'inserimento nel Libro dei verbali delle assemblee.`;

  return new Map<string, string>([
    // Org settings
    ['NOME_ASSOCIAZIONE',              orgSettings.organizationName],
    ['CITTA',                          input.city || orgSettings.city],
    ['SEDE_ASSOCIAZIONE',              input.venue || orgSettings.address],
    ['ARTICOLO_CONVOCAZIONE',          orgSettings.statuteArticleConvocation],
    ['ARTICOLO_DELEGHE',               orgSettings.statuteArticleProxies],
    ['ARTICOLO_SOCI',                  orgSettings.statuteArticleMembers],
    ['ARTICOLO_VOTO_CD',               orgSettings.statuteArticleBoardVote],
    ['ARTICOLO_ELEZIONE_CD',           orgSettings.statuteArticleBoardElection],
    ['MAX_DELEGHE',                    String(orgSettings.maxProxies)],
    // Per-assembly
    ['NUMERO_ASSEMBLEA',               String(input.assemblyNumber)],
    ['ORDINE_DEL_GIORNO',              agenda],
    ['NUMERO_VARIE',                   String(totalPoints)],
    ['DESCRIZIONE_VARIE_ED_EVENTUALI', input.varieOverrideText || orgSettings.miscellaneousDefaultText || orgSettings.varieDefaultText || 'Non vengono individuati ulteriori argomenti su cui sia necessaria discussione.'],
    ['DATA_PRIMA_ASSEMBLEA',           formatItalianDate(firstCall)],
    ['ORA_INIZIO_PRIMA_ASSEMBLEA',     formatItalianTime(firstCall)],
    ['ORA_FINE_PRIMA_ASSEMBLEA',       formatItalianTime(add35Minutes(firstCall))],
    ['DATA_SECONDA_ASSEMBLEA',         formatItalianDate(secondCall)],
    ['ORA_INIZIO_SECONDA_ASSEMBLEA',   formatItalianTime(secondCall)],
    ['ORA_FINE_SECONDA_ASSEMBLEA',     formatItalianTime(add2Hours(secondCall))],
    ['DATA_CONVOCAZIONE',              formatItalianDate(subtract14Days(firstCall))],
    ['MODALITA_PRIMA_CONVOCAZIONE',    input.firstCallModality],
    ['MODALITA_SECONDA_CONVOCAZIONE',  input.secondCallModality],
    ['MODALITA_VERBALE_APERTURA',      input.minutesOpeningModality],
    ['RUOLO_FIRMATARIO',               input.signatoryRole],
    ['SOCI_TOTALI',                    String(input.totalMembers)],
    ['SOCI_PRESENTI',                  String(input.presentMembers)],
    ['SOCI_IN_PRESENZA',               String(inPersonSecond + proxySecond)],
    ['SOCI_IN_PRESENZA_PROPRIO',       String(inPersonSecond)],
    ['SOCI_IN_PRESENZA_DELEGA',        String(proxySecond)],
    ['SOCI_ONLINE',                    String(onlineMembers)],
    ['SOCI_PRESENTI_PRIMA',            String(inPersonFirst + proxyFirst)],
    ['SOCI_PRESENTI_PROPRIO',          String(inPersonFirst)],
    ['SOCI_PRESENTI_DELEGA',           String(proxyFirst)],
    ['PRESIDENTE',                     input.president],
    ['FIRMATARIO',                     input.president],  // alias for use in convocation signature block
    ['SEGRETARIO',                     input.secretary],
    ['SEZIONE_DELIBERAZIONI',          deliberationsBlock],
    ['SEZIONE_APERTURA_2A',            sezioneApertura2a],
    ['SEZIONE_CHIUSURA_2A',            sezioneChiusura2a],
  ]);
}

// ── Generation runner ─────────────────────────────────────────────────────────

export async function runGeneration(
  input: WorkflowInput,
  orgSettings: OrgSettings,
  env: DAMEnv,
  preResolvedToken?: string,
): Promise<GenerationResult> {
  const token = preResolvedToken ?? await getAccessToken(env);

  const shouldDoc = input.generateGoogleDoc !== false;
  const shouldPdf = input.generatePdf !== false;
  const doConvocation = input.generateConvocation !== false;
  const doMinutes1a = input.generateMinutes1a !== false;
  const doMinutes2a = input.generateMinutes2a !== false;

  const outputFolderId = input.outputFolderIdOverride ?? orgSettings.outputFolderId;
  const placeholders = buildPlaceholders(input, orgSettings);
  const firstCall = new Date(input.firstCallStart);
  const meetingCode = buildMeetingCode(firstCall.getFullYear(), input.assemblyNumber);
  const workflowLabel = input.workflowTypes.join(' + ');

  const result: GenerationResult = {};

  async function processDocument(
    templateId: string,
    fileName: string,
    key: keyof GenerationResult,
  ) {
    if (!shouldDoc && !shouldPdf) return;

    let driveUrl = '';
    let pdfUrl = '';

    if (shouldDoc) {
      const copied = await copyFile(templateId, outputFolderId, fileName, token);
      await fillPlaceholders(copied.id, placeholders, token);
      driveUrl = copied.webViewLink;

      if (shouldPdf) {
        const pdfBytes = await exportAsPdf(copied.id, token);
        const pdfFile = await savePdf(pdfBytes, `${fileName}.pdf`, outputFolderId, token);
        pdfUrl = pdfFile.webViewLink;
      }
    } else if (shouldPdf) {
      // PDF only: copy, fill, export, delete the intermediate doc
      const copied = await copyFile(templateId, outputFolderId, `${fileName} (tmp)`, token);
      await fillPlaceholders(copied.id, placeholders, token);
      const pdfBytes = await exportAsPdf(copied.id, token);
      const pdfFile = await savePdf(pdfBytes, `${fileName}.pdf`, outputFolderId, token);
      pdfUrl = pdfFile.webViewLink;
    }

    result[key] = { driveUrl, pdfUrl };
  }

  await Promise.all([
    doConvocation
      ? processDocument(orgSettings.templateConvocationId, `${meetingCode} - Convocazione ${workflowLabel}`, 'convocation')
      : Promise.resolve(),
    doMinutes1a && orgSettings.templateMinutes1aId
      ? processDocument(orgSettings.templateMinutes1aId, `${meetingCode} - Verbale 1a convocazione ${workflowLabel}`, 'minutes1a')
      : Promise.resolve(),
    doMinutes2a && orgSettings.templateMinutes2aId
      ? processDocument(orgSettings.templateMinutes2aId, `${meetingCode} - Verbale 2a convocazione ${workflowLabel}`, 'minutes2a')
      : Promise.resolve(),
  ]);

  return result;
}
