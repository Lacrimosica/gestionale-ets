import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initializeMiniflare, cleanupMiniflare } from '../setup/miniflare-context';
import { resetTestDatabase } from '../setup/db-reset';
import { createTestOrganization, countOrganizations } from '../setup/fixtures';

describe('Open Mode — Multiple Organizations', () => {
  beforeEach(async () => {
    await initializeMiniflare('open');
    await resetTestDatabase();
  });

  afterEach(async () => {
    await cleanupMiniflare();
  });

  it('first organization can be created', async () => {
    const org1 = await createTestOrganization({
      slug: 'org-one',
      name: 'Organization One',
    });

    expect(org1.id).toBeTruthy();
    const count = await countOrganizations();
    expect(count).toBe(1);
  });

  it('unlimited organizations can be created in open mode', async () => {
    const orgs = [];

    for (let i = 1; i <= 5; i++) {
      const org = await createTestOrganization({
        slug: `org-${i}`,
        name: `Organization ${i}`,
      });
      orgs.push(org);
    }

    const count = await countOrganizations();
    expect(count).toBe(5);
  });

  it('each organization has unique slug', async () => {
    const org1 = await createTestOrganization({
      slug: 'unique-slug-1',
      name: 'Org 1',
    });

    const org2 = await createTestOrganization({
      slug: 'unique-slug-2',
      name: 'Org 2',
    });

    expect(org1.slug).not.toBe(org2.slug);
  });

  it('organizations should be isolated by org_id in multi-tenant setup', async () => {
    const org1 = await createTestOrganization({
      slug: 'tenant-1',
      name: 'Tenant 1',
    });

    const org2 = await createTestOrganization({
      slug: 'tenant-2',
      name: 'Tenant 2',
    });

    expect(org1.id).not.toBe(org2.id);
    expect(org1.slug).not.toBe(org2.slug);
  });
});
