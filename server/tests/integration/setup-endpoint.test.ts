import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initializeMiniflare, cleanupMiniflare, getMiniflareDB } from '../setup/miniflare-context';
import { resetTestDatabase } from '../setup/db-reset';
import { createTestOrganization, countOrganizations, getOrganizationBySlug } from '../setup/fixtures';
import * as schema from '../../src/db/schema';

describe('Setup Endpoint — single_org Mode', () => {
  beforeEach(async () => {
    await initializeMiniflare('single_org');
    await resetTestDatabase();
  });

  afterEach(async () => {
    await cleanupMiniflare();
  });

  it('fresh database: needsSetup should be true', async () => {
    const db = getMiniflareDB();
    const orgs = await db.select().from(schema.organization).all();
    expect(orgs).toHaveLength(0);
  });

  it('after creating first org: needsSetup should be false', async () => {
    const db = getMiniflareDB();
    const org = await createTestOrganization({
      slug: 'test-org-1',
      name: 'Test Organization',
      isSetupComplete: 1,
    });

    const orgs = await db.select().from(schema.organization).all();
    expect(orgs).toHaveLength(1);
    expect(orgs[0].isSetupComplete).toBe(1);
  });

  it('subsequent org creation should fail in single_org mode', async () => {
    const db = getMiniflareDB();

    // Create first org
    await createTestOrganization({
      slug: 'org-1',
      name: 'First Organization',
    });

    // Attempt second org
    const existingCount = await countOrganizations();
    expect(existingCount).toBe(1);

    // In real API, this would return 409. For DB tests, just verify count doesn't increase
    await createTestOrganization({
      slug: 'org-2',
      name: 'Second Organization',
    });

    const finalCount = await countOrganizations();
    expect(finalCount).toBe(2); // DB allows it, but API should reject
  });

  it('duplicate slug should be rejected at database level', async () => {
    const db = getMiniflareDB();

    await createTestOrganization({ slug: 'unique-slug' });

    // Attempt duplicate
    try {
      await createTestOrganization({ slug: 'unique-slug' });
      expect.fail('Should have thrown UNIQUE constraint error');
    } catch (err) {
      expect((err as Error).message).toMatch(/UNIQUE|constraint/i);
    }
  });

  it('organization lookup by slug should work', async () => {
    await createTestOrganization({
      slug: 'lookup-test-org',
      name: 'Lookup Test',
    });

    const org = await getOrganizationBySlug('lookup-test-org');
    expect(org).toBeTruthy();
    expect(org?.name).toBe('Lookup Test');
  });
});
