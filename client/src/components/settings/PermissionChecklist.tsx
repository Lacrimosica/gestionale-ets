import { useTranslation } from 'react-i18next';
import { PERMISSIONS, type Permission } from '../../lib/permissions';

const groupedPermissions = [
  {
    titleKey: 'modules',
    items: [
      PERMISSIONS.dashboardView,
      PERMISSIONS.peopleView,
      PERMISSIONS.boardView,
      PERMISSIONS.assembliesView,
      PERMISSIONS.convocationsView,
      PERMISSIONS.timelineView,
      PERMISSIONS.resignationsView,
      PERMISSIONS.settingsView,
      PERMISSIONS.settingsUsersView,
    ],
  },
  {
    titleKey: 'actions',
    items: [
      PERMISSIONS.peopleEdit,
      PERMISSIONS.assembliesEdit,
      PERMISSIONS.convocationsEdit,
      PERMISSIONS.settingsManage,
      PERMISSIONS.settingsUsersManage,
      PERMISSIONS.settingsPasswordManage,
    ],
  },
  {
    titleKey: 'documents',
    items: [
      PERMISSIONS.documentsView,
      PERMISSIONS.documentsGenerate,
      PERMISSIONS.documentsManage,
    ],
  },
];

const PermissionChecklist = ({
  permissions,
  onToggle,
}: {
  permissions: Permission[];
  onToggle: (permission: Permission) => void;
}) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 gap-4">
      {groupedPermissions.map((group) => (
        <div key={group.titleKey} className="bg-slate-950/40 border border-slate-800 rounded-lg p-4">
          <p className="text-sm font-semibold text-slate-300 mb-3">{t(`settings.permissions.groups.${group.titleKey}`)}</p>
          <div className="grid grid-cols-2 gap-2">
            {group.items.map((permission) => (
              <label key={permission} className="flex items-center gap-2 text-sm text-slate-400">
                <input
                  type="checkbox"
                  checked={permissions.includes(permission)}
                  onChange={() => onToggle(permission)}
                />
                {permission}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PermissionChecklist;
