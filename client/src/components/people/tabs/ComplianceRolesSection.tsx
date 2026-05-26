import { useTranslation } from 'react-i18next';
import { formatDate } from '../../../lib/date-utils';

interface ComplianceRolesSectionProps {
  roles?: any[];
  canEdit: boolean;
  onAddRole: () => void;
  onEditRole: (role: any) => void;
  onDeleteRole: (roleId: string, label: string) => void;
}

const ComplianceRolesSection = ({ roles, canEdit, onAddRole, onEditRole, onDeleteRole }: ComplianceRolesSectionProps) => {
  const { t } = useTranslation();

  return (
    <div className="border border-slate-800 rounded-xl p-5 bg-slate-950/40 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white">{t('people.complianceRoles', { defaultValue: 'Compliance Roles' })}</h3>
          <p className="text-sm text-slate-400 mt-1">{t('people.complianceRolesSubtitle', { defaultValue: 'Roles that determine NDA and document checks.' })}</p>
        </div>
        {canEdit && (
          <button onClick={onAddRole} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-semibold">
            {t('people.addRole', { defaultValue: 'Add Role' })}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {roles?.length ? roles.map((role) => (
          <div key={role.id} className="border border-slate-800 rounded-lg p-4 flex items-start justify-between gap-4">
            <div>
              <div className="font-semibold text-white">{t(role.label)}</div>
              <div className="text-sm text-slate-400">
                {role.startDate ? formatDate(role.startDate) : 'N/D'}
                {(role.endDate || role.active) && (
                  <>
                    <span className="mx-1">→</span>
                    {role.endDate ? formatDate(role.endDate) : t('common.status.ongoing')}
                  </>
                )}
              </div>
              {role.notes && <div className="text-xs text-slate-500 mt-1">{role.notes}</div>}
            </div>
            {canEdit && (
              <div className="flex items-center gap-3">
                <button onClick={() => onEditRole(role)} className="text-blue-300 hover:text-blue-200 text-sm">
                  {t('common.actions.edit')}
                </button>
                <button onClick={() => onDeleteRole(role.id, t(role.label))} className="text-red-400 hover:text-red-300 text-sm">
                  {t('common.actions.delete')}
                </button>
              </div>
            )}
          </div>
        )) : (
          <div className="text-sm text-slate-500 italic">{t('people.noComplianceRoles', { defaultValue: 'No compliance roles registered.' })}</div>
        )}
      </div>
    </div>
  );
};

export default ComplianceRolesSection;
