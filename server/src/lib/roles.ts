/**
 * Org roles ordered by authority. Used to stop users from granting, or acting on
 * accounts with, more authority than they hold themselves.
 */
const ROLE_RANK = {
  viewer: 0,
  manager: 1,
  admin: 2,
  core_admin: 3,
} as const;

export type OrgRole = keyof typeof ROLE_RANK;

export function isOrgRole(value: unknown): value is OrgRole {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(ROLE_RANK, value);
}

function rankOf(role: string): number {
  return isOrgRole(role) ? ROLE_RANK[role] : -1;
}

type Caller = { role: string; permissions?: string[] };

/**
 * Check that `caller` may grant `role` and an optional explicit permission list.
 * A caller can never hand out a role ranked above their own, nor any permission
 * they do not hold — otherwise any user manager could mint a core_admin.
 *
 * @returns an error message, or null when the grant is allowed.
 */
export function rejectGrant(caller: Caller, role: unknown, permissions?: unknown): string | null {
  if (!isOrgRole(role)) {
    return 'Invalid role';
  }
  if (ROLE_RANK[role] > rankOf(caller.role)) {
    return 'You cannot assign a role above your own';
  }
  if (permissions !== undefined && permissions !== null) {
    if (!Array.isArray(permissions) || !permissions.every((p) => typeof p === 'string')) {
      return 'Invalid permissions';
    }
    const held = new Set(caller.permissions ?? []);
    if (permissions.some((p) => !held.has(p))) {
      return 'You cannot grant permissions you do not have';
    }
  }
  return null;
}

/** True when `caller` may modify an account holding `targetRole` (same rank or below). */
export function canActOn(caller: Caller, targetRole: string): boolean {
  return rankOf(targetRole) <= rankOf(caller.role);
}
