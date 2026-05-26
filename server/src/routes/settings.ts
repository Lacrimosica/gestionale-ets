import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { and, eq, ne, isNotNull, isNull } from 'drizzle-orm';
import { organizationSetting, user, organizationAddress, convocationModalityOption, userSetting, organizationUser, organization } from '../db/schema';
import { desc } from 'drizzle-orm';
import { hashPassword, verifyPassword } from '../lib/auth';

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

type Variables = {
  jwtPayload: {
    sub: string;
    email: string;
    orgId: string;
    role: string;
    permissions?: string[];
    exp: number;
  };
};

const settingsRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();
const BRANDING_SETTINGS_ID = 'branding';
const MAX_LOGO_DATA_URL_LENGTH = 1_200_000;

const defaultBrandingSettings = {
  name: 'DEB ODV',
  shortName: 'DEB',
  authDomain: '',
  tagline: 'Gestionale associazione',
  supportEmail: '',
  logoDataUrl: null as string | null,
};

const DEPRECATED_PERMISSIONS = ['volunteers.view', 'members.view'];

const ALL_PERMISSIONS = [
  'dashboard.view',
  'people.view',
  'people.edit',
  'board.view',
  'assemblies.view',
  'assemblies.edit',
  'convocations.view',
  'convocations.edit',
  'timeline.view',
  'resignations.view',
  'settings.view',
  'settings.manage',
  'settings.users.view',
  'settings.users.manage',
  'settings.password.manage',
  'documents.view',
  'documents.generate',
  'documents.manage',
];

const defaultPermissionsByRole: Record<string, string[]> = {
  core_admin: ALL_PERMISSIONS,
  admin: ALL_PERMISSIONS,
  manager: [
    'dashboard.view',
    'people.view',
    'people.edit',
    'board.view',
    'assemblies.view',
    'assemblies.edit',
    'convocations.view',
    'convocations.edit',
    'timeline.view',
    'resignations.view',
    'settings.view',
    'settings.manage',
    'settings.password.manage',
    'documents.view',
    'documents.generate',
  ],
  viewer: [
    'dashboard.view',
    'people.view',
    'board.view',
    'assemblies.view',
    'convocations.view',
    'timeline.view',
    'resignations.view',
    'settings.view',
    'settings.password.manage',
    'documents.view',
  ],
};

const getPermissionsForRole = (role: string) => defaultPermissionsByRole[role] ?? defaultPermissionsByRole.viewer;

const parsePermissions = (value?: string | null, role?: string) => {
  try {
    const parsed = value ? JSON.parse(value) : [];
    const base = Array.isArray(parsed) && parsed.length > 0 ? parsed : getPermissionsForRole(role || 'viewer');
    return base.filter((p: string) => !DEPRECATED_PERMISSIONS.includes(p));
  } catch {
    return getPermissionsForRole(role || 'viewer');
  }
};

const mapUser = (u: any) => ({
  id: u.id,
  email: u.email,
  // NOTE: role/permissions now come from organization_user table, not user table
  // This is a legacy adapter; the endpoint should be refactored for multi-org
  role: u.role || 'viewer',
  isCoreAdmin: u.role === 'core_admin',
  permissions: parsePermissions(u.permissions, u.role || 'viewer'),
  createdAt: u.createdAt,
  updatedAt: u.updatedAt,
});

const mapBrandingSettings = (settings?: typeof organization.$inferSelect | null) => ({
  name: settings?.name || defaultBrandingSettings.name,
  shortName: settings?.shortName || defaultBrandingSettings.shortName,
  authDomain: settings?.authDomain ?? defaultBrandingSettings.authDomain,
  tagline: settings?.tagline ?? defaultBrandingSettings.tagline,
  supportEmail: settings?.supportEmail ?? defaultBrandingSettings.supportEmail,
  logoDataUrl: settings?.logoDataUrl ?? defaultBrandingSettings.logoDataUrl,
  createdAt: settings?.createdAt ?? null,
});

const getBrandingSettings = async (db: ReturnType<typeof drizzle>, orgId: string) => {
  const settings = await db.select().from(organization).where(eq(organization.id, orgId)).get();
  return mapBrandingSettings(settings);
};

const upsertBrandingSettings = async (
  db: ReturnType<typeof drizzle>,
  orgId: string,
  payload: {
    name?: unknown;
    shortName?: unknown;
    authDomain?: unknown;
    tagline?: unknown;
    supportEmail?: unknown;
    logoDataUrl?: unknown;
  }
) => {
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const shortName = typeof payload.shortName === 'string' ? payload.shortName.trim() : '';
  const authDomain = typeof payload.authDomain === 'string' ? payload.authDomain.trim().toLowerCase() : '';
  const tagline = typeof payload.tagline === 'string' ? payload.tagline.trim() : '';
  const supportEmail = typeof payload.supportEmail === 'string' ? payload.supportEmail.trim() : '';
  const logoDataUrl =
    typeof payload.logoDataUrl === 'string' && payload.logoDataUrl.trim().length > 0 ? payload.logoDataUrl.trim() : null;

  if (!name || !shortName) {
    return { error: 'Organization name and short name are required', status: 400 as const };
  }

  if (logoDataUrl && logoDataUrl.length > MAX_LOGO_DATA_URL_LENGTH) {
    return { error: 'Logo file is too large', status: 400 as const };
  }

  await db.update(organization).set({
    name,
    shortName,
    authDomain,
    tagline,
    supportEmail,
    logoDataUrl,
  }).where(eq(organization.id, orgId)).run();

  return { data: await getBrandingSettings(db, orgId) };
};

const requirePermission = async (c: any, permission: string) => {
  const payload = c.get('jwtPayload');
  // Permissions now come from JWT payload (sourced from organization_user table)
  const permissions = payload.permissions || [];
  if (!permissions.includes(permission)) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  return null;
};

const requireCoreAdmin = async (c: any) => {
  const payload = c.get('jwtPayload');
  // Role now comes from JWT payload (sourced from organization_user table)
  if (payload.role !== 'core_admin') {
    return c.json({ error: 'Only core admin can update branding settings' }, 403);
  }

  return null;
};

// Password hashing utilities moved to lib/auth.ts

settingsRouter.get('/users', async (c) => {
  const denied = await requirePermission(c, 'settings.users.view');
  if (denied) return denied;

  const payload = c.get('jwtPayload');
  const db = drizzle(c.env.DB);

  // Get all organization_user rows for this org
  const orgUsers = await db.select().from(organizationUser).where(eq(organizationUser.orgId, payload.orgId)).all();

  // Fetch user details for each org member
  const users = await Promise.all(
    orgUsers.map(async (orgUser) => {
      const u = await db.select().from(user).where(eq(user.id, orgUser.userId)).get();
      return {
        id: u?.id,
        email: u?.email,
        role: orgUser.role,
        isCoreAdmin: orgUser.role === 'core_admin',
        permissions: parsePermissions(orgUser.permissions, orgUser.role),
        createdAt: u?.createdAt,
        updatedAt: u?.updatedAt,
      };
    })
  );

  return c.json(users);
});

settingsRouter.get('/branding', async (c) => {
  const denied = await requirePermission(c, 'settings.view');
  if (denied) return denied;

  const payload = c.get('jwtPayload');
  const db = drizzle(c.env.DB);
  return c.json(await getBrandingSettings(db, payload.orgId));
});

settingsRouter.put('/branding', async (c) => {
  const denied = await requireCoreAdmin(c);
  if (denied) return denied;

  const payload = c.get('jwtPayload');
  const db = drizzle(c.env.DB);
  const result = await upsertBrandingSettings(db, payload.orgId, await c.req.json());
  if ('error' in result) {
    return c.json({ error: result.error }, result.status);
  }

  return c.json(result.data);
});

settingsRouter.post('/users', async (c) => {
  const denied = await requirePermission(c, 'settings.users.manage');
  if (denied) return denied;

  const payload = c.get('jwtPayload');
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
  const userId = crypto.randomUUID();

  // Create user account without role/permissions (those live in organization_user)
  await db.insert(user).values({
    id: userId,
    email,
    password: await hashPassword(password),
    createdAt: now,
    updatedAt: now,
  }).run();

  // Add user to org via organization_user
  const perms = Array.isArray(permissions) && permissions.length > 0 ? permissions : getPermissionsForRole(role);
  await db.insert(organizationUser).values({
    id: crypto.randomUUID(),
    userId,
    orgId: payload.orgId,
    role,
    permissions: JSON.stringify(perms),
    joinedAt: now,
  }).run();

  return c.json({
    id: userId,
    email,
    role,
    isCoreAdmin: role === 'core_admin',
    permissions: perms,
    createdAt: now,
    updatedAt: now,
  }, 201);
});

settingsRouter.put('/users/:id', async (c) => {
  const denied = await requirePermission(c, 'settings.users.manage');
  if (denied) return denied;

  const payload = c.get('jwtPayload');
  const { id } = c.req.param();
  const { email } = await c.req.json();
  if (!email) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  const db = drizzle(c.env.DB);

  // Verify user belongs to this org
  const orgUser = await db.select().from(organizationUser)
    .where(and(eq(organizationUser.userId, id), eq(organizationUser.orgId, payload.orgId)))
    .get();
  if (!orgUser) {
    return c.json({ error: 'User not found in this organization' }, 404);
  }

  const targetUser = await db.select().from(user).where(eq(user.id, id)).get();
  if (!targetUser) {
    return c.json({ error: 'User not found' }, 404);
  }

  const duplicate = await db.select().from(user).where(and(eq(user.email, email), ne(user.id, id))).get();
  if (duplicate) {
    return c.json({ error: 'Email already exists' }, 409);
  }

  await db.update(user).set({
    email,
    updatedAt: new Date().toISOString(),
  }).where(eq(user.id, id)).run();

  const updated = await db.select().from(user).where(eq(user.id, id)).get();
  if (!updated) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({
    id: updated.id,
    email: updated.email,
    role: orgUser.role,
    isCoreAdmin: orgUser.role === 'core_admin',
    permissions: parsePermissions(orgUser.permissions, orgUser.role),
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  });
});

settingsRouter.post('/users/:id/reset-password', async (c) => {
  const denied = await requirePermission(c, 'settings.users.reset_password');
  if (denied) return denied;

  const payload = c.get('jwtPayload');
  // Role now comes from JWT payload (sourced from organization_user table)
  if (payload.role !== 'core_admin') {
    return c.json({ error: 'Only core admin can reset other user passwords' }, 403);
  }

  const db = drizzle(c.env.DB);

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

  // Get org membership for this user in the current org
  const targetOrgUser = await db.select().from(organizationUser)
    .where(and(eq(organizationUser.userId, id), eq(organizationUser.orgId, payload.orgId)))
    .get();
  if (!targetOrgUser) {
    return c.json({ error: 'User not found in this organization' }, 404);
  }

  // Core admin cannot be removed from org
  if (targetOrgUser.role === 'core_admin') {
    return c.json({ error: 'Core admin account cannot be removed from organization' }, 403);
  }

  // Remove user from org by deleting organizationUser record
  // The user account itself remains (they may belong to other orgs)
  await db.delete(organizationUser).where(eq(organizationUser.id, targetOrgUser.id)).run();
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

  if (!currentUser.password) {
    return c.json({ error: 'Password not set; use Google login or request password reset' }, 400);
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

// ─── Sede legale (org address history) ────────────────────────────────────────

// GET /api/settings/addresses — full history, newest first
settingsRouter.get('/addresses', async (c) => {
  const denied = await requirePermission(c, 'settings.view');
  if (denied) return denied;

  const payload = c.get('jwtPayload');
  const db = drizzle(c.env.DB);
  const rows = await db.select().from(organizationAddress)
    .where(eq(organizationAddress.orgId, payload.orgId))
    .orderBy(desc(organizationAddress.effectiveFrom))
    .all();
  return c.json(rows);
});

// POST /api/settings/addresses — add a new address entry
settingsRouter.post('/addresses', async (c) => {
  const denied = await requirePermission(c, 'settings.manage');
  if (denied) return denied;

  const payload = c.get('jwtPayload');
  const { address, effectiveFrom, notes } = await c.req.json<{
    address: string;
    effectiveFrom: string;
    notes?: string;
  }>();

  if (!address?.trim() || !effectiveFrom) {
    return c.json({ error: 'address and effectiveFrom are required' }, 400);
  }

  const db = drizzle(c.env.DB);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.insert(organizationAddress).values({
    id,
    address: address.trim(),
    effectiveFrom,
    notes: notes ?? null,
    orgId: payload.orgId,
    createdAt: now,
  }).run();

  const row = await db.select().from(organizationAddress).where(eq(organizationAddress.id, id)).get();
  return c.json(row, 201);
});

// PATCH /api/settings/addresses/:id — update address or notes
settingsRouter.patch('/addresses/:id', async (c) => {
  const denied = await requirePermission(c, 'settings.manage');
  if (denied) return denied;

  const payload = c.get('jwtPayload');
  const { id } = c.req.param();
  const db = drizzle(c.env.DB);

  const existing = await db.select().from(organizationAddress)
    .where(and(eq(organizationAddress.id, id), eq(organizationAddress.orgId, payload.orgId)))
    .get();
  if (!existing) return c.json({ error: 'Not found' }, 404);

  const body = await c.req.json<{ address?: string; effectiveFrom?: string; notes?: string }>();
  await db.update(organizationAddress).set({
    address: body.address?.trim() ?? existing.address,
    effectiveFrom: body.effectiveFrom ?? existing.effectiveFrom,
    notes: body.notes !== undefined ? (body.notes ?? null) : existing.notes,
  }).where(eq(organizationAddress.id, id)).run();

  const updated = await db.select().from(organizationAddress).where(eq(organizationAddress.id, id)).get();
  return c.json(updated);
});

// DELETE /api/settings/addresses/:id
settingsRouter.delete('/addresses/:id', async (c) => {
  const denied = await requirePermission(c, 'settings.manage');
  if (denied) return denied;

  const payload = c.get('jwtPayload');
  const { id } = c.req.param();
  const db = drizzle(c.env.DB);

  const existing = await db.select().from(organizationAddress)
    .where(and(eq(organizationAddress.id, id), eq(organizationAddress.orgId, payload.orgId)))
    .get();
  if (!existing) return c.json({ error: 'Not found' }, 404);

  await db.delete(organizationAddress).where(eq(organizationAddress.id, id)).run();
  return c.json({ success: true });
});

// ─── Document generation settings ─────────────────────────────────────────────

const DOCUMENT_SETTINGS_ID = 'branding'; // same single row as branding

const mapDocumentSettings = (s?: typeof organizationSetting.$inferSelect | null) => ({
  city: s?.city ?? null,
  statuteArticleConvocation: s?.statuteArticleConvocation ?? null,
  statuteArticleProxies: s?.statuteArticleProxies ?? null,
  statuteArticleMembers: s?.statuteArticleMembers ?? null,
  statuteArticleBoardVote: s?.statuteArticleBoardVote ?? null,
  statuteArticleBoardElection: s?.statuteArticleBoardElection ?? null,
  maxProxies: s?.maxProxies ?? null,
  outputFolderId: s?.outputFolderId ?? null,
  templateConvocationId: s?.templateConvocationId ?? null,
  templateMinutes1aId: s?.templateMinutes1aId ?? null,
  templateMinutes2aId: s?.templateMinutes2aId ?? null,
  templateConvocationExtraordinaryStatuteId: s?.templateConvocationExtraordinaryStatuteId ?? null,
  templateConvocationExtraordinaryDissolutionId: s?.templateConvocationExtraordinaryDissolutionId ?? null,
  templateConvocationBoardId: s?.templateConvocationBoardId ?? null,
  templateMinutesBoardId: s?.templateMinutesBoardId ?? null,
  // Phase 5: Use new English name with fallback to old name
  miscellaneousDefaultText: s?.miscellaneousDefaultText ?? s?.varieDefaultText ?? 'Non vengono individuati ulteriori argomenti su cui sia necessaria discussione.',
});

settingsRouter.get('/documents', async (c) => {
  const denied = await requirePermission(c, 'settings.view');
  if (denied) return denied;

  const payload = c.get('jwtPayload');
  const db = drizzle(c.env.DB);
  const s = await db.select().from(organizationSetting).where(eq(organizationSetting.orgId, payload.orgId)).get();
  return c.json(mapDocumentSettings(s));
});

settingsRouter.patch('/documents', async (c) => {
  const denied = await requirePermission(c, 'settings.manage');
  if (denied) return denied;

  const payload = c.get('jwtPayload');
  const body = await c.req.json<Partial<ReturnType<typeof mapDocumentSettings>>>();
  const db = drizzle(c.env.DB);
  const now = new Date().toISOString();

  // Phase 5: Use Record<string, unknown> to support both old and new field names during transition
  const patch: Record<string, unknown> = { updatedAt: now };
  if (body.city !== undefined) patch.city = body.city;
  if (body.statuteArticleConvocation !== undefined) patch.statuteArticleConvocation = body.statuteArticleConvocation;
  if (body.statuteArticleProxies !== undefined) patch.statuteArticleProxies = body.statuteArticleProxies;
  if (body.statuteArticleMembers !== undefined) patch.statuteArticleMembers = body.statuteArticleMembers;
  if (body.statuteArticleBoardVote !== undefined) patch.statuteArticleBoardVote = body.statuteArticleBoardVote;
  if (body.statuteArticleBoardElection !== undefined) patch.statuteArticleBoardElection = body.statuteArticleBoardElection;
  if (body.maxProxies !== undefined) patch.maxProxies = body.maxProxies;
  if (body.outputFolderId !== undefined) patch.outputFolderId = body.outputFolderId;
  if (body.templateConvocationId !== undefined) patch.templateConvocationId = body.templateConvocationId;
  if (body.templateMinutes1aId !== undefined) patch.templateMinutes1aId = body.templateMinutes1aId;
  if (body.templateMinutes2aId !== undefined) patch.templateMinutes2aId = body.templateMinutes2aId;
  if (body.templateConvocationExtraordinaryStatuteId !== undefined) patch.templateConvocationExtraordinaryStatuteId = body.templateConvocationExtraordinaryStatuteId;
  if (body.templateConvocationExtraordinaryDissolutionId !== undefined) patch.templateConvocationExtraordinaryDissolutionId = body.templateConvocationExtraordinaryDissolutionId;
  if (body.templateConvocationBoardId !== undefined) patch.templateConvocationBoardId = body.templateConvocationBoardId;
  if (body.templateMinutesBoardId !== undefined) patch.templateMinutesBoardId = body.templateMinutesBoardId;
  // Phase 5: Support both old and new field names for backward compatibility
  if (body.miscellaneousDefaultText !== undefined) patch.miscellaneousDefaultText = body.miscellaneousDefaultText;
  // Allow old field name during transition by casting to any
  const bodyAny = body as any;
  if (bodyAny.varieDefaultText !== undefined) patch.varieDefaultText = bodyAny.varieDefaultText;

  const existing = await db.select().from(organizationSetting).where(eq(organizationSetting.orgId, payload.orgId)).get();
  if (existing) {
    await db.update(organizationSetting).set(patch).where(eq(organizationSetting.orgId, payload.orgId)).run();
  } else {
    await db.insert(organizationSetting).values({
      id: crypto.randomUUID(),
      orgId: payload.orgId,
      createdAt: now,
      updatedAt: now,
      ...patch,
    }).run();
  }

  const updated = await db.select().from(organizationSetting).where(eq(organizationSetting.orgId, payload.orgId)).get();
  return c.json(mapDocumentSettings(updated));
});

// ─── Convocation modality options ──────────────────────────────────────────────

settingsRouter.get('/modality-options', async (c) => {
  const denied = await requirePermission(c, 'settings.view');
  if (denied) return denied;

  const payload = c.get('jwtPayload');
  const db = drizzle(c.env.DB);
  const rows = await db.select().from(convocationModalityOption)
    .where(eq(convocationModalityOption.orgId, payload.orgId))
    .all();
  return c.json(rows);
});

settingsRouter.post('/modality-options', async (c) => {
  const denied = await requirePermission(c, 'settings.manage');
  if (denied) return denied;

  const payload = c.get('jwtPayload');
  const { type, mode, label, value, isDefault } = await c.req.json<{
    type: string;
    mode?: string;
    label: string;
    value: string;
    isDefault?: boolean;
  }>();

  if (!type || !label?.trim() || !value?.trim()) {
    return c.json({ error: 'type, label and value are required' }, 400);
  }
  if (type !== 'convocation' && type !== 'minutes_opening') {
    return c.json({ error: 'type must be convocation or minutes_opening' }, 400);
  }
  const resolvedMode = mode ?? 'any';
  if (!['in_person', 'remote', 'hybrid', 'any'].includes(resolvedMode)) {
    return c.json({ error: 'mode must be in_person, remote, hybrid, or any' }, 400);
  }

  const db = drizzle(c.env.DB);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.insert(convocationModalityOption).values({
    id,
    type,
    mode: resolvedMode,
    label: label.trim(),
    value: value.trim(),
    isDefault: isDefault ? 1 : 0,
    orgId: payload.orgId,
    createdAt: now,
  }).run();

  const row = await db.select().from(convocationModalityOption).where(eq(convocationModalityOption.id, id)).get();
  return c.json(row, 201);
});

settingsRouter.patch('/modality-options/:id', async (c) => {
  const denied = await requirePermission(c, 'settings.manage');
  if (denied) return denied;

  const payload = c.get('jwtPayload');
  const { id } = c.req.param();
  const db = drizzle(c.env.DB);

  const existing = await db.select().from(convocationModalityOption)
    .where(and(eq(convocationModalityOption.id, id), eq(convocationModalityOption.orgId, payload.orgId)))
    .get();
  if (!existing) return c.json({ error: 'Not found' }, 404);

  const body = await c.req.json<{ label?: string; value?: string; isDefault?: boolean; mode?: string }>();
  if (body.mode !== undefined && !['in_person', 'remote', 'hybrid', 'any'].includes(body.mode)) {
    return c.json({ error: 'mode must be in_person, remote, hybrid, or any' }, 400);
  }
  await db.update(convocationModalityOption).set({
    label: body.label?.trim() ?? existing.label,
    value: body.value?.trim() ?? existing.value,
    isDefault: body.isDefault !== undefined ? (body.isDefault ? 1 : 0) : existing.isDefault,
    mode: body.mode ?? existing.mode,
  }).where(eq(convocationModalityOption.id, id)).run();

  const updated = await db.select().from(convocationModalityOption).where(eq(convocationModalityOption.id, id)).get();
  return c.json(updated);
});

settingsRouter.delete('/modality-options/:id', async (c) => {
  const denied = await requirePermission(c, 'settings.manage');
  if (denied) return denied;

  const payload = c.get('jwtPayload');
  const { id } = c.req.param();
  const db = drizzle(c.env.DB);

  const existing = await db.select().from(convocationModalityOption)
    .where(and(eq(convocationModalityOption.id, id), eq(convocationModalityOption.orgId, payload.orgId)))
    .get();
  if (!existing) return c.json({ error: 'Not found' }, 404);

  await db.delete(convocationModalityOption).where(eq(convocationModalityOption.id, id)).run();
  return c.json({ success: true });
});

// User preferences (theme)
const KNOWN_THEMES = ['dark-slate', 'beige-blue-light'];

settingsRouter.get('/user-preferences', async (c) => {
  const payload = c.get('jwtPayload');
  const db = drizzle(c.env.DB);

  const prefs = await db
    .select()
    .from(userSetting)
    .where(eq(userSetting.userId, payload.sub))
    .get();

  return c.json({ theme: prefs?.theme ?? 'dark-slate' });
});

settingsRouter.put('/user-preferences', async (c) => {
  const payload = c.get('jwtPayload');
  const { theme } = await c.req.json<{ theme: string }>();

  if (!theme || typeof theme !== 'string') {
    return c.json({ error: 'theme is required' }, 400);
  }

  const isKnownKey = KNOWN_THEMES.includes(theme);
  const isCustomJson = (() => {
    try {
      const parsed = JSON.parse(theme);
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed);
    } catch {
      return false;
    }
  })();

  if (!isKnownKey && !isCustomJson) {
    return c.json({ error: 'Invalid theme value' }, 400);
  }

  const db = drizzle(c.env.DB);
  const now = new Date().toISOString();
  const existing = await db
    .select()
    .from(userSetting)
    .where(eq(userSetting.userId, payload.sub))
    .get();

  if (existing) {
    await db
      .update(userSetting)
      .set({ theme, updatedAt: now })
      .where(eq(userSetting.userId, payload.sub))
      .run();
  } else {
    await db
      .insert(userSetting)
      .values({
        id: crypto.randomUUID(),
        userId: payload.sub,
        theme,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }

  return c.json({ theme });
});

export default settingsRouter;
