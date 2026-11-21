import { sign } from 'hono/jwt';
import { sessionPermissions } from './session-permissions';

const SESSION_TTL_S = 60 * 60 * 24;

export type SessionUser = { id: string; email: string; orgId: string; role: string; permissions: string[] };

/**
 * Issue the session JWT for a membership. The single place that builds session
 * claims, so every sign-in path (password, two-step, Google, set-password) agrees.
 */
export async function issueSession(
  jwtSecret: string,
  user: { id: string; email: string },
  orgUser: { orgId: string; role: string; permissions: string | null },
): Promise<{ token: string; user: SessionUser }> {
  const permissions = sessionPermissions(orgUser);
  const token = await sign(
    {
      sub: user.id,
      email: user.email,
      orgId: orgUser.orgId,
      role: orgUser.role,
      permissions,
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_S,
    },
    jwtSecret,
  );
  return { token, user: { id: user.id, email: user.email, orgId: orgUser.orgId, role: orgUser.role, permissions } };
}
