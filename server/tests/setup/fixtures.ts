import { v4 as uuid } from 'crypto';
import { getMiniflareDB } from './miniflare-context';
import * as schema from '../../src/db/schema';

function generateUuid() {
  return crypto.randomUUID?.() || uuid();
}

export async function createTestOrganization(overrides: Partial<typeof schema.organization.$inferInsert> = {}) {
  const db = getMiniflareDB();

  const org = {
    id: generateUuid(),
    name: `Test Org ${Date.now()}`,
    shortName: `TO${Date.now().toString().slice(-4)}`,
    slug: `test-org-${Date.now()}`,
    isSetupComplete: 1,
    createdAt: new Date().toISOString(),
    ...overrides,
  };

  await db.insert(schema.organization).values(org);
  return org;
}

export async function createTestUser(overrides: Partial<typeof schema.user.$inferInsert> = {}) {
  const db = getMiniflareDB();

  const user = {
    id: generateUuid(),
    email: `user-${Date.now()}@test.local`,
    password: 'hashed_password_here',
    createdAt: new Date().toISOString(),
    ...overrides,
  };

  await db.insert(schema.user).values(user);
  return user;
}

export async function createTestOrganizationUser(
  userId: string,
  orgId: string,
  overrides: Partial<typeof schema.organizationUser.$inferInsert> = {}
) {
  const db = getMiniflareDB();

  const orgUser = {
    id: generateUuid(),
    userId,
    orgId,
    role: 'admin',
    permissions: '[]',
    isOwner: 1,
    joinedAt: new Date().toISOString(),
    ...overrides,
  };

  await db.insert(schema.organizationUser).values(orgUser);
  return orgUser;
}

export async function createTestPerson(
  orgId: string,
  overrides: Partial<typeof schema.person.$inferInsert> = {}
) {
  const db = getMiniflareDB();

  const person = {
    id: generateUuid(),
    firstName: `Test`,
    lastName: `Person ${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };

  await db.insert(schema.person).values(person);
  return person;
}

export async function createTestOrganizationSetting(
  orgId: string,
  overrides: Partial<typeof schema.organizationSetting.$inferInsert> = {}
) {
  const db = getMiniflareDB();

  const setting = {
    id: generateUuid(),
    orgId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };

  await db.insert(schema.organizationSetting).values(setting);
  return setting;
}

export async function getOrganizationBySlug(slug: string) {
  const db = getMiniflareDB();
  const result = await db
    .select()
    .from(schema.organization)
    .where((t) => t.slug === slug)
    .limit(1)
    .all();
  return result[0] || null;
}

export async function getUserByEmail(email: string) {
  const db = getMiniflareDB();
  const result = await db
    .select()
    .from(schema.user)
    .where((t) => t.email === email)
    .limit(1)
    .all();
  return result[0] || null;
}

export async function countOrganizations() {
  const db = getMiniflareDB();
  const result = await db.select({ count: schema.organization.id }).from(schema.organization).all();
  return result.length;
}

export async function createTestInvite(
  orgId: string,
  createdByUserId: string,
  overrides: Partial<typeof schema.invite.$inferInsert> = {}
) {
  const db = getMiniflareDB();

  const invite = {
    id: crypto.randomUUID?.() || 'invite-' + Date.now(),
    orgId,
    email: `invite-${Date.now()}@example.com`,
    token: `token-${Date.now()}-${Math.random()}`,
    role: 'member',
    createdByUserId,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  };

  await db.insert(schema.invite).values(invite);
  return invite;
}
