import type { WorkflowItemType, WorkflowItemData, AgendaMember, Candidate } from '../../types/assembly';
import { MemberPickerField } from '../MemberPickerField';
import { legacyMemberNames } from '../../lib/agenda-members';

interface WorkflowItemConfiguratorProps {
  workflowType: WorkflowItemType;
  workflowData: WorkflowItemData | undefined;
  /** Person ids currently linked to the item. */
  memberIds: string[];
  /** Linked people with names from the API, for those missing from `candidates`. */
  members: AgendaMember[];
  candidates: Candidate[];
  candidatesLoading: boolean;
  onWorkflowDataChange: (workflowData: WorkflowItemData) => void;
  onMembersChange: (memberIds: string[]) => void;
}

const MEMBER_FIELD_LABELS: Partial<Record<WorkflowItemType, string>> = {
  member_admission: 'Nuovi soci',
  member_resignation: 'Soci dimissionari',
  member_exclusion: 'Soci esclusi',
  board_election: 'Nuovo direttivo',
};

export const WorkflowItemConfigurator = ({
  workflowType,
  workflowData,
  memberIds,
  members,
  candidates,
  candidatesLoading,
  onWorkflowDataChange,
  onMembersChange,
}: WorkflowItemConfiguratorProps) => {
  const currentData = workflowData ?? {};
  const memberLabel = MEMBER_FIELD_LABELS[workflowType];

  if (memberLabel) {
    const legacyNames = legacyMemberNames(currentData);
    return (
      <div>
        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wide block mb-2">{memberLabel}</label>
        {legacyNames.length > 0 && (
          // Saved as plain text by an older version: shown read-only because the
          // names can't be mapped to people reliably. Still used for documents
          // until people are selected below.
          <div className="mb-2 rounded-lg border border-amber-800/50 bg-amber-950/20 px-3 py-2 text-xs text-amber-200">
            <p className="font-semibold">Nomi salvati in precedenza (non collegati all'anagrafica):</p>
            <p className="mt-0.5 text-amber-100">{legacyNames.join(', ')}</p>
            <p className="mt-1 text-amber-300/80">
              Seleziona le persone corrispondenti dall'elenco: al salvataggio sostituiranno questi nomi.
            </p>
          </div>
        )}
        <MemberPickerField
          candidates={candidates}
          extraCandidates={members.map((m) => ({ id: m.id, nome: m.name }))}
          loading={candidatesLoading}
          selected={memberIds}
          onChange={onMembersChange}
        />
      </div>
    );
  }

  if (workflowType === 'budget_approval') {
    return (
      <div>
        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wide block mb-2">Anno di riferimento</label>
        <input
          type="number"
          min={2000}
          max={2100}
          value={currentData.budgetYear ?? new Date().getFullYear() - 1}
          onChange={(e) => onWorkflowDataChange({ ...currentData, budgetYear: Number(e.target.value) })}
          className="w-32 bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-1.5 text-fg text-sm"
        />
      </div>
    );
  }

  return null;
};
