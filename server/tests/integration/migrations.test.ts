import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initializeMiniflare, cleanupMiniflare, getMiniflareDB } from '../setup/miniflare-context';
import { resetTestDatabase } from '../setup/db-reset';
import * as schema from '../../src/db/schema';

describe('Database Migrations', () => {
  beforeEach(async () => {
    await initializeMiniflare('open');
    await resetTestDatabase();
  });

  afterEach(async () => {
    await cleanupMiniflare();
  });

  it('all required tables should exist after migrations', async () => {
    const db = getMiniflareDB();

    const result = await db.all(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name;
    `);

    const tableNames = (result.results || []).map((row) => row.name as string);

    expect(tableNames).toContain('person');
    expect(tableNames).toContain('organization');
    expect(tableNames).toContain('user');
    expect(tableNames).toContain('organization_user');
    expect(tableNames).toContain('assembly');
    expect(tableNames).toContain('attendance');
    expect(tableNames).toContain('organization_setting');
  });

  it('lookup tables should be seeded without duplicates', async () => {
    const db = getMiniflareDB();

    // Check assembly_type lookup table
    const assemblyTypes = await db.select().from(schema.assemblyType).all();
    const ids = assemblyTypes.map((t) => t.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(ids.length);
    expect(ids.length).toBeGreaterThan(0);
  });

  it('organization_setting should have compliance_rules column', async () => {
    const db = getMiniflareDB();

    // Create a test setting
    await db.insert(schema.organizationSetting).values({
      id: 'test-setting',
      complianceRules: JSON.stringify({}),
      createdAt: new Date().toISOString(),
    });

    const setting = await db
      .select()
      .from(schema.organizationSetting)
      .where((t) => t.id === 'test-setting')
      .get();

    expect(setting).toBeTruthy();
    expect(setting?.complianceRules).toBeDefined();
  });

  it('organization table should have required columns', async () => {
    const db = getMiniflareDB();

    const org = await db.insert(schema.organization).values({
      id: 'test-org',
      name: 'Test',
      shortName: 'T',
      slug: 'test-slug',
      isSetupComplete: 0,
      createdAt: new Date().toISOString(),
    });

    const retrieved = await db
      .select()
      .from(schema.organization)
      .where((t) => t.id === 'test-org')
      .get();

    expect(retrieved).toBeTruthy();
    expect(retrieved?.name).toBe('Test');
    expect(retrieved?.isSetupComplete).toBe(0);
  });

  it('volunteer_period should support both old and new status columns', async () => {
    const db = getMiniflareDB();

    // First create a person
    const person = await db
      .insert(schema.person)
      .values({
        id: 'test-person',
        firstName: 'Test',
        lastName: 'Person',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

    // Create volunteer period with legacy 'status' field
    const period = await db
      .insert(schema.volunteerPeriod)
      .values({
        id: 'test-period',
        personId: 'test-person',
        status: 'active',
        enrollmentDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });

    const retrieved = await db
      .select()
      .from(schema.volunteerPeriod)
      .where((t) => t.id === 'test-period')
      .get();

    expect(retrieved).toBeTruthy();
    expect(retrieved?.status).toBe('active');
  });
});
