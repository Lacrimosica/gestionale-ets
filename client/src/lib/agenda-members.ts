import type { AgendaItem, AgendaMember, Candidate, WorkflowItemData } from '../types/assembly';

/** "A", "A e B", "A, B e C" — used in auto-generated agenda titles. */
export const formatItalianList = (items: string[]): string => {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
};

/**
 * Display names for selected person ids. Server-provided members win over the
 * candidate list because a linked person may no longer be a candidate (e.g. an
 * ex-volunteer); unknown ids are skipped rather than shown as raw uuids.
 */
export const resolveMemberNames = (
  ids: string[],
  known: AgendaMember[] = [],
  candidates: Candidate[] = [],
): AgendaMember[] => {
  const names = new Map<string, string>();
  candidates.forEach((c) => names.set(c.id, c.nome));
  known.forEach((m) => names.set(m.id, m.name));
  return ids.flatMap((id) => {
    const name = names.get(id);
    return name ? [{ id, name }] : [];
  });
};

/**
 * Names stored as plain text in workflow_data.members by older versions, before
 * agenda members were linked to people. Read-only: they can't be mapped to ids.
 */
export const legacyMemberNames = (workflowData?: WorkflowItemData | null): string[] =>
  Array.isArray(workflowData?.members) ? workflowData.members.filter((m) => typeof m === 'string' && m.trim() !== '') : [];

/** Names to show/print for an agenda item: linked people first, legacy text as fallback (same rule as the server's document generation). */
export const agendaMemberNames = (item: AgendaItem): string[] => {
  const linked = (item.members ?? []).map((m) => m.name);
  return linked.length > 0 ? linked : legacyMemberNames(item.workflowData);
};

/** The API returns workflowData as a JSON string and may omit member fields; give the UI one shape. */
export const normalizeAgendaItem = (raw: AgendaItem & { workflowData?: unknown }): AgendaItem => {
  let workflowData: WorkflowItemData | null = null;
  if (typeof raw.workflowData === 'string') {
    try {
      workflowData = JSON.parse(raw.workflowData) as WorkflowItemData;
    } catch {
      workflowData = null;
    }
  } else if (raw.workflowData && typeof raw.workflowData === 'object') {
    workflowData = raw.workflowData as WorkflowItemData;
  }
  const members = Array.isArray(raw.members) ? raw.members : [];
  const memberIds = Array.isArray(raw.memberIds) ? raw.memberIds : members.map((m) => m.id);
  return { ...raw, workflowData, members, memberIds };
};
