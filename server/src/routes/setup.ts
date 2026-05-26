import { Hono } from 'hono';
import { sign, verify } from 'hono/jwt';
import { drizzle } from 'drizzle-orm/d1';
import { eq, count } from 'drizzle-orm';
import { hashPassword, verifyPassword } from '../lib/auth';
import { parseDeploymentMode, canCreateOrg, type DeploymentMode, getOrganizationSettingId } from '../lib/deployment-mode';
import { organization, organizationUser, user, organizationSetting, invite, auditEvent } from '../db/schema';

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
  DEPLOYMENT_MODE?: string;
};

const setupRouter = new Hono<{ Bindings: Bindings }>();

// ─── GET /api/setup/status ────────────────────────────────────────────────────
// Check setup status and return deployment mode info
setupRouter.get('/status', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const result = await db.select({ cnt: count() }).from(organization).where(eq(organization.isSetupComplete, 1));
    const completedOrgCount = result[0]?.cnt ?? 0;
    const needsSetup = completedOrgCount === 0;
    const deploymentMode = parseDeploymentMode(c.env.DEPLOYMENT_MODE);

    return c.json({
      needsSetup,
      deploymentMode,
      orgCount: completedOrgCount
    });
  } catch (error) {
    console.error('Error checking setup status:', error);
    return c.json({ error: 'Server error' }, 500);
  }
});

// ─── GET /api/setup/token ─────────────────────────────────────────────────────
// Issue a short-lived setup session token (required for POST /api/setup)
// Used for CSRF protection
setupRouter.get('/token', async (c) => {
  try {
    const deploymentMode = parseDeploymentMode(c.env.DEPLOYMENT_MODE);
    if (deploymentMode === 'closed') {
      return c.json({ error: 'Organization creation is disabled.' }, 423);
    }

    const JWT_SECRET = c.env.JWT_SECRET;
    if (!JWT_SECRET) {
      return c.json({ error: 'Server authentication misconfigured' }, 500);
    }

    const setupToken = await sign(
      {
        type: 'setup_session',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 30 * 60 // 30 minutes
      },
      JWT_SECRET
    );

    return c.json({ setupToken });
  } catch (error) {
    console.error('Error issuing setup token:', error);
    return c.json({ error: 'Server error' }, 500);
  }
});

// ─── POST /api/setup ──────────────────────────────────────────────────────────
// Create an organization and admin user. Guarded by deployment mode and rate limiting.
setupRouter.post('/', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const JWT_SECRET = c.env.JWT_SECRET;

    if (!JWT_SECRET) {
      return c.json({ error: 'Server authentication misconfigured' }, 500);
    }

    // ─ CSRF: Verify setup session token ─
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid setup token' }, 401);
    }

    const setupToken = authHeader.substring(7);
    let tokenPayload: any;
    try {
      tokenPayload = await verify(setupToken, JWT_SECRET, 'HS256');
      
      if (tokenPayload.type !== 'setup_session') {
        return c.json({ error: 'Invalid setup token type' }, 401);
      }
    } catch (err) {
      console.error('Setup token verification failed:', err);
      return c.json({ error: 'Invalid or expired setup token' }, 401);
    }

    // ─ Rate limiting disabled for development ─
    const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';

    // ─ Deployment mode check ─
    const deploymentMode = parseDeploymentMode(c.env.DEPLOYMENT_MODE);
    // completeOrgCount 
    const completedOrgCount = (await db.select({ cnt: count() }).from(organization).where(eq(organization.isSetupComplete, 1)))[0]?.cnt ?? 0;

    const body = await c.req.json() as {
      orgName?: string;
      shortName?: string;
      slug?: string;
      authDomain?: string;
      domainSignupMode?: string;
      adminEmail?: string;
      adminPassword?: string;
      googleToken?: string;
      orgCreationToken?: string;
    };

    const { orgName, shortName, slug, authDomain, domainSignupMode, adminEmail, adminPassword, googleToken, orgCreationToken } = body;

    // Check if org creation is allowed
    const hasOrgCreationToken = orgCreationToken ? true : false;
    const canCreate = canCreateOrg(deploymentMode, completedOrgCount, hasOrgCreationToken);

    if (!canCreate) {
      if (deploymentMode === 'closed') {
        return c.json({ error: 'Organization creation is disabled.' }, 423);
      }
      if (deploymentMode === 'single_org' && completedOrgCount > 0) {
        return c.json({ error: 'Setup già completato.' }, 409);
      }
      if (deploymentMode === 'invite_only' && completedOrgCount > 0 && !hasOrgCreationToken) {
        return c.json({ error: 'A valid org-creation invite is required to create additional organizations.' }, 403);
      }
      return c.json({ error: 'Organization creation is not allowed.' }, 403);
    }

    // If using org-creation invite, validate and mark as used
    if (hasOrgCreationToken && completedOrgCount > 0 && orgCreationToken) {
      const inviteRecord = await db
        .select()
        .from(invite)
        .where(eq(invite.token, orgCreationToken))
        .get();

      if (!inviteRecord) {
        return c.json({ error: 'Invalid org-creation token.' }, 403);
      }

      if (inviteRecord.usedAt) {
        return c.json({ error: 'This org-creation token has already been used.' }, 403);
      }

      const now = new Date();
      if (new Date(inviteRecord.expiresAt) < now) {
        return c.json({ error: 'This org-creation token has expired.' }, 403);
      }

      // Token is valid; will mark as used after org creation
      // (orgCreationToken is guaranteed to be defined here due to hasOrgCreationToken check)
    }

    // ─ Validate required fields ─
    if (!orgName || !shortName || !slug || !adminEmail) {
      return c.json({ error: 'Tutti i campi obbligatori devono essere compilati.' }, 400);
    }

    // Google token flow: no password required; standard flow requires password
    if (!googleToken && !adminPassword) {
      return c.json({ error: 'Either password or googleToken must be provided.' }, 400);
    }

    // Validate password if provided
    if (adminPassword && adminPassword.length < 8) {
      return c.json({ error: 'La password deve essere di almeno 8 caratteri.' }, 400);
    }

    // ─ Validate slug uniqueness ─
    const existingSlug = await db.select().from(organization).where(eq(organization.slug, slug)).get();
    if (existingSlug) {
      console.error(`Slug conflict: "${slug}" already exists`);
      return c.json({ error: 'Questo slug è già in uso.' }, 409);
    }

    // ─ Validate domain uniqueness if provided ─
    if (authDomain) {
      const existingDomain = await db.select().from(organization).where(eq(organization.authDomain, authDomain)).get();
      if (existingDomain) {
        console.error(`Domain conflict: "${authDomain}" already exists`);
        return c.json({ error: "Questo dominio è già in uso da un'altra organizzazione." }, 409);
      }
    }

    // ─ Validate email not already registered ─
    const existingUser = await db.select().from(user).where(eq(user.email, adminEmail)).get();
    if (existingUser) {
      console.error(`Email already registered: "${adminEmail}"`);
      return c.json({ error: 'Questo indirizzo email è già registrato.' }, 409);
    }

    // ─ Hash password (or null for Google-only users) ─
    let passwordHash: string | null = null;
    if (adminPassword) {
      passwordHash = await hashPassword(adminPassword);
    }

    // ─ Generate IDs ─
    const orgId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    const orgUserId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Core admin permissions
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

    // ─ Insert organization ─
    try {
      await db.insert(organization).values({
        id: orgId,
        name: orgName,
        shortName: shortName,
        slug: slug,
        authDomain: authDomain || null,
        domainSignupMode: domainSignupMode || 'invite_only',
        isSetupComplete: 1,
        createdAt: now
      });
    } catch (err: any) {
      console.error(`Organization insert failed:`, err.message, err);
      if (err.message && err.message.includes('UNIQUE')) {
        return c.json({ error: 'Organization already exists (concurrent creation detected).' }, 409);
      }
      throw err;
    }

    // ─ Insert user ─
    let googleId: string | null = null;
    if (googleToken) {
      try {
        const googlePayload = await verify(googleToken, JWT_SECRET, 'HS256') as any;
        if (googlePayload.type !== 'google_setup') {
          return c.json({ error: 'Invalid google token' }, 400);
        }
        googleId = (googlePayload.googleId as string | undefined) || null;
      } catch (err) {
        console.error('Google token verification failed:', err);
        return c.json({ error: 'Invalid or expired google token' }, 400);
      }
    }

    await db.insert(user).values({
      id: userId,
      email: adminEmail,
      password: passwordHash,
      googleId: googleId,
      createdAt: now,
      updatedAt: now
    });

    // ─ Insert organization_user ─
    await db.insert(organizationUser).values({
      id: orgUserId,
      userId: userId,
      orgId: orgId,
      role: 'core_admin',
      permissions: JSON.stringify(coreAdminPermissions),
      isOwner: 1,
      joinedAt: now,
      invitedByUserId: null
    });

    // ─ Insert organization_setting ─
    await db.insert(organizationSetting).values({
      id: getOrganizationSettingId(orgId),
      complianceRules: null,
      city: null,
      statuteArticleConvocation: null,
      statuteArticleProxies: null,
      statuteArticleMembers: null,
      statuteArticleBoardVote: null,
      statuteArticleBoardElection: null,
      maxProxies: null,
      outputFolderId: null,
      templateConvocationId: null,
      templateMinutes1aId: null,
      templateMinutes2aId: null,
      templateConvocationExtraordinaryStatuteId: null,
      templateConvocationExtraordinaryDissolutionId: null,
      templateConvocationBoardId: null,
      templateMinutesBoardId: null,
      varieDefaultText: null,
      miscellaneousDefaultText: null,
      orgId: orgId,
      createdAt: now,
      updatedAt: now
    });

    // ─ Mark org-creation invite as used (if applicable) ─
    if (hasOrgCreationToken && completedOrgCount > 0 && orgCreationToken) {
      try {
        await db
          .update(invite)
          .set({
            usedAt: now,
            usedByUserId: userId
          })
          .where(eq(invite.token, orgCreationToken))
          .run();
      } catch (err) {
        console.error('Failed to mark org-creation invite as used:', err);
        // Don't fail the entire setup; the org was created successfully
      }
    }

    // ─ Audit log ─
    try {
      await db.insert(auditEvent).values({
        id: crypto.randomUUID(),
        eventType: 'org_created',
        actorId: userId,
        orgId: orgId,
        payload: JSON.stringify({ orgName, shortName, slug, mode: deploymentMode }),
        ip: clientIp,
        createdAt: now
      });
    } catch (err) {
      console.warn('Failed to create audit event:', err);
      // Fire and forget
    }

    // ─ Create JWT for immediate login ─
    const jwtPayload = {
      sub: userId,
      email: adminEmail,
      orgId: orgId,
      role: 'core_admin',
      permissions: coreAdminPermissions,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 // 24 hours
    };

    const token = await sign(jwtPayload, JWT_SECRET);

    return c.json({
      token,
      user: {
        id: userId,
        email: adminEmail,
        orgId: orgId,
        role: 'core_admin',
        permissions: coreAdminPermissions
      }
    });
  } catch (error: any) {
    console.error('Setup error:', error);

    // Check for specific SQLite errors
    if (error.message && error.message.includes('UNIQUE')) {
      console.error('UNIQUE constraint violation details:', error.message);
      if (error.message.includes('slug')) {
        return c.json({ error: 'Questo slug è già in uso.' }, 409);
      }
      if (error.message.includes('authDomain')) {
        return c.json({ error: "Questo dominio è già in uso da un'altra organizzazione." }, 409);
      }
      return c.json({ error: 'Organization already exists (concurrent creation detected).' }, 409);
    }

    return c.json({ error: 'Setup failed. Please try again.' }, 500);
  }
});

export default setupRouter;
