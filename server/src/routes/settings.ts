import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { and, eq, ne } from 'drizzle-orm';
import { appSetting, user } from '../db/schema';
import { hashPassword, verifyPassword } from '../lib/auth';

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

type Variables = {
  jwtPayload: {
    sub: string;
    email: string;
    role: string;
    permissions?: string[];
    exp: number;
  };
};

const settingsRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();
const BRANDING_SETTINGS_ID = 'branding';
const MAX_LOGO_DATA_URL_LENGTH = 1_200_000;

const defaultBrandingSettings = {
  organizationName: 'DEB ODV',
  shortName: 'DEB',
  authDomain: '',
  tagline: 'Gestionale associazione',
  supportEmail: '',
  logoDataUrl: null as string | null,
};

const defaultPermissionsByRole: Record<string, string[]> = {
  core_admin: [
    'dashboard.view',
    'people.view',
    'people.edit',
    'volunteers.view',
    'members.view',
    'board.view',
    'assemblies.view',
    'assemblies.edit',
    'convocations.view',
    'convocations.edit',
    'timeline.view',
    'resignations.view',
    'settings.view',
    'settings.users.view',
    'settings.users.manage',
    'settings.password.manage',
    'settings.users.reset_password',
  ],
  admin: [
    'dashboard.view',
    'people.view',
    'people.edit',
    'volunteers.view',
    'members.view',
    'board.view',
    'assemblies.view',
    'assemblies.edit',
    'convocations.view',
    'convocations.edit',
    'timeline.view',
    'resignations.view',
    'settings.view',
    'settings.users.view',
    'settings.users.manage',
    'settings.password.manage',
    'settings.users.reset_password',
  ],
  manager: [
    'dashboard.view',
    'people.view',
    'people.edit',
    'volunteers.view',
    'members.view',
    'board.view',
    'assemblies.view',
    'assemblies.edit',
    'convocations.view',
    'convocations.edit',
    'timeline.view',
    'resignations.view',
    'settings.view',
    'settings.password.manage',
  ],
  viewer: [
    'dashboard.view',
    'people.view',
    'volunteers.view',
    'members.view',
    'board.view',
    'assemblies.view',
    'convocations.view',
    'timeline.view',
    'resignations.view',
    'settings.view',
    'settings.password.manage',
  ],
};

const getPermissionsForRole = (role: string) => defaultPermissionsByRole[role] ?? defaultPermissionsByRole.viewer;

const parsePermissions = (value?: string | null, role?: string) => {
  try {
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : getPermissionsForRole(role || 'viewer');
  } catch {
    return getPermissionsForRole(role || 'viewer');
  }
};

const mapUser = (u: typeof user.$inferSelect) => ({
  id: u.id,
  email: u.email,
  role: u.role,
  isCoreAdmin: u.role === 'core_admin',
  permissions: parsePermissions(u.permissions, u.role),
  createdAt: u.createdAt,
  updatedAt: u.updatedAt,
});

const mapBrandingSettings = (settings?: typeof appSetting.$inferSelect | null) => ({
  organizationName: settings?.organizationName || defaultBrandingSettings.organizationName,
  shortName: settings?.shortName || defaultBrandingSettings.shortName,
  authDomain: settings?.authDomain ?? defaultBrandingSettings.authDomain,
  tagline: settings?.tagline ?? defaultBrandingSettings.tagline,
  supportEmail: settings?.supportEmail ?? defaultBrandingSettings.supportEmail,
  logoDataUrl: settings?.logoDataUrl ?? defaultBrandingSettings.logoDataUrl,
  updatedAt: settings?.updatedAt ?? null,
});

const getBrandingSettings = async (db: ReturnType<typeof drizzle>) => {
  const settings = await db.select().from(appSetting).where(eq(appSetting.id, BRANDING_SETTINGS_ID)).get();
  return mapBrandingSettings(settings);
};

const upsertBrandingSettings = async (
  db: ReturnType<typeof drizzle>,
  payload: {
    organizationName?: unknown;
    shortName?: unknown;
    authDomain?: unknown;
    tagline?: unknown;
    supportEmail?: unknown;
    logoDataUrl?: unknown;
  }
) => {
  const organizationName = typeof payload.organizationName === 'string' ? payload.organizationName.trim() : '';
  const shortName = typeof payload.shortName === 'string' ? payload.shortName.trim() : '';
  const authDomain = typeof payload.authDomain === 'string' ? payload.authDomain.trim().toLowerCase() : '';
  const tagline = typeof payload.tagline === 'string' ? payload.tagline.trim() : '';
  const supportEmail = typeof payload.supportEmail === 'string' ? payload.supportEmail.trim() : '';
  const logoDataUrl =
    typeof payload.logoDataUrl === 'string' && payload.logoDataUrl.trim().length > 0 ? payload.logoDataUrl.trim() : null;

  if (!organizationName || !shortName) {
    return { error: 'Organization name and short name are required', status: 400 as const };
  }

  if (logoDataUrl && logoDataUrl.length > MAX_LOGO_DATA_URL_LENGTH) {
    return { error: 'Logo file is too large', status: 400 as const };
  }

  const now = new Date().toISOString();
  const existing = await db.select().from(appSetting).where(eq(appSetting.id, BRANDING_SETTINGS_ID)).get();
  const values = {
    organizationName,
    shortName,
    authDomain,
    tagline,
    supportEmail,
    logoDataUrl,
    updatedAt: now,
  };

  if (existing) {
    await db.update(appSetting).set(values).where(eq(appSetting.id, BRANDING_SETTINGS_ID)).run();
  } else {
    await db.insert(appSetting).values({
      id: BRANDING_SETTINGS_ID,
      ...values,
      createdAt: now,
    }).run();
  }

  return { data: await getBrandingSettings(db) };
};

const requirePermission = async (c: any, permission: string) => {
  const payload = c.get('jwtPayload');
  const db = drizzle(c.env.DB);
  const currentUser = await db.select().from(user).where(eq(user.id, payload.sub)).get();
  if (!currentUser) {
    return c.json({ error: 'User not found' }, 404);
  }

  const permissions = parsePermissions(currentUser.permissions, currentUser.role);
  if (!permissions.includes(permission)) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  return null;
};

const requireCoreAdmin = async (c: any) => {
  const payload = c.get('jwtPayload');
  const db = drizzle(c.env.DB);
  const currentUser = await db.select().from(user).where(eq(user.id, payload.sub)).get();
  if (!currentUser) {
    return c.json({ error: 'User not found' }, 404);
  }

  if (currentUser.role !== 'core_admin') {
    return c.json({ error: 'Only core admin can update branding settings' }, 403);
  }

  return null;
};

// Password hashing utilities moved to lib/auth.ts

settingsRouter.get('/users', async (c) => {
  const denied = await requirePermission(c, 'settings.users.view');
  if (denied) return denied;

  const db = drizzle(c.env.DB);
  const allUsers = await db.select().from(user).all();
  return c.json(allUsers.map(mapUser));
});

settingsRouter.get('/public/branding', async (c) => {
  const db = drizzle(c.env.DB);
  return c.json(await getBrandingSettings(db));
});

settingsRouter.get('/public/branding/resolve', async (c) => {
  const domain = (c.req.query('domain') || '').trim().toLowerCase();
  const db = drizzle(c.env.DB);
  const branding = await getBrandingSettings(db);
  const matchesDomain = !!domain && !!branding.authDomain && branding.authDomain === domain;

  return c.json({
    ...branding,
    matchedDomain: matchesDomain,
    enteredDomain: domain,
  });
});

settingsRouter.get('/branding', async (c) => {
  const denied = await requirePermission(c, 'settings.view');
  if (denied) return denied;

  const db = drizzle(c.env.DB);
  return c.json(await getBrandingSettings(db));
});

settingsRouter.put('/branding', async (c) => {
  const denied = await requireCoreAdmin(c);
  if (denied) return denied;

  const db = drizzle(c.env.DB);
  const result = await upsertBrandingSettings(db, await c.req.json());
  if ('error' in result) {
    return c.json({ error: result.error }, result.status);
  }

  return c.json(result.data);
});

settingsRouter.post('/users', async (c) => {
  const denied = await requirePermission(c, 'settings.users.manage');
  if (denied) return denied;

  const { email, password, role, permissions } = await c.req.json();
  if (!email || !password || !role) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  const db = drizzle(c.env.DB);
  const existing = await db.select().from(user).where(eq(user.email, email)).get();
  if (existing) {
    return c.json({ error: 'Email already exists' }, 409);
  }

  const now = new Date().toISOString();
  // We'll keep using PBKDF2 for now as it was in the original code.
  const newUser = {
    id: crypto.randomUUID(),
    email,
    password: await hashPassword(password),
    role,
    permissions: JSON.stringify(Array.isArray(permissions) && permissions.length > 0 ? permissions : getPermissionsForRole(role)),
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(user).values(newUser).run();
  return c.json(mapUser(newUser), 201);
});

settingsRouter.put('/users/:id', async (c) => {
  const denied = await requirePermission(c, 'settings.users.manage');
  if (denied) return denied;

  const { id } = c.req.param();
  const { email, role, permissions } = await c.req.json();
  if (!email || !role) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  const db = drizzle(c.env.DB);
  const targetUser = await db.select().from(user).where(eq(user.id, id)).get();
  if (!targetUser) {
    return c.json({ error: 'User not found' }, 404);
  }
  if (targetUser.role === 'core_admin') {
    return c.json({ error: 'Core admin account cannot be modified from this action' }, 403);
  }

  const duplicate = await db.select().from(user).where(and(eq(user.email, email), ne(user.id, id))).get();
  if (duplicate) {
    return c.json({ error: 'Email already exists' }, 409);
  }

  await db.update(user).set({
    email,
    role,
    permissions: JSON.stringify(Array.isArray(permissions) && permissions.length > 0 ? permissions : getPermissionsForRole(role)),
    updatedAt: new Date().toISOString(),
  }).where(eq(user.id, id)).run();

  const updated = await db.select().from(user).where(eq(user.id, id)).get();
  if (!updated) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json(mapUser(updated));
});

settingsRouter.post('/users/:id/reset-password', async (c) => {
  const denied = await requirePermission(c, 'settings.users.reset_password');
  if (denied) return denied;

  const payload = c.get('jwtPayload');
  const db = drizzle(c.env.DB);
  const actor = await db.select().from(user).where(eq(user.id, payload.sub)).get();
  if (!actor || actor.role !== 'core_admin') {
    return c.json({ error: 'Only core admin can reset other user passwords' }, 403);
  }

  const { id } = c.req.param();
  const { newPassword } = await c.req.json();
  if (!newPassword) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  const targetUser = await db.select().from(user).where(eq(user.id, id)).get();
  if (!targetUser) {
    return c.json({ error: 'User not found' }, 404);
  }

  await db.update(user).set({
    password: await hashPassword(newPassword),
    updatedAt: new Date().toISOString(),
  }).where(eq(user.id, id)).run();

  return c.json({ success: true });
});

settingsRouter.delete('/users/:id', async (c) => {
  const denied = await requirePermission(c, 'settings.users.manage');
  if (denied) return denied;

  const payload = c.get('jwtPayload');
  const { id } = c.req.param();
  const db = drizzle(c.env.DB);

  if (payload.sub === id) {
    return c.json({ error: 'You cannot delete your own user' }, 400);
  }

  const targetUser = await db.select().from(user).where(eq(user.id, id)).get();
  if (!targetUser) {
    return c.json({ error: 'User not found' }, 404);
  }

  if (targetUser.role === 'core_admin') {
    return c.json({ error: 'Core admin account cannot be deleted' }, 403);
  }

  await db.delete(user).where(eq(user.id, id)).run();
  return c.json({ success: true });
});

settingsRouter.post('/change-password', async (c) => {
  const denied = await requirePermission(c, 'settings.password.manage');
  if (denied) return denied;

  const payload = c.get('jwtPayload');
  const { currentPassword, newPassword } = await c.req.json();
  if (!currentPassword || !newPassword) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  const db = drizzle(c.env.DB);
  const currentUser = await db.select().from(user).where(eq(user.id, payload.sub)).get();
  if (!currentUser) {
    return c.json({ error: 'User not found' }, 404);
  }

  const valid = await verifyPassword(currentPassword, currentUser.password);
  if (!valid) {
    return c.json({ error: 'Current password is invalid' }, 400);
  }

  await db.update(user).set({
    password: await hashPassword(newPassword),
    updatedAt: new Date().toISOString(),
  }).where(eq(user.id, currentUser.id)).run();

  return c.json({ success: true });
});

export default settingsRouter;
