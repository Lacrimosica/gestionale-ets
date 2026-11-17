import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import app from '../../src/index';
import { resetDemoDatabase } from '../../src/demo-reset';
import { initializeMiniflare, cleanupMiniflare, getMiniflareRawDB } from '../setup/miniflare-context';
import { resetTestDatabase } from '../setup/db-reset';
import { createTestOrganization, createTestPerson } from '../setup/fixtures';

const JWT_SECRET = 'test-jwt-secret-min-32-characters-long!!';

describe('demo reset', () => {
  beforeEach(async () => {
    await initializeMiniflare('open');
    await resetTestDatabase();
  });

  afterEach(async () => {
    await cleanupMiniflare();
  });

  async function count(table: string) {
    const row = await getMiniflareRawDB().prepare(`SELECT COUNT(*) AS n FROM ${table}`).first<{ n: number }>();
    return row?.n ?? 0;
  }

  it('replaces visitor data with the fictional seed, repeatably', async () => {
    const visitorOrg = await createTestOrganization({ slug: 'visitor-org', name: 'Visitor Org' });
    await createTestPerson(visitorOrg.id, { orgId: visitorOrg.id, firstName: 'Visitor' });

    await resetDemoDatabase(getMiniflareRawDB());
    await resetDemoDatabase(getMiniflareRawDB());

    expect(await count('organization')).toBe(1);
    expect(await count('person')).toBe(40);
    expect(await count('member_period')).toBe(26);
    expect(await count('volunteer_status')).toBeGreaterThan(0); // lookup tables untouched
    const realLookingEmails = await getMiniflareRawDB()
      .prepare("SELECT COUNT(*) AS n FROM person WHERE email NOT LIKE '%@example.org'")
      .first<{ n: number }>();
    expect(realLookingEmails?.n).toBe(0);
  });

  it('the published demo login works after a reset', async () => {
    await resetDemoDatabase(getMiniflareRawDB());

    const res = await app.request(
      '/api/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'demo@example.org', password: 'demo-gestionale' }),
      },
      { DB: getMiniflareRawDB(), JWT_SECRET },
    );
    expect(res.status).toBe(200);
  });
});
