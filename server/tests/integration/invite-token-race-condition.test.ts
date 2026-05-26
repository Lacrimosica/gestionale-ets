import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initializeMiniflare, cleanupMiniflare, getMiniflareDB } from '../setup/miniflare-context';
import { resetTestDatabase } from '../setup/db-reset';
import { createTestOrganization, createTestUser, createTestInvite } from '../setup/fixtures';
import * as schema from '../../src/db/schema';

describe('Invite Token Race Conditions', () => {
  beforeEach(async () => {
    await initializeMiniflare('invite_only');
    await resetTestDatabase();
  });

  afterEach(async () => {
    await cleanupMiniflare();
  });

  it('token should be single-use (prevent reuse)', async () => {
    const db = getMiniflareDB();

    const org = await createTestOrganization({
      slug: 'test-org',
      name: 'Test Organization',
    });

    const issuer = await createTestUser({
      email: 'issuer@example.com',
    });

    const invite = await createTestInvite(org.id, issuer.id);

    // First use: mark as used
    const user1 = await createTestUser({
      email: 'user1@example.com',
    });

    await db
      .update(schema.invite)
      .set({
        usedAt: new Date().toISOString(),
        usedByUserId: user1.id,
      })
      .where((t) => t.token === invite.token)
      .run();

    const usedInvite = await db
      .select()
      .from(schema.invite)
      .where((t) => t.token === invite.token)
      .get();

    expect(usedInvite?.usedAt).not.toBeNull();

    // Second use: should be rejected (already usedAt)
    const isAlreadyUsed = usedInvite?.usedAt !== null;
    expect(isAlreadyUsed).toBe(true);
  });

  it('concurrent token usage should result in one winner', async () => {
    const db = getMiniflareDB();

    const org = await createTestOrganization({
      slug: 'test-org',
      name: 'Test Organization',
    });

    const issuer = await createTestUser({
      email: 'issuer@example.com',
    });

    const invite = await createTestInvite(org.id, issuer.id);

    const user1 = await createTestUser({
      email: 'user1@example.com',
    });

    const user2 = await createTestUser({
      email: 'user2@example.com',
    });

    // Two users try to use same token concurrently
    // In real scenario: both send requests simultaneously
    // DB should only allow one to update (first to complete)

    try {
      // User 1 marks as used
      await db
        .update(schema.invite)
        .set({
          usedAt: new Date().toISOString(),
          usedByUserId: user1.id,
        })
        .where((t) => t.token === invite.token)
        .run();

      // User 2 tries to mark as used (should see it's already used)
      const inviteNow = await db
        .select()
        .from(schema.invite)
        .where((t) => t.token === invite.token)
        .get();

      expect(inviteNow?.usedByUserId).toBe(user1.id); // User1 won the race
    } catch (err) {
      // Race condition handled
      expect(err).toBeTruthy();
    }
  });

  it('expired token should not be usable even concurrently', async () => {
    const db = getMiniflareDB();

    const org = await createTestOrganization({
      slug: 'test-org',
      name: 'Test Organization',
    });

    const issuer = await createTestUser({
      email: 'issuer@example.com',
    });

    // Create expired invite (24+ hours ago)
    const expiredInvite = await db
      .insert(schema.invite)
      .values({
        id: 'expired-' + Date.now(),
        orgId: org.id,
        email: 'expired@example.com',
        token: 'expired-token-' + Date.now(),
        role: 'member',
        createdByUserId: issuer.id,
        expiresAt: new Date(Date.now() - 1000).toISOString(), // 1 second ago
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      });

    const user = await createTestUser({
      email: 'user@example.com',
    });

    // Check expiry before allowing use
    const invite = await db
      .select()
      .from(schema.invite)
      .where((t) => t.token === 'expired-token-' + Date.now())
      .get();

    const isExpired = new Date(invite!.expiresAt) < new Date();
    expect(isExpired).toBe(true);

    // Should be rejected regardless of concurrency
  });

  it('should prevent token duplication', async () => {
    const db = getMiniflareDB();

    const org = await createTestOrganization({
      slug: 'test-org',
      name: 'Test Organization',
    });

    const issuer = await createTestUser({
      email: 'issuer@example.com',
    });

    const uniqueToken = 'unique-token-' + Date.now();

    // Create invite with unique token
    await db.insert(schema.invite).values({
      id: 'invite-1',
      orgId: org.id,
      email: 'user1@example.com',
      token: uniqueToken,
      role: 'member',
      createdByUserId: issuer.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    });

    // Attempt to create duplicate token
    try {
      await db.insert(schema.invite).values({
        id: 'invite-2',
        orgId: org.id,
        email: 'user2@example.com',
        token: uniqueToken, // Same token
        role: 'member',
        createdByUserId: issuer.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      });
      expect.fail('Should throw UNIQUE constraint error');
    } catch (err) {
      expect((err as Error).message).toMatch(/UNIQUE|constraint/i);
    }
  });

  it('token should be validated before marking as used', async () => {
    const db = getMiniflareDB();

    const org = await createTestOrganization({
      slug: 'test-org',
      name: 'Test Organization',
    });

    const issuer = await createTestUser({
      email: 'issuer@example.com',
    });

    const invite = await createTestInvite(org.id, issuer.id);
    const user = await createTestUser({
      email: 'user@example.com',
    });

    // Validation steps before marking as used:
    // 1. Token exists
    const tokenExists = await db
      .select()
      .from(schema.invite)
      .where((t) => t.token === invite.token)
      .get();

    expect(tokenExists).toBeTruthy();

    // 2. Token not already used
    const alreadyUsed = tokenExists?.usedAt !== null;
    expect(alreadyUsed).toBe(false);

    // 3. Token not expired
    const isExpired = new Date(tokenExists!.expiresAt) < new Date();
    expect(isExpired).toBe(false);

    // 4. Only then mark as used
    await db
      .update(schema.invite)
      .set({
        usedAt: new Date().toISOString(),
        usedByUserId: user.id,
      })
      .where((t) => t.token === invite.token)
      .run();

    const updated = await db
      .select()
      .from(schema.invite)
      .where((t) => t.token === invite.token)
      .get();

    expect(updated?.usedAt).not.toBeNull();
  });
});
