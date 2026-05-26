import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initializeMiniflare, cleanupMiniflare, getMiniflareDB } from '../setup/miniflare-context';
import { resetTestDatabase } from '../setup/db-reset';
import { createTestOrganization, createTestUser, createTestOrganizationUser } from '../setup/fixtures';
import * as schema from '../../src/db/schema';

describe('Permissions Isolation — Role-Based Access Control', () => {
  beforeEach(async () => {
    await initializeMiniflare('open');
    await resetTestDatabase();
  });

  afterEach(async () => {
    await cleanupMiniflare();
  });

  it('permissions should be stored per organization_user', async () => {
    const db = getMiniflareDB();

    const org = await createTestOrganization({
      slug: 'test-org',
      name: 'Test Organization',
    });

    const user = await createTestUser({
      email: 'user@example.com',
    });

    const adminPermissions = [
      'dashboard.view',
      'people.view',
      'people.edit',
      'settings.view',
    ];

    await createTestOrganizationUser(user.id, org.id, {
      role: 'admin',
      permissions: JSON.stringify(adminPermissions),
    });

    const orgUser = await db
      .select()
      .from(schema.organizationUser)
      .where((t) => t.userId === user.id && t.orgId === org.id)
      .get();

    const permissions = JSON.parse(orgUser?.permissions || '[]');
    expect(permissions).toContain('dashboard.view');
    expect(permissions).toContain('people.edit');
    expect(permissions.length).toBe(4);
  });

  it('user with different roles in different orgs should have different permissions', async () => {
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

    const adminPerms = ['dashboard.view', 'people.edit', 'settings.manage'];
    const memberPerms = ['dashboard.view'];

    // User is admin in org1
    await createTestOrganizationUser(user.id, org1.id, {
      role: 'admin',
      permissions: JSON.stringify(adminPerms),
    });

    // User is member in org2
    await createTestOrganizationUser(user.id, org2.id, {
      role: 'member',
      permissions: JSON.stringify(memberPerms),
    });

    // Check org1 membership
    const org1User = await db
      .select()
      .from(schema.organizationUser)
      .where((t) => t.userId === user.id && t.orgId === org1.id)
      .get();

    const org1Perms = JSON.parse(org1User?.permissions || '[]');

    // Check org2 membership
    const org2User = await db
      .select()
      .from(schema.organizationUser)
      .where((t) => t.userId === user.id && t.orgId === org2.id)
      .get();

    const org2Perms = JSON.parse(org2User?.permissions || '[]');

    // Permissions differ by organization
    expect(org1Perms).toContain('people.edit');
    expect(org2Perms).not.toContain('people.edit');
    expect(org1Perms.length).toBeGreaterThan(org2Perms.length);
  });

  it('core_admin role should exist for org creation', async () => {
    const db = getMiniflareDB();

    const org = await createTestOrganization({
      slug: 'test-org',
      name: 'Test Organization',
    });

    const user = await createTestUser({
      email: 'admin@example.com',
    });

    const coreAdminPerms = [
      'dashboard.view',
      'people.view',
      'people.edit',
      'board.view',
      'assemblies.view',
      'assemblies.edit',
      'settings.view',
      'settings.users.view',
      'settings.users.manage',
    ];

    await createTestOrganizationUser(user.id, org.id, {
      role: 'core_admin',
      permissions: JSON.stringify(coreAdminPerms),
      isOwner: 1,
    });

    const orgUser = await db
      .select()
      .from(schema.organizationUser)
      .where((t) => t.userId === user.id)
      .get();

    expect(orgUser?.role).toBe('core_admin');
    expect(orgUser?.isOwner).toBe(1);

    const perms = JSON.parse(orgUser?.permissions || '[]');
    expect(perms.length).toBeGreaterThan(0);
  });

  it('member role should have limited permissions', async () => {
    const db = getMiniflareDB();

    const org = await createTestOrganization({
      slug: 'test-org',
      name: 'Test Organization',
    });

    const user = await createTestUser({
      email: 'member@example.com',
    });

    const memberPerms = ['dashboard.view', 'people.view'];

    await createTestOrganizationUser(user.id, org.id, {
      role: 'member',
      permissions: JSON.stringify(memberPerms),
      isOwner: 0,
    });

    const orgUser = await db
      .select()
      .from(schema.organizationUser)
      .where((t) => t.userId === user.id)
      .get();

    expect(orgUser?.role).toBe('member');
    expect(orgUser?.isOwner).toBe(0);

    const perms = JSON.parse(orgUser?.permissions || '[]');
    expect(perms).not.toContain('settings.users.manage');
    expect(perms).toContain('dashboard.view');
  });

  it('isOwner flag should only be set for org creators', async () => {
    const db = getMiniflareDB();

    const org = await createTestOrganization({
      slug: 'test-org',
      name: 'Test Organization',
    });

    const owner = await createTestUser({
      email: 'owner@example.com',
    });

    const member = await createTestUser({
      email: 'member@example.com',
    });

    // Owner created the org
    await createTestOrganizationUser(owner.id, org.id, { isOwner: 1 });

    // Member invited later
    await createTestOrganizationUser(member.id, org.id, { isOwner: 0 });

    const ownerMembership = await db
      .select()
      .from(schema.organizationUser)
      .where((t) => t.userId === owner.id)
      .get();

    const memberMembership = await db
      .select()
      .from(schema.organizationUser)
      .where((t) => t.userId === member.id)
      .get();

    expect(ownerMembership?.isOwner).toBe(1);
    expect(memberMembership?.isOwner).toBe(0);
  });

  it('invitedByUserId should track who invited a user', async () => {
    const db = getMiniflareDB();

    const org = await createTestOrganization({
      slug: 'test-org',
      name: 'Test Organization',
    });

    const admin = await createTestUser({
      email: 'admin@example.com',
    });

    const newUser = await createTestUser({
      email: 'newuser@example.com',
    });

    // Admin invites newUser
    await createTestOrganizationUser(newUser.id, org.id, {
      invitedByUserId: admin.id,
    });

    const membership = await db
      .select()
      .from(schema.organizationUser)
      .where((t) => t.userId === newUser.id)
      .get();

    expect(membership?.invitedByUserId).toBe(admin.id);
  });

  it('joinedAt should track when user joined organization', async () => {
    const db = getMiniflareDB();

    const org = await createTestOrganization({
      slug: 'test-org',
      name: 'Test Organization',
    });

    const user = await createTestUser({
      email: 'user@example.com',
    });

    const now = new Date().toISOString();

    await createTestOrganizationUser(user.id, org.id, {
      joinedAt: now,
    });

    const membership = await db
      .select()
      .from(schema.organizationUser)
      .where((t) => t.userId === user.id)
      .get();

    expect(membership?.joinedAt).toBe(now);
  });
});
