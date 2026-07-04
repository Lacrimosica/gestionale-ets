import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { initializeMiniflare, cleanupMiniflare, getMiniflareDB } from '../setup/miniflare-context';
import { resetTestDatabase } from '../setup/db-reset';
import {
  createTestOrganization,
  createTestUser,
  createTestOrganizationUser,
} from '../setup/fixtures';
import * as schema from '../../src/db/schema';

/**
 * Regression test for issue #2:
 * The Google login flow combined its membership-lookup conditions with JS `&&`
 * (`eq(userId) && eq(orgId)`). Because `eq()` returns a truthy query object,
 * `&&` collapses to the second operand, silently dropping the userId filter — so
 * the query matched the org's first membership row regardless of who was logging
 * in. The fix combines the conditions with Drizzle's `and()`.
 */
describe('Auth — membership lookup filters by user AND org (issue #2)', () => {
  beforeEach(async () => {
    await initializeMiniflare('open');
    await resetTestDatabase();
  });

  afterEach(async () => {
    await cleanupMiniflare();
  });

  it('two users in the same org each receive their own membership', async () => {
    const db = getMiniflareDB();

    const org = await createTestOrganization({ slug: 'shared-org', name: 'Shared Org' });

    // Alice is inserted first, so a dropped userId filter would return her row.
    const alice = await createTestUser({ email: 'alice@shared.local' });
    const bob = await createTestUser({ email: 'bob@shared.local' });

    await createTestOrganizationUser(alice.id, org.id, { role: 'core_admin' });
    await createTestOrganizationUser(bob.id, org.id, { role: 'viewer' });

    // This mirrors the fixed lookup in routes/auth.ts (slug branch).
    const aliceMembership = await db
      .select()
      .from(schema.organizationUser)
      .where(and(eq(schema.organizationUser.userId, alice.id), eq(schema.organizationUser.orgId, org.id)))
      .get();

    const bobMembership = await db
      .select()
      .from(schema.organizationUser)
      .where(and(eq(schema.organizationUser.userId, bob.id), eq(schema.organizationUser.orgId, org.id)))
      .get();

    expect(aliceMembership?.userId).toBe(alice.id);
    expect(aliceMembership?.role).toBe('core_admin');

    expect(bobMembership?.userId).toBe(bob.id);
    expect(bobMembership?.role).toBe('viewer');

    // Bob must not inherit Alice's (first-row) membership.
    expect(bobMembership?.userId).not.toBe(alice.id);
    expect(bobMembership?.id).not.toBe(aliceMembership?.id);
  });

  it('demonstrates the old JS-&& form drops the userId filter', async () => {
    const db = getMiniflareDB();

    const org = await createTestOrganization({ slug: 'demo-org', name: 'Demo Org' });
    const alice = await createTestUser({ email: 'alice@demo.local' });
    const bob = await createTestUser({ email: 'bob@demo.local' });

    await createTestOrganizationUser(alice.id, org.id, { role: 'core_admin' });
    await createTestOrganizationUser(bob.id, org.id, { role: 'viewer' });

    // The buggy expression: `a && b` evaluates to `b` (the orgId condition only),
    // so the userId filter is gone and Bob's lookup returns whichever row the org
    // yields first — Alice's.
    const buggyCondition =
      eq(schema.organizationUser.userId, bob.id) && eq(schema.organizationUser.orgId, org.id);

    const buggyResult = await db
      .select()
      .from(schema.organizationUser)
      .where(buggyCondition)
      .get();

    // Bob's lookup leaks Alice's core_admin membership under the old code.
    expect(buggyResult?.role).toBe('core_admin');
    expect(buggyResult?.userId).toBe(alice.id);
  });
});
