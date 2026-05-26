import type { WorkflowItemType, WorkflowItemData } from '../../types/assembly';
import { MemberPickerField } from '../MemberPickerField';

interface WorkflowItemConfiguratorProps {
  workflowType: WorkflowItemType;
  workflowData: WorkflowItemData | undefined;
  candidates: any[];
  candidatesLoading: boolean;
  onWorkflowDataChange: (workflowData: WorkflowItemData) => void;
}

export const WorkflowItemConfigurator = ({
  workflowType,
  workflowData,
  candidates,
  candidatesLoading,
  onWorkflowDataChange,
}: WorkflowItemConfiguratorProps) => {
  const currentData = workflowData ?? {};

  if (workflowType === 'member_admission') {
    return (
      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-2">Nuovi soci</label>
        <MemberPickerField
          candidates={candidates}
          loading={candidatesLoading}
          selected={currentData.members ?? []}
          onChange={(members) => onWorkflowDataChange({ ...currentData, members })}
        />
      </div>
    );
  }

  if (workflowType === 'member_resignation') {
    return (
      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-2">Soci dimissionari</label>
        <MemberPickerField
          candidates={candidates}
          loading={candidatesLoading}
          selected={currentData.members ?? []}
          onChange={(members) => onWorkflowDataChange({ ...currentData, members })}
        />
      </div>
    );
  }

  if (workflowType === 'member_exclusion') {
    return (
      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-2">Soci esclusi</label>
        <MemberPickerField
          candidates={candidates}
          loading={candidatesLoading}
          selected={currentData.members ?? []}
          onChange={(members) => onWorkflowDataChange({ ...currentData, members })}
        />
      </div>
    );
  }

  if (workflowType === 'budget_approval') {
    return (
      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-2">Anno di riferimento</label>
        <input
          type="number"
          min={2000}
          max={2100}
          value={currentData.budgetYear ?? new Date().getFullYear() - 1}
          onChange={(e) => onWorkflowDataChange({ ...currentData, budgetYear: Number(e.target.value) })}
          className="w-32 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm"
        />
      </div>
    );
  }

  if (workflowType === 'board_election') {
    return (
      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-2">Nuovo direttivo</label>
        <MemberPickerField
          candidates={candidates}
          loading={candidatesLoading}
          selected={currentData.members ?? []}
          onChange={(members) => onWorkflowDataChange({ ...currentData, members })}
        />
      </div>
    );
  }

  return null;
};
