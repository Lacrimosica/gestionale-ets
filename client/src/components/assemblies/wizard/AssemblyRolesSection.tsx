import { useTranslation } from 'react-i18next';
import { Users as UsersIcon } from 'lucide-react';
import type { MemberCandidate } from '../../SingleMemberPicker';
import { SingleMemberPicker } from '../../SingleMemberPicker';

interface AssemblyForm {
  presidentId: string;
  secretaryId: string;
}

interface AssemblyRolesSectionProps {
  form: AssemblyForm;
  setForm: (f: any) => void;
  memberCandidates: MemberCandidate[];
  membersLoading: boolean;
}

export const AssemblyRolesSection = ({
  form,
  setForm,
  memberCandidates,
  membersLoading,
}: AssemblyRolesSectionProps) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-special-400">
        <UsersIcon size={16} />
        <h3 className="text-xs font-black uppercase tracking-widest">{t('assemblies.creation.institutionalRoles')}</h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">{t('common.fields.president')}</label>
          <SingleMemberPicker
            candidates={memberCandidates}
            value={form.presidentId}
            onChange={(v: string) => setForm({ ...form, presidentId: v })}
            loading={membersLoading}
            placeholder={t('assemblies.creation.findPresident')}
            openUpward
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">{t('common.fields.secretary')}</label>
          <SingleMemberPicker
            candidates={memberCandidates}
            value={form.secretaryId}
            onChange={(v: string) => setForm({ ...form, secretaryId: v })}
            loading={membersLoading}
            placeholder={t('assemblies.creation.findSecretary')}
            openUpward
          />
        </div>
      </div>
    </div>
  );
};
