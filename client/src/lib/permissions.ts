export const PERMISSIONS = {
  dashboardView: 'dashboard.view',
  peopleView: 'people.view',
  peopleEdit: 'people.edit',
  volunteersView: 'volunteers.view',
  membersView: 'members.view',
  boardView: 'board.view',
  assembliesView: 'assemblies.view',
  assembliesEdit: 'assemblies.edit',
  convocationsView: 'convocations.view',
  convocationsEdit: 'convocations.edit',
  timelineView: 'timeline.view',
  resignationsView: 'resignations.view',
  settingsView: 'settings.view',
  settingsUsersView: 'settings.users.view',
  settingsUsersManage: 'settings.users.manage',
  settingsPasswordManage: 'settings.password.manage',
  settingsUsersResetPassword: 'settings.users.reset_password',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

const rolePermissions: Record<string, Permission[]> = {
  admin: ALL_PERMISSIONS,
  core_admin: ALL_PERMISSIONS,
  manager: [
    PERMISSIONS.dashboardView,
    PERMISSIONS.peopleView,
    PERMISSIONS.peopleEdit,
    PERMISSIONS.volunteersView,
    PERMISSIONS.membersView,
    PERMISSIONS.boardView,
    PERMISSIONS.assembliesView,
    PERMISSIONS.assembliesEdit,
    PERMISSIONS.convocationsView,
    PERMISSIONS.convocationsEdit,
    PERMISSIONS.timelineView,
    PERMISSIONS.resignationsView,
    PERMISSIONS.settingsView,
    PERMISSIONS.settingsPasswordManage,
  ],
  viewer: [
    PERMISSIONS.dashboardView,
    PERMISSIONS.peopleView,
    PERMISSIONS.volunteersView,
    PERMISSIONS.membersView,
    PERMISSIONS.boardView,
    PERMISSIONS.assembliesView,
    PERMISSIONS.convocationsView,
    PERMISSIONS.timelineView,
    PERMISSIONS.resignationsView,
    PERMISSIONS.settingsView,
    PERMISSIONS.settingsPasswordManage,
  ],
};

export const getPermissionsForRole = (role?: string): Permission[] => {
  if (!role) return [];
  return rolePermissions[role] ?? rolePermissions.viewer;
};
