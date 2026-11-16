import type { Context } from 'hono';
import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1';
import { and, eq, inArray, type SQL } from 'drizzle-orm';
import type { AnySQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';

/**
 * Shape of the JWT payload issued by the auth route and validated by the
 * protected-routes middleware. Kept here so every handler shares one definition
 * instead of re-declaring it inline.
 */
export type JwtPayload = {
  sub: string;
  email: string;
  orgId: string;
  role: string;
  permissions?: string[];
  exp: number;
};

/**
 * The org-scoped request context handed to a route handler by {@link orgContext}.
 */
export type OrgContext = {
  /** Drizzle client bound to the request's D1 database. */
  db: DrizzleD1Database;
  /** The caller's organization id, taken from the verified JWT. */
  orgId: string;
  /** The full verified JWT payload. */
  payload: JwtPayload;
  /**
   * Build a WHERE clause that is always constrained to the caller's organization.
   * Pass the table's org-id column plus any additional conditions; the org filter
   * is prepended so a handler cannot accidentally read or write across tenants.
   */
  scoped: (orgColumn: AnySQLiteColumn, ...conditions: Array<SQL | undefined>) => SQL;
};

type OrgScopedTable = SQLiteTable & { id: AnySQLiteColumn; orgId: AnySQLiteColumn };

/**
 * Check that every referenced id exists in `table` under `orgId`.
 *
 * Use on ids taken from a request body before inserting or linking them: an id
 * that belongs to another org would otherwise plant a cross-tenant reference that
 * later surfaces the other org's data through joins. Null/undefined/empty ids are
 * ignored, so optional references can be passed straight through.
 */
export async function ownedByOrg(
  db: DrizzleD1Database,
  orgId: string,
  table: OrgScopedTable,
  ids: ReadonlyArray<string | null | undefined> | string | null | undefined,
): Promise<boolean> {
  const list = (Array.isArray(ids) ? ids : [ids]).filter((id): id is string => typeof id === 'string' && id !== '');
  const unique = [...new Set(list)];
  if (unique.length === 0) return true;

  const rows = await db
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.orgId, orgId), inArray(table.id, unique)))
    .all();
  return rows.length === unique.length;
}

/**
 * Resolve the org-scoped context for a protected route handler.
 *
 * Centralises the four things every handler previously did by hand — reading the
 * JWT payload, instantiating Drizzle, checking a permission, and scoping queries
 * to the organization — so the "forgot the org filter" cross-tenant leak becomes
 * hard to write.
 *
 * @returns the {@link OrgContext} on success, or a 401/403 `Response` the handler
 *          should return directly (`if (ctx instanceof Response) return ctx;`).
 */
export function orgContext(c: Context, permission: string): OrgContext | Response {
  const payload = c.get('jwtPayload') as JwtPayload | undefined;

  if (!payload?.sub || !payload?.orgId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const permissions = payload.permissions ?? [];
  if (!permissions.includes(permission)) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const orgId = payload.orgId;
  const db = drizzle((c.env as { DB: D1Database }).DB);

  const scoped: OrgContext['scoped'] = (orgColumn, ...conditions) =>
    and(eq(orgColumn, orgId), ...conditions) as SQL;

  return { db, orgId, payload, scoped };
}
