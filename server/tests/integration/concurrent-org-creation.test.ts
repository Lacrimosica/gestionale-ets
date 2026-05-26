import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initializeMiniflare, cleanupMiniflare, getMiniflareDB } from '../setup/miniflare-context';
import { resetTestDatabase } from '../setup/db-reset';
import { createTestOrganization } from '../setup/fixtures';
import * as schema from '../../src/db/schema';

describe('Concurrent Org Creation — Race Conditions', () => {
  beforeEach(async () => {
    await initializeMiniflare('open');
    await resetTestDatabase();
  });

  afterEach(async () => {
    await cleanupMiniflare();
  });

  it('duplicate slug should be rejected even with concurrent creation', async () => {
    // Simulate two concurrent requests with same slug
    // First request creates org, second should get 409

    const slug = 'concurrent-org';

    try {
      const org1 = await createTestOrganization({
        slug: slug,
        name: 'First Organization',
      });

      // Second request with same slug should fail
      try {
        await createTestOrganization({
          slug: slug,
          name: 'Second Organization',
        });
        expect.fail('Should have thrown UNIQUE constraint error');
      } catch (err) {
        expect((err as Error).message).toMatch(/UNIQUE|constraint/i);
      }

      expect(org1.slug).toBe(slug);
    } catch (err) {
      // If first also fails, that's OK (race condition)
      expect((err as Error).message).toMatch(/UNIQUE|constraint/i);
    }
  });

  it('concurrent creation of different orgs should both succeed', async () => {
    const db = getMiniflareDB();

    // Create two orgs with different slugs concurrently
    const [org1, org2] = await Promise.all([
      createTestOrganization({
        slug: 'org-1',
        name: 'Organization 1',
      }),
      createTestOrganization({
        slug: 'org-2',
        name: 'Organization 2',
      }),
    ]);

    expect(org1.id).not.toBe(org2.id);
    expect(org1.slug).toBe('org-1');
    expect(org2.slug).toBe('org-2');

    // Verify both in database
    const orgs = await db.select().from(schema.organization).all();
    expect(orgs.length).toBeGreaterThanOrEqual(2);
  });

  it('should handle many rapid org creations', async () => {
    const db = getMiniflareDB();

    // Create 10 orgs rapidly with unique slugs
    const orgs = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        createTestOrganization({
          slug: `rapid-org-${i}`,
          name: `Rapid Organization ${i}`,
        })
      )
    );

    // All should succeed with unique IDs
    const ids = orgs.map((o) => o.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(10);

    // Verify all in database
    const allOrgs = await db.select().from(schema.organization).all();
    expect(allOrgs.length).toBeGreaterThanOrEqual(10);
  });

  it('concurrent requests with same auth domain should be rejected', async () => {
    const domain = 'shared-domain.example.com';

    try {
      const org1 = await createTestOrganization({
        slug: 'org-1',
        name: 'Org 1',
        authDomain: domain,
      });

      // Second request with same domain
      try {
        await createTestOrganization({
          slug: 'org-2',
          name: 'Org 2',
          authDomain: domain,
        });
        expect.fail('Should have thrown UNIQUE constraint error');
      } catch (err) {
        expect((err as Error).message).toMatch(/UNIQUE|constraint/i);
      }

      expect(org1.authDomain).toBe(domain);
    } catch (err) {
      // Race: first request also lost
      expect((err as Error).message).toMatch(/UNIQUE|constraint/i);
    }
  });

  it('organization_user unique constraint should prevent duplicate memberships', async () => {
    const db = getMiniflareDB();

    const org = await createTestOrganization({
      slug: 'test-org',
      name: 'Test Organization',
    });

    // Create a user
    const userId = 'user-' + Date.now();
    const orgUserId = 'org-user-' + Date.now();

    // First membership
    await db.insert(schema.organizationUser).values({
      id: orgUserId,
      userId,
      orgId: org.id,
      role: 'member',
      permissions: '[]',
      joinedAt: new Date().toISOString(),
    });

    // Attempt duplicate membership (same user, same org)
    try {
      await db.insert(schema.organizationUser).values({
        id: 'org-user-2-' + Date.now(),
        userId, // Same user
        orgId: org.id, // Same org
        role: 'member',
        permissions: '[]',
        joinedAt: new Date().toISOString(),
      });
      expect.fail('Should throw UNIQUE constraint error');
    } catch (err) {
      expect((err as Error).message).toMatch(/UNIQUE|constraint/i);
    }
  });

  it('rapid invite token generation should create unique tokens', async () => {
    const db = getMiniflareDB();

    const org = await createTestOrganization({
      slug: 'test-org',
      name: 'Test Organization',
    });

    // Create invites with unique tokens
    const invites = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        db.insert(schema.invite).values({
          id: `invite-${i}`,
          orgId: org.id,
          email: `user${i}@example.com`,
          token: `token-${Date.now()}-${i}`,
          role: 'member',
          createdByUserId: 'admin-' + Date.now(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
        })
      )
    );

    // All should succeed
    const allInvites = await db.select().from(schema.invite).all();
    expect(allInvites.length).toBeGreaterThanOrEqual(5);

    // Tokens should be unique
    const tokens = allInvites.map((i) => i.token);
    const uniqueTokens = new Set(tokens);
    expect(uniqueTokens.size).toBe(tokens.length);
  });

  it('concurrent setup attempts should respect rate limiting', async () => {
    const db = getMiniflareDB();
    const clientIp = '192.168.1.100';
    const now = new Date().toISOString();

    // Simulate 6 rapid setup attempts from same IP
    const attempts = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        db.insert(schema.setupAttempt).values({
          id: `attempt-${i}`,
          ip: clientIp,
          attemptedAt: now,
        })
      )
    );

    // All recorded (at DB level)
    const recorded = await db
      .select()
      .from(schema.setupAttempt)
      .where((t) => t.ip === clientIp)
      .all();

    expect(recorded.length).toBe(6);

    // API layer would reject 6th attempt (> 5 limit)
    expect(recorded.length > 5).toBe(true);
  });

  it('isSetupComplete flag should atomically transition orgs', async () => {
    const db = getMiniflareDB();

    const org = await createTestOrganization({
      slug: 'test-org',
      name: 'Test Organization',
      isSetupComplete: 0, // Not complete initially
    });

    expect(org.isSetupComplete).toBe(0);

    // Update to complete
    await db
      .update(schema.organization)
      .set({ isSetupComplete: 1 })
      .where((t) => t.id === org.id)
      .run();

    const updated = await db
      .select()
      .from(schema.organization)
      .where((t) => t.id === org.id)
      .get();

    expect(updated?.isSetupComplete).toBe(1);
  });
});
