/**
 * Default permissions per org role, used when an organization_user row has no
 * explicit permission list. This is the single source for what a session token
 * carries, shared by token issuance and the per-request session refresh.
 */
const defaultPermissionsByRole: Record<string, string[]> = {
  core_admin: [
    'dashboard.view',
    'people.view',
    'people.edit',
    'board.view',
    'assemblies.view',
    'assemblies.edit',
    'convocations.view',
    'convocations.edit',
    'timeline.view',
    'resignations.view',
    'settings.view',
    'settings.users.view',
    'settings.users.manage',
    'settings.password.manage',
    'settings.users.reset_password',
  ],
  admin: [
    'dashboard.view',
    'people.view',
    'people.edit',
    'board.view',
    'assemblies.view',
    'assemblies.edit',
    'convocations.view',
    'convocations.edit',
    'timeline.view',
    'resignations.view',
    'settings.view',
    'settings.users.view',
    'settings.users.manage',
    'settings.password.manage',
    'settings.users.reset_password',
  ],
  manager: [
    'dashboard.view',
    'people.view',
    'people.edit',
    'board.view',
    'assemblies.view',
    'assemblies.edit',
    'convocations.view',
    'convocations.edit',
    'timeline.view',
    'resignations.view',
    'settings.view',
    'settings.password.manage',
  ],
  viewer: [
    'dashboard.view',
    'people.view',
    'board.view',
    'assemblies.view',
    'convocations.view',
    'timeline.view',
    'resignations.view',
    'settings.view',
    'settings.password.manage',
  ],
};

export const getPermissionsForRole = (role: string): string[] => defaultPermissionsByRole[role] ?? defaultPermissionsByRole.viewer;

/**
 * Permissions for a membership row: the stored list if present, otherwise the
 * role defaults. Mirrors what login has always put into the session token.
 */
export function sessionPermissions(orgUser: { role: string; permissions: string | null }): string[] {
  if (!orgUser.permissions) return getPermissionsForRole(orgUser.role);
  try {
    const parsed: unknown = JSON.parse(orgUser.permissions);
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === 'string') : [];
  } catch {
    return [];
  }
}
