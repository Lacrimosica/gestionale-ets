export const PERMISSIONS = {
  dashboardView: 'dashboard.view',
  peopleView: 'people.view',
  peopleEdit: 'people.edit',
  boardView: 'board.view',
  assembliesView: 'assemblies.view',
  assembliesEdit: 'assemblies.edit',
  convocationsView: 'convocations.view',
  convocationsEdit: 'convocations.edit',
  timelineView: 'timeline.view',
  resignationsView: 'resignations.view',
  settingsView: 'settings.view',
  settingsManage: 'settings.manage',
  settingsUsersView: 'settings.users.view',
  settingsUsersManage: 'settings.users.manage',
  settingsUsersResetPassword: 'settings.users.reset_password',
  settingsPasswordManage: 'settings.password.manage',
  documentsView: 'documents.view',
  documentsGenerate: 'documents.generate',
  documentsManage: 'documents.manage',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

const rolePermissions: Record<string, Permission[]> = {
  core_admin: ALL_PERMISSIONS,
  admin: ALL_PERMISSIONS,
  manager: [
    PERMISSIONS.dashboardView,
    PERMISSIONS.peopleView,
    PERMISSIONS.peopleEdit,
    PERMISSIONS.boardView,
    PERMISSIONS.assembliesView,
    PERMISSIONS.assembliesEdit,
    PERMISSIONS.convocationsView,
    PERMISSIONS.convocationsEdit,
    PERMISSIONS.timelineView,
    PERMISSIONS.resignationsView,
    PERMISSIONS.settingsView,
    PERMISSIONS.settingsManage,
    PERMISSIONS.settingsPasswordManage,
    PERMISSIONS.documentsView,
    PERMISSIONS.documentsGenerate,
  ],
  viewer: [
    PERMISSIONS.dashboardView,
    PERMISSIONS.peopleView,
    PERMISSIONS.boardView,
    PERMISSIONS.assembliesView,
    PERMISSIONS.convocationsView,
    PERMISSIONS.timelineView,
    PERMISSIONS.resignationsView,
    PERMISSIONS.settingsView,
    PERMISSIONS.settingsPasswordManage,
    PERMISSIONS.documentsView,
  ],
};

export const getPermissionsForRole = (role?: string): Permission[] => {
  if (!role) return [];
  return rolePermissions[role] ?? rolePermissions.viewer;
};
