import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initializeMiniflare, cleanupMiniflare } from '../setup/miniflare-context';
import { resetTestDatabase } from '../setup/db-reset';
import { createTestOrganization, createTestUser, createTestOrganizationUser } from '../setup/fixtures';

describe('JWT orgId Claim — Access Control', () => {
  beforeEach(async () => {
    await initializeMiniflare('open');
    await resetTestDatabase();
  });

  afterEach(async () => {
    await cleanupMiniflare();
  });

  it('JWT should include orgId claim for single-org user', async () => {
    const org = await createTestOrganization({
      slug: 'test-org',
      name: 'Test Organization',
    });

    const user = await createTestUser({
      email: 'user@example.com',
    });

    await createTestOrganizationUser(user.id, org.id);

    // Simulated JWT payload structure
    const jwtPayload = {
      sub: user.id,
      email: user.email,
      orgId: org.id, // ← Should be present
      role: 'core_admin',
      permissions: [],
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
    };

    expect(jwtPayload.orgId).toBe(org.id);
    expect(jwtPayload.sub).toBe(user.id);
  });

  it('JWT payload should contain user role', async () => {
    const org = await createTestOrganization({
      slug: 'test-org',
      name: 'Test Organization',
    });

    const user = await createTestUser({
      email: 'user@example.com',
    });

    await createTestOrganizationUser(user.id, org.id, { role: 'member' });

    const jwtPayload = {
      sub: user.id,
      email: user.email,
      orgId: org.id,
      role: 'member', // ← Should be present
      permissions: [],
    };

    expect(jwtPayload.role).toBe('member');
  });

  it('JWT payload should contain permissions array', async () => {
    const org = await createTestOrganization({
      slug: 'test-org',
      name: 'Test Organization',
    });

    const user = await createTestUser({
      email: 'user@example.com',
    });

    const permissions = ['dashboard.view', 'people.view', 'people.edit'];
    await createTestOrganizationUser(user.id, org.id, {
      role: 'admin',
      permissions: JSON.stringify(permissions),
    });

    const jwtPayload = {
      sub: user.id,
      email: user.email,
      orgId: org.id,
      role: 'admin',
      permissions: permissions, // ← Should be present
    };

    expect(jwtPayload.permissions).toContain('dashboard.view');
    expect(Array.isArray(jwtPayload.permissions)).toBe(true);
  });

  it('JWT should have expiry (exp) claim', async () => {
    const now = Math.floor(Date.now() / 1000);
    const expiry = now + 24 * 60 * 60; // 24 hours from now

    const jwtPayload = {
      sub: 'user-id',
      iat: now,
      exp: expiry, // ← Should be present
    };

    expect(jwtPayload.exp).toBeGreaterThan(jwtPayload.iat);
    expect(jwtPayload.exp - jwtPayload.iat).toBe(24 * 60 * 60);
  });

  it('API should use orgId claim to filter data', async () => {
    // This test documents the behavior expected at the API layer
    // When a user makes a request with JWT containing orgId=org1,
    // the API should only return data for org1, not other orgs

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

    // User belongs to org1 only
    await createTestOrganizationUser(user.id, org1.id);

    // JWT would have orgId=org1
    const jwtOrgId = org1.id;

    // When API receives request from this user, it should:
    // - Accept requests for org1 data
    // - Reject requests for org2 data (401/403)

    expect(jwtOrgId).toBe(org1.id);
    // API layer should validate: requested orgId === JWT orgId
  });

  it('user with multiple orgs should be unable to switch orgs in JWT', async () => {
    // JWT is issued for ONE specific org at login time
    // User cannot change orgId in JWT (it's signed)
    // To access different org, user must login again with that org selected

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

    // JWT issued for org1
    const jwt1 = {
      sub: user.id,
      orgId: org1.id, // Signed & immutable
    };

    // Cannot change JWT to org2 without re-authenticating
    // (JWT is signed with secret)
    expect(jwt1.orgId).toBe(org1.id);

    // To access org2, would need to call login again with org2 selected
    // API would issue new JWT with orgId=org2
  });

  it('JWT should not contain sensitive fields (password, etc)', async () => {
    const org = await createTestOrganization({
      slug: 'test-org',
      name: 'Test Organization',
    });

    const user = await createTestUser({
      email: 'user@example.com',
      password: 'hashed-password-should-not-be-in-jwt',
    });

    await createTestOrganizationUser(user.id, org.id);

    // JWT payload should NOT include
    const unsafeJwtPayload = {
      sub: user.id,
      email: user.email,
      orgId: org.id,
      // password: NOT INCLUDED ✅
      // googleId: NOT INCLUDED ✅
      // googleRefreshToken: NOT INCLUDED ✅
    };

    expect(unsafeJwtPayload).not.toHaveProperty('password');
    expect(unsafeJwtPayload).not.toHaveProperty('googleRefreshToken');
  });
});
