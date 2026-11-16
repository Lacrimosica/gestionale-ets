/**
 * Fields a client must never set through a generic update body: identity and
 * tenancy are owned by the server. Spreading an unfiltered body into `.set()`
 * would let a caller move a record into another org or rewrite its id.
 */
const SERVER_OWNED_FIELDS = ['id', 'orgId', 'createdAt'] as const;

/**
 * Return a copy of `body` without server-owned fields (plus any `extra` keys).
 * Use before spreading a request body into a Drizzle `.set()` or `.values()`.
 */
export function withoutServerOwnedFields<T extends Record<string, unknown>>(
  body: T,
  extra: readonly string[] = [],
): Partial<T> {
  const blocked = new Set<string>([...SERVER_OWNED_FIELDS, ...extra]);
  return Object.fromEntries(Object.entries(body).filter(([key]) => !blocked.has(key))) as Partial<T>;
}
