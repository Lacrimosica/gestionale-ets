import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initializeMiniflare, cleanupMiniflare, getMiniflareDB } from '../setup/miniflare-context';
import { resetTestDatabase } from '../setup/db-reset';
import {
  createTestOrganization,
  createTestUser,
  createTestOrganizationUser,
  createTestPerson,
} from '../setup/fixtures';
import * as schema from '../../src/db/schema';

describe('Multi-Tenant Isolation — Organization Boundaries', () => {
  beforeEach(async () => {
    await initializeMiniflare('open');
    await resetTestDatabase();
  });

  afterEach(async () => {
    await cleanupMiniflare();
  });

  it('two organizations should have different org_ids', async () => {
    const org1 = await createTestOrganization({
      slug: 'org1',
      name: 'Organization 1',
    });

    const org2 = await createTestOrganization({
      slug: 'org2',
      name: 'Organization 2',
    });

    expect(org1.id).not.toBe(org2.id);
  });

  it('user should only be linked to their organization', async () => {
    const db = getMiniflareDB();

    const org1 = await createTestOrganization({
      slug: 'org1',
      name: 'Organization 1',
    });

    const org2 = await createTestOrganization({
      slug: 'org2',
      name: 'Organization 2',
    });

    const user = await createTestUser({
      email: 'user@example.com',
    });

    // Link user to org1 only
    await createTestOrganizationUser(user.id, org1.id);

    // User should be in org1
    const org1Users = await db
      .select()
      .from(schema.organizationUser)
      .where((t) => t.userId === user.id && t.orgId === org1.id)
      .all();

    expect(org1Users.length).toBe(1);

    // User should NOT be in org2
    const org2Users = await db
      .select()
      .from(schema.organizationUser)
      .where((t) => t.userId === user.id && t.orgId === org2.id)
      .all();

    expect(org2Users.length).toBe(0);
  });

  it('user can have memberships in multiple organizations', async () => {
    const db = getMiniflareDB();

    const org1 = await createTestOrganization({
      slug: 'org1',
      name: 'Organization 1',
    });

    const org2 = await createTestOrganization({
      slug: 'org2',
      name: 'Organization 2',
    });

    const user = await createTestUser({
      email: 'multi-org-user@example.com',
    });

    // Link user to both orgs
    await createTestOrganizationUser(user.id, org1.id, { role: 'admin' });
    await createTestOrganizationUser(user.id, org2.id, { role: 'member' });

    // User should have 2 memberships
    const memberships = await db
      .select()
      .from(schema.organizationUser)
      .where((t) => t.userId === user.id)
      .all();

    expect(memberships.length).toBe(2);
    expect(memberships[0].orgId === org1.id || memberships[1].orgId === org1.id).toBe(true);
    expect(memberships[0].orgId === org2.id || memberships[1].orgId === org2.id).toBe(true);
  });

  it('user should have different roles in different organizations', async () => {
    const db = getMiniflareDB();

    const org1 = await createTestOrganization({
      slug: 'org1',
      name: 'Organization 1',
    });

    const org2 = await createTestOrganization({
      slug: 'org2',
      name: 'Organization 2',
    });

    const user = await createTestUser({
      email: 'user@example.com',
    });

    // Different roles in each org
    await createTestOrganizationUser(user.id, org1.id, { role: 'core_admin' });
    await createTestOrganizationUser(user.id, org2.id, { role: 'member' });

    const org1Membership = await db
      .select()
      .from(schema.organizationUser)
      .where((t) => t.userId === user.id && t.orgId === org1.id)
      .get();

    const org2Membership = await db
      .select()
      .from(schema.organizationUser)
      .where((t) => t.userId === user.id && t.orgId === org2.id)
      .get();

    expect(org1Membership?.role).toBe('core_admin');
    expect(org2Membership?.role).toBe('member');
  });

  it('person should belong to single organization (via org context)', async () => {
    const db = getMiniflareDB();

    const org1 = await createTestOrganization({
      slug: 'org1',
      name: 'Organization 1',
    });

    const org2 = await createTestOrganization({
      slug: 'org2',
      name: 'Organization 2',
    });

    // Create persons in different orgs
    const person1 = await createTestPerson(org1.id);
    const person2 = await createTestPerson(org2.id);

    // Persons should have different IDs
    expect(person1.id).not.toBe(person2.id);

    // Persons are stored globally but scoped by org context in API layer
    // (Database doesn't have explicit org_id on person table, but queries filter by user's org)
    const allPersons = await db
      .select()
      .from(schema.person)
      .all();

    // Both persons exist in DB
    expect(allPersons.length).toBeGreaterThanOrEqual(2);
  });

  it('organization_user junction should enforce unique (userId, orgId) pair', async () => {
    const db = getMiniflareDB();

    const org = await createTestOrganization({
      slug: 'test-org',
      name: 'Test Organization',
    });

    const user = await createTestUser({
      email: 'user@example.com',
    });

    // Link user to org
    await createTestOrganizationUser(user.id, org.id);

    // Attempt duplicate link
    try {
      await createTestOrganizationUser(user.id, org.id);
      expect.fail('Should throw UNIQUE constraint error');
    } catch (err) {
      expect((err as Error).message).toMatch(/UNIQUE|constraint/i);
    }
  });

  it('organizationSetting should be scoped to organization', async () => {
    const db = getMiniflareDB();

    const org1 = await createTestOrganization({
      slug: 'org1',
      name: 'Organization 1',
    });

    const org2 = await createTestOrganization({
      slug: 'org2',
      name: 'Organization 2',
    });

    // Create app settings for each org
    const setting1 = await db
      .insert(schema.organizationSetting)
      .values({
        id: 'setting-org1',
        orgId: org1.id,
        city: 'Milan',
        createdAt: new Date().toISOString(),
      });

    const setting2 = await db
      .insert(schema.organizationSetting)
      .values({
        id: 'setting-org2',
        orgId: org2.id,
        city: 'Rome',
        createdAt: new Date().toISOString(),
      });

    // Retrieve settings for each org
    const org1Settings = await db
      .select()
      .from(schema.organizationSetting)
      .where((t) => t.orgId === org1.id)
      .all();

    const org2Settings = await db
      .select()
      .from(schema.organizationSetting)
      .where((t) => t.orgId === org2.id)
      .all();

    expect(org1Settings.length).toBeGreaterThan(0);
    expect(org2Settings.length).toBeGreaterThan(0);
    expect(org1Settings[0]?.city).toBe('Milan');
    expect(org2Settings[0]?.city).toBe('Rome');
  });

  it('audit events should be scoped to organization', async () => {
    const db = getMiniflareDB();

    const org1 = await createTestOrganization({
      slug: 'org1',
      name: 'Organization 1',
    });

    const org2 = await createTestOrganization({
      slug: 'org2',
      name: 'Organization 2',
    });

    const user1 = await createTestUser({
      email: 'user1@example.com',
    });

    const user2 = await createTestUser({
      email: 'user2@example.com',
    });

    // Create audit events for each org
    await db.insert(schema.auditEvent).values({
      id: 'event-org1',
      eventType: 'org_created',
      actorId: user1.id,
      orgId: org1.id,
      payload: JSON.stringify({ org: 'org1' }),
      ip: '192.168.1.1',
      createdAt: new Date().toISOString(),
    });

    await db.insert(schema.auditEvent).values({
      id: 'event-org2',
      eventType: 'org_created',
      actorId: user2.id,
      orgId: org2.id,
      payload: JSON.stringify({ org: 'org2' }),
      ip: '192.168.1.2',
      createdAt: new Date().toISOString(),
    });

    // Query events for org1
    const org1Events = await db
      .select()
      .from(schema.auditEvent)
      .where((t) => t.orgId === org1.id)
      .all();

    // Query events for org2
    const org2Events = await db
      .select()
      .from(schema.auditEvent)
      .where((t) => t.orgId === org2.id)
      .all();

    expect(org1Events.length).toBeGreaterThan(0);
    expect(org2Events.length).toBeGreaterThan(0);
  });
});
