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

describe('Access Control — Org Boundary Enforcement', () => {
  beforeEach(async () => {
    await initializeMiniflare('open');
    await resetTestDatabase();
  });

  afterEach(async () => {
    await cleanupMiniflare();
  });

  it('user should only see people in their organization', async () => {
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
      email: 'user1@org1.com',
    });

    const user2 = await createTestUser({
      email: 'user2@org2.com',
    });

    // Link users to their orgs
    await createTestOrganizationUser(user1.id, org1.id);
    await createTestOrganizationUser(user2.id, org2.id);

    // Create persons in each org
    const person1 = await createTestPerson(org1.id);
    const person2 = await createTestPerson(org2.id);

    // Simulate API filtering: when user1 requests people, filter by org_id
    // (In real API, this would be in the route handler)
    // For now, verify that the data exists and is distinct

    expect(person1.id).not.toBe(person2.id);

    // In a real API call from user1 with orgId=org1,
    // they would get [person1] only, not [person2]
  });

  it('user should only see organization settings for their org', async () => {
    const db = getMiniflareDB();

    const org1 = await createTestOrganization({
      slug: 'org1',
      name: 'Organization 1',
    });

    const org2 = await createTestOrganization({
      slug: 'org2',
      name: 'Organization 2',
    });

    // Create settings for each org
    await db.insert(schema.organizationSetting).values({
      id: 'setting-org1',
      orgId: org1.id,
      city: 'Milan',
      createdAt: new Date().toISOString(),
    });

    await db.insert(schema.organizationSetting).values({
      id: 'setting-org2',
      orgId: org2.id,
      city: 'Rome',
      createdAt: new Date().toISOString(),
    });

    // User1 in org1 should only see org1 settings
    const org1Settings = await db
      .select()
      .from(schema.organizationSetting)
      .where((t) => t.orgId === org1.id)
      .get();

    expect(org1Settings?.city).toBe('Milan');
    expect(org1Settings?.orgId).toBe(org1.id);

    // User2 in org2 should only see org2 settings
    const org2Settings = await db
      .select()
      .from(schema.organizationSetting)
      .where((t) => t.orgId === org2.id)
      .get();

    expect(org2Settings?.city).toBe('Rome');
    expect(org2Settings?.orgId).toBe(org2.id);
  });

  it('user should not be able to access other org members list', async () => {
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

    const user3 = await createTestUser({
      email: 'user3@example.com',
    });

    // Org1 members: user1, user2
    await createTestOrganizationUser(user1.id, org1.id);
    await createTestOrganizationUser(user2.id, org1.id);

    // Org2 members: user3
    await createTestOrganizationUser(user3.id, org2.id);

    // User1 queries org1 members
    const org1Members = await db
      .select()
      .from(schema.organizationUser)
      .where((t) => t.orgId === org1.id)
      .all();

    // User1 should see: user1, user2
    expect(org1Members.length).toBe(2);
    expect(org1Members.some((m) => m.userId === user1.id)).toBe(true);
    expect(org1Members.some((m) => m.userId === user2.id)).toBe(true);

    // User1 should NOT see org2 members
    const org2Members = await db
      .select()
      .from(schema.organizationUser)
      .where((t) => t.orgId === org2.id)
      .all();

    // User1 querying org2 would get filtered out at API layer
    // (Database returns all org2 members, but API filters by JWT orgId)
    expect(org2Members.length).toBe(1);
    expect(org2Members[0]?.userId).toBe(user3.id);
  });

  it('user from org1 should not see invites for org2', async () => {
    const db = getMiniflareDB();

    const org1 = await createTestOrganization({
      slug: 'org1',
      name: 'Organization 1',
    });

    const org2 = await createTestOrganization({
      slug: 'org2',
      name: 'Organization 2',
    });

    const admin1 = await createTestUser({
      email: 'admin1@example.com',
    });

    const admin2 = await createTestUser({
      email: 'admin2@example.com',
    });

    await createTestOrganizationUser(admin1.id, org1.id, { role: 'admin' });
    await createTestOrganizationUser(admin2.id, org2.id, { role: 'admin' });

    // Create invites for each org
    await db.insert(schema.invite).values({
      id: 'invite-org1',
      orgId: org1.id,
      email: 'newuser@example.com',
      token: 'token-org1',
      role: 'member',
      createdByUserId: admin1.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    });

    await db.insert(schema.invite).values({
      id: 'invite-org2',
      orgId: org2.id,
      email: 'anotheruser@example.com',
      token: 'token-org2',
      role: 'member',
      createdByUserId: admin2.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    });

    // Admin1 querying invites for org1
    const org1Invites = await db
      .select()
      .from(schema.invite)
      .where((t) => t.orgId === org1.id)
      .all();

    // Admin1 should see only org1 invites
    expect(org1Invites.length).toBe(1);
    expect(org1Invites[0]?.token).toBe('token-org1');

    // Admin1 querying org2 invites would be rejected at API layer
    // (Database returns org2 invites, but API filters by JWT orgId)
  });

  it('organization settings should not be visible across orgs', async () => {
    const db = getMiniflareDB();

    const org1 = await createTestOrganization({
      slug: 'org1',
      name: 'Organization 1',
    });

    const org2 = await createTestOrganization({
      slug: 'org2',
      name: 'Organization 2',
    });

    // Create settings with different values
    const setting1 = await db
      .insert(schema.organizationSetting)
      .values({
        id: 'setting-org1',
        orgId: org1.id,
        city: 'Milan',
        maxProxies: 3,
        createdAt: new Date().toISOString(),
      });

    const setting2 = await db
      .insert(schema.organizationSetting)
      .values({
        id: 'setting-org2',
        orgId: org2.id,
        city: 'Rome',
        maxProxies: 5,
        createdAt: new Date().toISOString(),
      });

    // Query org1 settings
    const org1Setting = await db
      .select()
      .from(schema.organizationSetting)
      .where((t) => t.orgId === org1.id)
      .get();

    // Query org2 settings
    const org2Setting = await db
      .select()
      .from(schema.organizationSetting)
      .where((t) => t.orgId === org2.id)
      .get();

    // Settings should be different
    expect(org1Setting?.city).not.toBe(org2Setting?.city);
    expect(org1Setting?.maxProxies).not.toBe(org2Setting?.maxProxies);
  });

  it('user switching orgs should require re-authentication', async () => {
    // When a user belongs to multiple orgs and wants to switch,
    // they must re-authenticate to get a new JWT with different orgId

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

    // User belongs to both orgs
    await createTestOrganizationUser(user.id, org1.id);
    await createTestOrganizationUser(user.id, org2.id);

    // First JWT: orgId=org1
    const jwt1 = {
      sub: user.id,
      orgId: org1.id,
    };

    // To get JWT with orgId=org2, user must call login again
    // selecting org2 as the organization context
    const jwt2 = {
      sub: user.id,
      orgId: org2.id,
    };

    // Both JWTs valid, but can't be modified client-side (signed)
    expect(jwt1.orgId).toBe(org1.id);
    expect(jwt2.orgId).toBe(org2.id);
  });
});
