import { useTranslation } from 'react-i18next';
import { formatDate } from '../../../lib/date-utils';
import type { ComplianceRole } from '../../../hooks/useCompliance';

interface ComplianceRolesSectionProps {
  roles?: ComplianceRole[];
  canEdit: boolean;
  onAddRole: () => void;
  onEditRole: (role: ComplianceRole) => void;
  onDeleteRole: (roleId: string, label: string) => void;
}

const ComplianceRolesSection = ({ roles, canEdit, onAddRole, onEditRole, onDeleteRole }: ComplianceRolesSectionProps) => {
  const { t } = useTranslation();

  return (
    <div className="border border-neutral-800 rounded-xl p-5 bg-neutral-950/40 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-fg">{t('people.complianceRoles', { defaultValue: 'Compliance Roles' })}</h3>
          <p className="text-sm text-neutral-400 mt-1">{t('people.complianceRolesSubtitle', { defaultValue: 'Roles that determine NDA and document checks.' })}</p>
        </div>
        {canEdit && (
          <button onClick={onAddRole} className="bg-accent-600 hover:bg-accent-500 text-white px-3 py-2 rounded-lg text-sm font-semibold">
            {t('people.addRole', { defaultValue: 'Add Role' })}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {roles?.length ? roles.map((role) => (
          <div key={role.id} className="border border-neutral-800 rounded-lg p-4 flex items-start justify-between gap-4">
            <div>
              <div className="font-semibold text-fg">{t(role.label)}</div>
              <div className="text-sm text-neutral-400">
                {role.startDate ? formatDate(role.startDate) : 'N/D'}
                {(role.endDate || role.active) && (
                  <>
                    <span className="mx-1">→</span>
                    {role.endDate ? formatDate(role.endDate) : t('common.status.ongoing')}
                  </>
                )}
              </div>
              {role.notes && <div className="text-xs text-neutral-500 mt-1">{role.notes}</div>}
            </div>
            {canEdit && (
              <div className="flex items-center gap-3">
                <button onClick={() => onEditRole(role)} className="text-accent-300 hover:text-accent-200 text-sm">
                  {t('common.actions.edit')}
                </button>
                <button onClick={() => onDeleteRole(role.id, t(role.label))} className="text-danger-400 hover:text-danger-300 text-sm">
                  {t('common.actions.delete')}
                </button>
              </div>
            )}
          </div>
        )) : (
          <div className="text-sm text-neutral-500 italic">{t('people.noComplianceRoles', { defaultValue: 'No compliance roles registered.' })}</div>
        )}
      </div>
    </div>
  );
};

export default ComplianceRolesSection;
