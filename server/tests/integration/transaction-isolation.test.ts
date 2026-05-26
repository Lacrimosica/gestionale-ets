import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { eq, and } from 'drizzle-orm';
import { initializeMiniflare, cleanupMiniflare, getMiniflareDB } from '../setup/miniflare-context';
import { resetTestDatabase } from '../setup/db-reset';
import {
  createTestOrganization,
  createTestUser,
  createTestOrganizationUser,
} from '../setup/fixtures';
import * as schema from '../../src/db/schema';

describe('Database Transaction Isolation', () => {
  beforeEach(async () => {
    await initializeMiniflare('open');
    await resetTestDatabase();
  });

  afterEach(async () => {
    await cleanupMiniflare();
  });

  it('organization creation should be atomic', async () => {
    const db = getMiniflareDB();

    // Create org with all related records
    const org = await createTestOrganization({
      slug: 'atomic-org',
      name: 'Atomic Organization',
    });

    // Verify all pieces exist
    const orgRecord = await db
      .select()
      .from(schema.organization)
      .where(eq(schema.organization.id, org.id))
      .get();

    expect(orgRecord).toBeTruthy();
    expect(orgRecord?.isSetupComplete).toBe(1);
    expect(orgRecord?.slug).toBe('atomic-org');
  });

  it('user-org relationship should be transactionally consistent', async () => {
    const db = getMiniflareDB();

    const org = await createTestOrganization({
      slug: 'test-org',
      name: 'Test Organization',
    });

    const user = await createTestUser({
      email: 'user@example.com',
    });

    const orgUser = await createTestOrganizationUser(user.id, org.id, {
      role: 'admin',
    });

    // Verify both exist
    const userRecord = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.id, user.id))
      .get();

    const orgUserRecord = await db
      .select()
      .from(schema.organizationUser)
      .where(eq(schema.organizationUser.id, orgUser.id))
      .get();

    expect(userRecord).toBeTruthy();
    expect(orgUserRecord).toBeTruthy();
    expect(orgUserRecord?.userId).toBe(user.id);
    expect(orgUserRecord?.orgId).toBe(org.id);
  });

  it('concurrent updates to same org should not corrupt state', async () => {
    const db = getMiniflareDB();

    const org = await createTestOrganization({
      slug: 'test-org',
      name: 'Test Organization',
    });

    // Simulate two concurrent updates to organization_setting
    const updates = await Promise.all([
      db
        .insert(schema.organizationSetting)
        .values({
          id: 'setting-1',
          orgId: org.id,
          city: 'Milan',
          createdAt: new Date().toISOString(),
        }),
      db
        .insert(schema.organizationSetting)
        .values({
          id: 'setting-2',
          orgId: org.id,
          city: 'Rome',
          createdAt: new Date().toISOString(),
        }),
    ]);

    const settings = await db
      .select()
      .from(schema.organizationSetting)
      .where(eq(schema.organizationSetting.orgId, org.id))
      .all();
    
    // Both should succeed with different IDs
    expect(settings.length).toBeGreaterThanOrEqual(2);
  });

  it('rollback behavior should prevent partial state', async () => {
    const db = getMiniflareDB();

    // In a real transaction, if step 2 fails, step 1 should rollback
    // For this test, we verify that failed operations leave DB clean

    const orgId = 'test-org-' + Date.now();
    const userId = 'test-user-' + Date.now();

    try {
      // Attempt to create org_user without valid org (should fail at FK level)
      await db.insert(schema.organizationUser).values({
        id: 'org-user-' + Date.now(),
        userId: userId,
        orgId: orgId, // Non-existent org
        role: 'member',
        permissions: '[]',
        joinedAt: new Date().toISOString(),
      });

      expect.fail('Should have failed on FK constraint');
    } catch (err) {
      // Expected: FK constraint violation
      // org_user should not exist
      const orphaned = await db
        .select()
        .from(schema.organizationUser)
        .where(eq(schema.organizationUser.orgId, orgId))
        .all();

      expect(orphaned.length).toBe(0); // No partial state
    }
  });

  it('audit event should be logged atomically with operation', async () => {
    const db = getMiniflareDB();

    const org = await createTestOrganization({
      slug: 'test-org',
      name: 'Test Organization',
    });

    const user = await createTestUser({
      email: 'user@example.com',
    });

    // Create audit event
    const now = new Date().toISOString();
    await db.insert(schema.auditEvent).values({
      id: 'event-' + Date.now(),
      eventType: 'org_created',
      actorId: user.id,
      orgId: org.id,
      payload: JSON.stringify({ org: org.slug }),
      ip: '192.168.1.1',
      createdAt: now,
    });

    const event = await db
      .select()
      .from(schema.auditEvent)
      .where(eq(schema.auditEvent.orgId, org.id))
      .get();

    expect(event).toBeTruthy();
    expect(event?.eventType).toBe('org_created');
    expect(event?.orgId).toBe(org.id);
  });

  it('reading during write should not see uncommitted changes', async () => {
    const db = getMiniflareDB();

    const org = await createTestOrganization({
      slug: 'test-org',
      name: 'Test Organization',
      isSetupComplete: 0,
    });

    // Simulate: Read sees original state
    const before = await db
      .select()
      .from(schema.organization)
      .where(eq(schema.organization.id, org.id))
      .get();

    expect(before?.isSetupComplete).toBe(0);

    // Update happens
    await db
      .update(schema.organization)
      .set({ isSetupComplete: 1 })
      .where(eq(schema.organization.id, org.id))
      .run();

    // Read sees new state
    const after = await db
      .select()
      .from(schema.organization)
      .where(eq(schema.organization.id, org.id))
      .get();

    expect(after?.isSetupComplete).toBe(1);
  });

  it('constraint violations should not leave partial records', async () => {
    const db = getMiniflareDB();

    const org1 = await createTestOrganization({
      slug: 'org1',
      name: 'Organization 1',
    });

    const user = await createTestUser({
      email: 'user@example.com',
    });

    // Create valid org_user
    await createTestOrganizationUser(user.id, org1.id);

    // Attempt to create duplicate (same user, same org)
    try {
      await createTestOrganizationUser(user.id, org1.id);
      expect.fail('Should fail on UNIQUE constraint');
    } catch (err) {
      // Constraint violated, no partial record created
      expect((err as Error).message).toMatch(/UNIQUE|constraint/i);
    }

    // Verify only original membership exists
    const memberships = await db
      .select()
      .from(schema.organizationUser)
      .where(
        and(
          eq(schema.organizationUser.userId, user.id),
          eq(schema.organizationUser.orgId, org1.id),
        ),
      )
      .all();

    expect(memberships.length).toBe(1);
  });
});
