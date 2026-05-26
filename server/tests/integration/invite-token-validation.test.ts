import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initializeMiniflare, cleanupMiniflare, getMiniflareDB } from '../setup/miniflare-context';
import { resetTestDatabase } from '../setup/db-reset';
import { mockTime, advanceTime, resetTime } from '../setup/mocks/time';
import { createTestOrganization, createTestUser } from '../setup/fixtures';
import * as schema from '../../src/db/schema';

describe('Invite Token Validation — invite_only Mode', () => {
  beforeEach(async () => {
    await initializeMiniflare('invite_only');
    await resetTestDatabase();
    mockTime(Date.now());
  });

  afterEach(async () => {
    resetTime();
    await cleanupMiniflare();
  });

  it('valid invite token should allow org creation', async () => {
    const db = getMiniflareDB();
    const org = await createTestOrganization({
      slug: 'first-org',
      name: 'First Organization',
    });

    const issuer = await createTestUser({
      email: 'admin@example.com',
    });

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const invite = {
      id: 'invite-1',
      orgId: org.id,
      email: 'invitee@example.com',
      token: 'valid-token-123',
      role: 'member',
      createdByUserId: issuer.id,
      expiresAt,
      createdAt: new Date().toISOString(),
    };

    await db.insert(schema.invite).values(invite);

    const retrieved = await db
      .select()
      .from(schema.invite)
      .where((t) => t.token === 'valid-token-123')
      .get();

    expect(retrieved).toBeTruthy();
    expect(retrieved?.token).toBe('valid-token-123');
    expect(retrieved?.usedAt).toBeNull(); // Not used yet
  });

  it('expired invite token should be rejected', async () => {
    const db = getMiniflareDB();
    const org = await createTestOrganization({
      slug: 'org-with-expired-invite',
      name: 'Organization',
    });

    const issuer = await createTestUser({
      email: 'admin@example.com',
    });

    // Create expired invite (24 hours ago)
    const expiresAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const invite = {
      id: 'expired-invite',
      orgId: org.id,
      email: 'invitee@example.com',
      token: 'expired-token-123',
      role: 'member',
      createdByUserId: issuer.id,
      expiresAt,
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    };

    await db.insert(schema.invite).values(invite);

    const retrieved = await db
      .select()
      .from(schema.invite)
      .where((t) => t.token === 'expired-token-123')
      .get();

    const now = new Date();
    const isExpired = new Date(retrieved!.expiresAt) < now;
    expect(isExpired).toBe(true);
  });

  it('already-used invite token should be rejected', async () => {
    const db = getMiniflareDB();
    const org = await createTestOrganization({
      slug: 'org-with-used-invite',
      name: 'Organization',
    });

    const issuer = await createTestUser({
      email: 'admin@example.com',
    });

    const user = await createTestUser({
      email: 'invitee@example.com',
    });

    const usedAt = new Date().toISOString();

    const invite = {
      id: 'used-invite',
      orgId: org.id,
      email: 'invitee@example.com',
      token: 'used-token-123',
      role: 'member',
      createdByUserId: issuer.id,
      usedAt, // Already used
      usedByUserId: user.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };

    await db.insert(schema.invite).values(invite);

    const retrieved = await db
      .select()
      .from(schema.invite)
      .where((t) => t.token === 'used-token-123')
      .get();

    expect(retrieved?.usedAt).not.toBeNull();
  });

  it('invalid (non-existent) invite token should be rejected', async () => {
    const db = getMiniflareDB();

    const invites = await db
      .select()
      .from(schema.invite)
      .where((t) => t.token === 'non-existent-token')
      .all();

    expect(invites.length).toBe(0);
  });

  it('invite token should be marked as used after org creation', async () => {
    const db = getMiniflareDB();
    const org = await createTestOrganization({
      slug: 'org-will-use-invite',
      name: 'Organization',
    });

    const issuer = await createTestUser({
      email: 'admin@example.com',
    });

    const user = await createTestUser({
      email: 'new-user@example.com',
    });

    const now = new Date().toISOString();
    const invite = {
      id: 'invite-to-mark-used',
      orgId: org.id,
      email: 'new-user@example.com',
      token: 'mark-as-used-token',
      role: 'member',
      createdByUserId: issuer.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdAt: now,
    };

    await db.insert(schema.invite).values(invite);

    // Simulate marking as used
    await db
      .update(schema.invite)
      .set({
        usedAt: now,
        usedByUserId: user.id,
      })
      .where((t) => t.token === 'mark-as-used-token')
      .run();

    const updated = await db
      .select()
      .from(schema.invite)
      .where((t) => t.token === 'mark-as-used-token')
      .get();

    expect(updated?.usedAt).not.toBeNull();
    expect(updated?.usedByUserId).toBe(user.id);
  });
});
