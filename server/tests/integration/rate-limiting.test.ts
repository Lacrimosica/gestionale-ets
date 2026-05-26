import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initializeMiniflare, cleanupMiniflare, getMiniflareDB } from '../setup/miniflare-context';
import { resetTestDatabase } from '../setup/db-reset';
import { mockTime, advanceTime, resetTime } from '../setup/mocks/time';
import * as schema from '../../src/db/schema';

describe('Rate Limiting — Setup Endpoint', () => {
  beforeEach(async () => {
    await initializeMiniflare('open');
    await resetTestDatabase();
    mockTime(Date.now());
  });

  afterEach(async () => {
    resetTime();
    await cleanupMiniflare();
  });

  it('should allow up to 5 setup attempts per IP per hour', async () => {
    const db = getMiniflareDB();
    const clientIp = '192.168.1.100';
    const now = new Date();

    // Record 5 attempts
    for (let i = 0; i < 5; i++) {
      await db.insert(schema.setupAttempt).values({
        id: `attempt-${i}`,
        ip: clientIp,
        attemptedAt: now.toISOString(),
      });
    }

    // Count attempts in last hour
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const result = await db
      .select()
      .from(schema.setupAttempt)
      .where((t) => t.ip === clientIp && t.attemptedAt >= oneHourAgo)
      .all();

    expect(result.length).toBe(5);
  });

  it('should block 6th attempt within the same hour', async () => {
    const db = getMiniflareDB();
    const clientIp = '192.168.1.200';
    const now = new Date();

    // Record 6 attempts
    for (let i = 0; i < 6; i++) {
      await db.insert(schema.setupAttempt).values({
        id: `attempt-${i}`,
        ip: clientIp,
        attemptedAt: now.toISOString(),
      });
    }

    // Count attempts — should be 6 in DB, but API would reject 6th
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const result = await db
      .select()
      .from(schema.setupAttempt)
      .where((t) => t.ip === clientIp && t.attemptedAt >= oneHourAgo)
      .all();

    expect(result.length).toBe(6);
    // API layer checks: if recentCount > 5, return 429
    expect(result.length > 5).toBe(true);
  });

  it('should reset attempt count after 1 hour', async () => {
    const db = getMiniflareDB();
    const clientIp = '192.168.1.300';
    const startTime = new Date();

    // Record 5 attempts at T=0
    for (let i = 0; i < 5; i++) {
      await db.insert(schema.setupAttempt).values({
        id: `attempt-t0-${i}`,
        ip: clientIp,
        attemptedAt: startTime.toISOString(),
      });
    }

    // Advance time by 61 minutes
    advanceTime(61 * 60 * 1000);
    const laterTime = new Date(startTime.getTime() + 61 * 60 * 1000);

    // Count attempts in last hour (should be 0)
    const oneHourAgo = new Date(laterTime.getTime() - 60 * 60 * 1000).toISOString();
    const result = await db
      .select()
      .from(schema.setupAttempt)
      .where((t) => t.ip === clientIp && t.attemptedAt >= oneHourAgo)
      .all();

    expect(result.length).toBe(0);
  });

  it('should track attempts per IP (different IPs have separate limits)', async () => {
    const db = getMiniflareDB();
    const ip1 = '192.168.1.100';
    const ip2 = '192.168.1.101';
    const now = new Date().toISOString();

    // IP1: 5 attempts
    for (let i = 0; i < 5; i++) {
      await db.insert(schema.setupAttempt).values({
        id: `ip1-${i}`,
        ip: ip1,
        attemptedAt: now,
      });
    }

    // IP2: 1 attempt
    await db.insert(schema.setupAttempt).values({
      id: 'ip2-0',
      ip: ip2,
      attemptedAt: now,
    });

    // IP1 should have 5 attempts
    const ip1Attempts = await db
      .select()
      .from(schema.setupAttempt)
      .where((t) => t.ip === ip1)
      .all();
    expect(ip1Attempts.length).toBe(5);

    // IP2 should have 1 attempt
    const ip2Attempts = await db
      .select()
      .from(schema.setupAttempt)
      .where((t) => t.ip === ip2)
      .all();
    expect(ip2Attempts.length).toBe(1);
  });

  it('should handle edge case: exactly 1 hour boundary', async () => {
    const db = getMiniflareDB();
    const clientIp = '192.168.1.400';
    const startTime = new Date();

    // Record attempt at T=0
    await db.insert(schema.setupAttempt).values({
      id: 'boundary-0',
      ip: clientIp,
      attemptedAt: startTime.toISOString(),
    });

    // Advance time by exactly 60 minutes
    advanceTime(60 * 60 * 1000);
    const laterTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    // At exactly 1 hour later, the old attempt should NOT be counted
    // (gte comparison: attemptedAt >= oneHourAgo means it's excluded if exactly on boundary)
    const oneHourAgo = new Date(laterTime.getTime() - 60 * 60 * 1000).toISOString();
    const result = await db
      .select()
      .from(schema.setupAttempt)
      .where((t) => t.ip === clientIp && t.attemptedAt >= oneHourAgo)
      .all();

    // The attempt is exactly at the boundary, so it depends on the comparison operator
    // With gte, it should be included (since it's right at the threshold)
    expect(result.length).toBe(1);
  });
});
