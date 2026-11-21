import { Hono } from 'hono';
import { sign, verify } from 'hono/jwt';
import { drizzle } from 'drizzle-orm/d1';
import { user as userSchema, organizationSetting as organizationSettingSchema, organization, organizationUser, invite } from '../db/schema';
import { and, eq, isNull } from 'drizzle-orm';

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_BASE_URL?: string;
  APP_URL?: string;
  AUTH_RATE_LIMITER?: RateLimiter;
};

const authRouter = new Hono<{ Bindings: Bindings }>();

import { getPermissionsForRole, sessionPermissions } from '../lib/session-permissions';

import { hashPassword, verifyPassword } from '../lib/auth';
import { decodeGoogleIdToken, rejectGoogleIdentity } from '../lib/google-identity';
import { rejectGrant } from '../lib/roles';
import { clientIp, isRateLimited, rateLimitByIp, tooManyRequests, type RateLimiter } from '../lib/rate-limit';

/** An OAuth callback failure whose message is safe to show the user. */
class OAuthUserError extends Error {}

// A valid "salt:hash" that no password matches; verified against when the user is unknown.
const DUMMY_PASSWORD_HASH = 'AAAAAAAAAAAAAAAAAAAAAA==:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

authRouter.post('/login', async (c) => {
  const { email, password, slug } = await c.req.json() as { email: string; password: string; slug?: string };

  // Per IP stops one client guessing many accounts; per email stops a botnet
  // spreading guesses for one account across many IPs.
  const emailKey = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (await isRateLimited(c.env.AUTH_RATE_LIMITER, [`login:ip:${clientIp(c)}`, `login:email:${emailKey}`])) {
    return tooManyRequests(c);
  }

  const db = drizzle(c.env.DB);
  const user = await db.select().from(userSchema).where(eq(userSchema.email, email)).get();

  // Always run the PBKDF2 check so response time doesn't reveal whether the email exists.
  const passwordOk = await verifyPassword(password ?? '', user?.password ?? DUMMY_PASSWORD_HASH);
  if (!user || !user.password || !passwordOk) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  // Determine which organization to authenticate for
  // Priority: 1) slug param, 2) email domain match, 3) first org user belongs to
  let org = null;
  let orgUser = null;

  if (slug) {
    const foundOrg = await db.select().from(organization).where(eq(organization.slug, slug)).get();
    if (foundOrg) {
      org = foundOrg;
      orgUser = await db.select().from(organizationUser)
        .where(and(eq(organizationUser.userId, user.id), eq(organizationUser.orgId, foundOrg.id)))
        .get();
    }
  }

  // If no org found by slug, try email domain
  if (!org) {
    const emailDomain = email.split('@')[1];
    const foundOrg = await db.select().from(organization)
      .where(eq(organization.authDomain, emailDomain))
      .get();
    if (foundOrg) {
      org = foundOrg;
      orgUser = await db.select().from(organizationUser)
        .where(and(eq(organizationUser.userId, user.id), eq(organizationUser.orgId, foundOrg.id)))
        .get();
    }
  }

  // If still no org, get user's first organization
  if (!org) {
    orgUser = await db.select().from(organizationUser)
      .where(eq(organizationUser.userId, user.id))
      .get();
    if (orgUser) {
      org = await db.select().from(organization)
        .where(eq(organization.id, orgUser.orgId))
        .get();
    }
  }

  if (!org || !orgUser) {
    return c.json({ error: 'Nessun\'organizzazione trovata per questo account' }, 403);
  }

  const permissions = sessionPermissions(orgUser);

  const payload = {
    sub: user.id,
    email: user.email,
    orgId: org.id,
    role: orgUser.role,
    permissions,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 // 24 hours
  };

  if (!c.env.JWT_SECRET) {
    return c.json({ error: 'Server authentication misconfigured' }, 500);
  }

  const token = await sign(payload, c.env.JWT_SECRET);

  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      orgId: org.id,
      role: orgUser.role,
      permissions,
    },
  });
});

// ─── Google OAuth — Login ─────────────────────────────────────────────────────

// GET /api/auth/google — redirects user to Google consent screen (identity only)
authRouter.get('/google', async (c) => {
  const { GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_BASE_URL, JWT_SECRET } = c.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_BASE_URL) {
    return c.json({ error: 'Google login not configured' }, 503);
  }

  const inviteToken = c.req.query('inviteToken');

  const state = await sign(
    {
      type: 'login',
      inviteToken: inviteToken || null,
      exp: Math.floor(Date.now() / 1000) + 600
    },
    JWT_SECRET,
  );

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: `${GOOGLE_REDIRECT_BASE_URL}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });

  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// GET /api/auth/google/callback — Google redirects here after login consent
authRouter.get('/google/callback', async (c) => {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_BASE_URL, APP_URL, JWT_SECRET } = c.env;
  const appUrl = APP_URL ?? 'http://localhost:5173';
  const { code, state, error } = c.req.query();

  if (error || !code || !state) {
    return c.redirect(`${appUrl}/auth/callback?error=${encodeURIComponent(error ?? 'cancelled')}`);
  }

  try {
    // Verify state is a valid signed JWT we issued
    const statePayload = await verify(state, JWT_SECRET, 'HS256') as { type?: string; inviteToken?: string };
    // Every token type shares JWT_SECRET, so reject anything that isn't a login state.
    if (statePayload.type !== 'login') throw new OAuthUserError('Invalid sign-in request. Please try again.');
    const inviteToken = statePayload.inviteToken;

    // Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${GOOGLE_REDIRECT_BASE_URL}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      console.error('Google login token exchange failed:', tokenRes.status, await tokenRes.text());
      throw new OAuthUserError('Google sign-in failed. Please try again.');
    }

    const { id_token } = await tokenRes.json<{ id_token: string }>();

    const claims = decodeGoogleIdToken(id_token);
    const { email, sub: googleId } = claims;

    const db = drizzle(c.env.DB);
    let existingUser = await db.select().from(userSchema).where(eq(userSchema.email, email)).get();

    const identityError = rejectGoogleIdentity(claims, existingUser);
    if (identityError) {
      return c.redirect(`${appUrl}/auth/callback?error=${encodeURIComponent(identityError)}`);
    }
    let inviteRecord = null;
    let targetOrgId = null;
    let targetRole = 'viewer';
    let targetPermissions = null;
    let invitedByUserId = null;

    if (inviteToken) {
      try {
        inviteRecord = await db.select().from(invite).where(eq(invite.token, inviteToken)).get();

        if (!inviteRecord) {
          return c.redirect(`${appUrl}/auth/callback?error=${encodeURIComponent('Invite not found')}`);
        }

        // Check if already used
        if (inviteRecord.usedAt) {
          return c.redirect(`${appUrl}/auth/callback?error=${encodeURIComponent('Invite already used')}`);
        }

        // Check if expired
        const now = new Date();
        if (new Date(inviteRecord.expiresAt) < now) {
          return c.redirect(`${appUrl}/auth/callback?error=${encodeURIComponent('Invite expired')}`);
        }

        // If targeted invite, verify email matches
        if (inviteRecord.email && inviteRecord.email !== email) {
          return c.redirect(
            `${appUrl}/auth/callback?error=${encodeURIComponent('Email does not match invite recipient')}`,
          );
        }

        // Claim the invite before writing anything: the conditional update succeeds
        // for exactly one request, so two concurrent callbacks cannot both redeem it.
        const claimed = await db
          .update(invite)
          .set({ usedAt: new Date().toISOString(), usedByUserId: existingUser?.id ?? null })
          .where(and(eq(invite.id, inviteRecord.id), isNull(invite.usedAt)))
          .returning({ id: invite.id });
        if (claimed.length !== 1) {
          return c.redirect(`${appUrl}/auth/callback?error=${encodeURIComponent('Invite already used')}`);
        }

        targetOrgId = inviteRecord.orgId;
        targetRole = inviteRecord.role;
        targetPermissions = inviteRecord.permissionsOverride;
        invitedByUserId = inviteRecord.createdByUserId;
      } catch (inviteErr) {
        console.error('Invite validation error:', inviteErr);
        return c.redirect(`${appUrl}/auth/callback?error=${encodeURIComponent('Invalid invite token')}`);
      }
    }

    if (!existingUser) {
      // If no invite and user not found, check if we can auto-create
      if (!inviteToken) {
        // Self-signup by email domain: only into the org that owns this domain, and
        // only when that org chose 'open'. 'invite_only' (the default) and 'disabled'
        // mean domain users still need an invite.
        const emailDomain = email.split('@')[1]?.toLowerCase() ?? '';
        const domainOrg = emailDomain
          ? await db.select().from(organization).where(eq(organization.authDomain, emailDomain)).get()
          : undefined;

        if (!domainOrg || domainOrg.domainSignupMode !== 'open') {
          return c.redirect(
            `${appUrl}/auth/callback?error=${encodeURIComponent('Account non trovato. Contattare l\'amministratore per creare il tuo account.')}`,
          );
        }

        targetOrgId = domainOrg.id;
      }

      // Create user
      const newUserId = crypto.randomUUID();
      await db
        .insert(userSchema)
        .values({
          id: newUserId,
          email,
          password: null,
          googleId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .run();

      // Create organization_user entry
      const permissions = targetPermissions
        ? JSON.parse(targetPermissions)
        : getPermissionsForRole(targetRole);

      await db
        .insert(organizationUser)
        .values({
          id: crypto.randomUUID(),
          userId: newUserId,
          orgId: targetOrgId!,
          role: targetRole,
          permissions: JSON.stringify(permissions),
          isOwner: 0,
          joinedAt: new Date().toISOString(),
          invitedByUserId: invitedByUserId || null,
        })
        .run();

      existingUser = await db.select().from(userSchema).where(eq(userSchema.id, newUserId)).get();
    } else if (inviteToken) {
      // Existing user redeeming an invite — add to org if not already member
      const existingMembership = await db.select().from(organizationUser)
        .where(and(eq(organizationUser.userId, existingUser.id), eq(organizationUser.orgId, targetOrgId!)))
        .get();

      if (!existingMembership) {
        const permissions = targetPermissions
          ? JSON.parse(targetPermissions)
          : getPermissionsForRole(targetRole);

        await db
          .insert(organizationUser)
          .values({
            id: crypto.randomUUID(),
            userId: existingUser.id,
            orgId: targetOrgId!,
            role: targetRole,
            permissions: JSON.stringify(permissions),
            isOwner: 0,
            joinedAt: new Date().toISOString(),
            invitedByUserId: invitedByUserId || null,
          })
          .run();
      }
    }

    // The invite was claimed above, before the user existed for new sign-ups.
    if (inviteRecord && existingUser) {
      await db.update(invite).set({ usedByUserId: existingUser.id }).where(eq(invite.id, inviteRecord.id)).run();
    }

    if (!existingUser) {
      return c.json({ error: 'Failed to create or find user' }, 500);
    }

    // Link Google ID to account if not already linked
    if (!existingUser.googleId) {
      await db
        .update(userSchema)
        .set({ googleId, updatedAt: new Date().toISOString() })
        .where(eq(userSchema.id, existingUser.id))
        .run();
    }

    // Check if user has a password (first Google login check)
    if (!existingUser.password) {
      // First Google login — generate a signed token for secure password reset
      const setPasswordToken = await sign(
        {
          type: 'set_password',
          email,
          exp: Math.floor(Date.now() / 1000) + 600 // 10 minutes
        },
        JWT_SECRET,
      );
      return c.redirect(
        `${appUrl}/set-password#token=${encodeURIComponent(setPasswordToken)}`,
      );
    }

    // Fetch user's organization membership (role/permissions now live in organization_user)
    let orgUser = await db.select().from(organizationUser)
      .where(eq(organizationUser.userId, existingUser.id))
      .get();

    // A user with no membership has been removed from their organization (or never
    // had one). Re-adding them anywhere would undo that removal, so refuse sign-in.
    if (!orgUser) {
      return c.redirect(
        `${appUrl}/auth/callback?error=${encodeURIComponent('Nessun\'organizzazione trovata per questo account')}`,
      );
    }

    if (orgUser.isOwner && orgUser.role !== 'core_admin') {
      // If user is marked as owner but doesn't have core_admin role, upgrade them
      // This handles migration cases where owners were reset to viewer
      const coreAdminPermissions = [
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
        'settings.users.view',
        'settings.users.manage',
        'settings.password.manage',
        'settings.users.reset_password',
      ];

      await db
        .update(organizationUser)
        .set({
          role: 'core_admin',
          permissions: JSON.stringify(coreAdminPermissions),
        })
        .where(eq(organizationUser.id, orgUser.id))
        .run();

      orgUser = await db.select().from(organizationUser)
        .where(eq(organizationUser.id, orgUser.id))
        .get();
    }

    if (!orgUser) {
      return c.json({ error: 'Appartenenza organizzativa non trovata.' }, 500);
    }

    const orgRecord = await db.select().from(organization)
      .where(eq(organization.id, orgUser.orgId))
      .get();

    if (!orgRecord) {
      return c.json({ error: 'Organization not found' }, 500);
    }

    const permissions = sessionPermissions(orgUser);

    const jwtPayload = {
      sub: existingUser.id,
      email: existingUser.email,
      orgId: orgRecord.id,
      role: orgUser.role,
      permissions,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    };

    const token = await sign(jwtPayload, JWT_SECRET);
    const userOut = { id: existingUser.id, email: existingUser.email, orgId: orgRecord.id, role: orgUser.role, permissions };

    return c.redirect(
      // Fragment, not query: browsers never send it to servers or put it in Referer.
      `${appUrl}/auth/callback#token=${encodeURIComponent(token)}&user=${encodeURIComponent(JSON.stringify(userOut))}`,
    );
  } catch (err) {
    // Only messages written for users go back in the URL; anything else may carry
    // internals (Google responses, SQL errors), so it is logged and replaced.
    if (!(err instanceof OAuthUserError)) console.error('Google login callback failed:', err);
    const msg = err instanceof OAuthUserError ? err.message : 'Authentication failed';
    return c.redirect(`${appUrl}/auth/callback?error=${encodeURIComponent(msg)}`);
  }
});

// POST /api/auth/set-password — Set password after Google login (first login password gate)
authRouter.post('/set-password', rateLimitByIp('set-password'), async (c) => {
  try {
    const { token, password } = await c.req.json() as { token: string; password: string };
    const db = drizzle(c.env.DB);

    if (!token || !password) {
      return c.json({ error: 'Token e password sono obbligatori.' }, 400);
    }

    if (password.length < 8) {
      return c.json({ error: 'La password deve essere di almeno 8 caratteri.' }, 400);
    }

    // Verify the set-password token
    let tokenPayload;
    try {
      tokenPayload = await verify(token, c.env.JWT_SECRET, 'HS256') as any;
      if (tokenPayload.type !== 'set_password') {
        return c.json({ error: 'Token non valido.' }, 401);
      }
    } catch {
      return c.json({ error: 'Token scaduto o non valido.' }, 401);
    }

    // Extract email from the verified token (not from request body)
    const email = tokenPayload.email;
    const user = await db.select().from(userSchema).where(eq(userSchema.email, email)).get();
    if (!user) {
      return c.json({ error: 'Utente non trovato.' }, 404);
    }

    // Fetch organization_user to get role and org
    const orgUser = await db.select().from(organizationUser)
      .where(eq(organizationUser.userId, user.id))
      .get();

    if (!orgUser) {
      return c.json({ error: 'Appartenenza organizzativa non trovata.' }, 403);
    }

    const orgRecord = await db.select().from(organization)
      .where(eq(organization.id, orgUser.orgId))
      .get();

    if (!orgRecord) {
      return c.json({ error: 'Organizzazione non trovata.' }, 500);
    }

    // Only now, with membership confirmed: a user removed from their org must not set a password.
    const passwordHash = await hashPassword(password);
    await db
      .update(userSchema)
      .set({ password: passwordHash, updatedAt: new Date().toISOString() })
      .where(eq(userSchema.id, user.id))
      .run();

    const permissions = sessionPermissions(orgUser);

    const jwtPayload = {
      sub: user.id,
      email: user.email,
      orgId: orgRecord.id,
      role: orgUser.role,
      permissions,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    };

    const jwtToken = await sign(jwtPayload, c.env.JWT_SECRET);

    return c.json({
      token: jwtToken,
      user: { id: user.id, email: user.email, orgId: orgRecord.id, role: orgUser.role, permissions }
    });
  } catch (error) {
    console.error('Set password error:', error);
    return c.json({ error: 'Errore durante l\'impostazione della password.' }, 500);
  }
});

// ─── Google OAuth — Drive (incremental auth) ──────────────────────────────────
// Note: callback is public (no JWT), but uses signed state token to identify user.
// The "get Drive auth URL" endpoint is intentionally in documents.ts where JWT is enforced.

// GET /api/auth/google/drive/callback — Google redirects here after Drive consent
authRouter.get('/google/drive/callback', async (c) => {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_BASE_URL, APP_URL, JWT_SECRET } = c.env;
  const appUrl = APP_URL ?? 'http://localhost:5173';
  const { code, state, error } = c.req.query();

  if (error || !code || !state) {
    return c.redirect(`${appUrl}/auth/drive-callback?error=${encodeURIComponent(error ?? 'cancelled')}`);
  }

  try {
    const statePayload = await verify(state, JWT_SECRET, 'HS256') as { type: string; userId: string };
    if (statePayload.type !== 'drive' || !statePayload.userId) throw new OAuthUserError('Invalid authorization request. Please try again.');

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${GOOGLE_REDIRECT_BASE_URL}/api/auth/google/drive/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      console.error('Google Drive token exchange failed:', tokenRes.status, await tokenRes.text());
      throw new OAuthUserError('Google Drive authorization failed. Please try again.');
    }

    const { refresh_token, access_token, expires_in } = await tokenRes.json<{
      refresh_token?: string;
      access_token: string;
      expires_in: number;
    }>();

    if (!refresh_token) {
      // This can happen if the user already granted consent before — revoke at
      // https://myaccount.google.com/permissions and try again, or re-authorize.
      throw new OAuthUserError('No refresh token returned. Please revoke app access in your Google account and try again.');
    }

    const db = drizzle(c.env.DB);
    const expiry = new Date(Date.now() + expires_in * 1000).toISOString();

    await db
      .update(userSchema)
      .set({
        googleRefreshToken: refresh_token,
        googleAccessToken: access_token,
        googleTokenExpiry: expiry,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userSchema.id, statePayload.userId))
      .run();

    return c.redirect(`${appUrl}/auth/drive-callback?success=1`);
  } catch (err) {
    if (!(err instanceof OAuthUserError)) console.error('Google Drive callback failed:', err);
    const msg = err instanceof OAuthUserError ? err.message : 'Drive authorization failed';
    return c.redirect(`${appUrl}/auth/drive-callback?error=${encodeURIComponent(msg)}`);
  }
});

// ─── Invite System ────────────────────────────────────────────────────────────

// POST /api/auth/invites — Create an invite (protected, requires JWT)
authRouter.post('/invites', async (c) => {
  try {
    // Manually extract and verify JWT since /api/auth bypasses middleware
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.slice(7);
    let payload;
    try {
      payload = await verify(token, c.env.JWT_SECRET, 'HS256') as any;
    } catch {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }

    if (!payload || !payload.sub) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { email, role, permissionsOverride, orgId: requestOrgId } = await c.req.json() as {
      email?: string;
      role: string;
      permissionsOverride?: string[];
      orgId?: string;
    };

    if (!role) {
      return c.json({ error: 'Role is required' }, 400);
    }

    // Invites are always for the org of the caller's current session.
    const targetOrgId = payload.orgId as string | undefined;
    if (!targetOrgId || (requestOrgId && requestOrgId !== targetOrgId)) {
      return c.json({ error: 'Permission denied: must be admin in this organization' }, 403);
    }

    const db = drizzle(c.env.DB);

    // /api/auth skips the session middleware, so check membership here — and use the
    // role and permissions from the DB rather than the possibly stale JWT.
    const managerCheck = await db.select().from(organizationUser)
      .where(and(eq(organizationUser.userId, payload.sub), eq(organizationUser.orgId, targetOrgId)))
      .get();

    if (!managerCheck || !['core_admin', 'admin'].includes(managerCheck.role)) {
      return c.json({ error: 'Permission denied: must be admin in this organization' }, 403);
    }

    let managerPermissions: string[] = [];
    try {
      managerPermissions = managerCheck.permissions ? JSON.parse(managerCheck.permissions) : [];
    } catch {
      managerPermissions = [];
    }
    const grantError = rejectGrant(
      { role: managerCheck.role, permissions: managerPermissions.length ? managerPermissions : getPermissionsForRole(managerCheck.role) },
      role,
      permissionsOverride?.length ? permissionsOverride : undefined,
    );
    if (grantError) {
      return c.json({ error: grantError }, grantError === 'Invalid role' ? 400 : 403);
    }

    // Create invite token (signed JWT with type='invite')
    const inviteToken = await sign(
      {
        type: 'invite',
        inviteId: crypto.randomUUID(),
        exp: Math.floor(Date.now() / 1000) + 72 * 60 * 60, // 72 hours
      },
      c.env.JWT_SECRET,
    );

    // Store invite in database
    const inviteId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

    await db
      .insert(invite)
      .values({
        id: inviteId,
        orgId: targetOrgId,
        email: email || null,
        token: inviteToken,
        role,
        permissionsOverride: permissionsOverride ? JSON.stringify(permissionsOverride) : null,
        createdByUserId: payload.sub,
        expiresAt,
        createdAt: new Date().toISOString(),
      })
      .run();

    // Construct invite URL
    const appUrl = c.env.APP_URL ?? 'http://localhost:5173';
    const inviteUrl = `${appUrl}/join?token=${encodeURIComponent(inviteToken)}`;

    return c.json({
      id: inviteId,
      token: inviteToken,
      url: inviteUrl,
      email: email || null,
      role,
      expiresAt,
    });
  } catch (error) {
    console.error('Create invite error:', error);
    return c.json({ error: 'Failed to create invite' }, 500);
  }
});

// GET /api/auth/invites/:token — Validate and get invite details (public)
authRouter.get('/invites/:token', rateLimitByIp('invite-lookup'), async (c) => {
  try {
    const token = c.req.param('token');
    if (!token) {
      return c.json({ error: 'Token required' }, 400);
    }

    // Verify token is a valid signed JWT
    let tokenPayload;
    try {
      tokenPayload = await verify(token, c.env.JWT_SECRET, 'HS256') as any;
      if (tokenPayload.type !== 'invite') {
        return c.json({ error: 'Invalid token' }, 400);
      }
    } catch {
      return c.json({ error: 'Invalid or expired token' }, 400);
    }

    const db = drizzle(c.env.DB);
    const inviteRecord = await db.select().from(invite)
      .where(eq(invite.token, token))
      .get();

    if (!inviteRecord) {
      return c.json({ error: 'Invite not found' }, 404);
    }

    // Check if already used
    if (inviteRecord.usedAt) {
      return c.json({ error: 'Invite already used' }, 400);
    }

    // Check if expired
    const now = new Date();
    if (new Date(inviteRecord.expiresAt) < now) {
      return c.json({ error: 'Invite expired' }, 400);
    }

    // Get organization details
    const org = await db.select().from(organization)
      .where(eq(organization.id, inviteRecord.orgId))
      .get();

    if (!org) {
      return c.json({ error: 'Organization not found' }, 404);
    }

    return c.json({
      id: inviteRecord.id,
      orgId: inviteRecord.orgId,
      orgName: org.name,
      email: inviteRecord.email,
      role: inviteRecord.role,
      expiresAt: inviteRecord.expiresAt,
    });
  } catch (error) {
    console.error('Get invite error:', error);
    return c.json({ error: 'Failed to retrieve invite' }, 500);
  }
});

export default authRouter;
