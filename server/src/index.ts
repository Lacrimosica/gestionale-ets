import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import { organizationUser } from './db/schema';
import { peopleRouter } from './routes/people';
import periodsRouter from './routes/periods';
import { assembliesRouter } from './routes/assemblies';
import { generationsRouter } from './routes/generations';
import timelineRouter from './routes/timeline';
import { convocationsRouter } from './routes/convocations';
import authRouter from './routes/auth';
import setupRouter from './routes/setup';
import settingsRouter from './routes/settings';
import complianceRouter from './routes/compliance';
import documentsRouter from './routes/documents';
import exportRouter from './routes/export';
import importRouter from './routes/import';

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
  CORS_ORIGIN?: string;
  DEPLOYMENT_MODE?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_BASE_URL?: string; // e.g. http://localhost:8787 (must match Google Cloud Console redirect URI)
  APP_URL?: string;                   // e.g. http://localhost:5173 (frontend origin for post-OAuth redirects)
  TEMPLATE_FOLDER_ID: string;
  OUTPUT_FOLDER_ID: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Gestionale ETS API</title>
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                height: 100vh; 
                margin: 0; 
                background-color: #f4f7f6;
                color: #333;
            }
            .container { 
                text-align: center; 
                padding: 2rem; 
                background: white; 
                border-radius: 8px; 
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            h1 { color: #2c3e50; margin-bottom: 0.5rem; }
            p { color: #7f8c8d; }
            .status { 
                display: inline-block; 
                padding: 0.25rem 0.75rem; 
                border-radius: 20px; 
                background-color: #2ecc71; 
                color: white; 
                font-weight: bold;
                font-size: 0.8rem;
                margin-top: 1rem;
            }
            a { color: #3498db; text-decoration: none; font-size: 0.9rem; }
            a:hover { text-decoration: underline; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Gestionale ETS API</h1>
            <p>The backend server is operational.</p>
            <div class="status">SYSTEM ONLINE</div>
            <div style="margin-top: 1.5rem;">
                <a href="/health">Check Health Status</a>
            </div>
        </div>
    </body>
    </html>
  `);
});

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: c.env.CORS_ORIGIN ? 'production' : 'development'
  });
});

// Basic CORS setup - Restricted to specific origin in production
app.use('*', async (c, next) => {
  const corsMiddleware = cors({
    origin: c.env.CORS_ORIGIN || '*', // Fallback to * for dev, but recommend setting CORS_ORIGIN
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
  });
  return corsMiddleware(c, next);
});

// Authentication routes (Public)
app.route('/api/auth', authRouter);
app.route('/api/setup', setupRouter);

// Protected routes middleware — skip JWT for public auth/setup endpoints
app.use('/api/*', async (c, next) => {
  const path = c.req.path;
  // Skip JWT for public endpoints: auth (login/Google), setup, and public settings
  const isPublic = path.startsWith('/api/auth') || path.startsWith('/api/setup') || path.startsWith('/api/settings/public');
  if (isPublic) return next();

  if (!c.env.JWT_SECRET) {
    console.error('JWT_SECRET is not defined in environment variables');
    return c.json({ error: 'Internal Server Error (Auth Configuration)' }, 500);
  }

  const jwtMiddleware = jwt({
    secret: c.env.JWT_SECRET,
    alg: 'HS256'
  });

  return jwtMiddleware(c, next);
});

// Session validation middleware — verify user and org still exist in DB
app.use('/api/*', async (c, next) => {
  const path = c.req.path;
  // Skip validation for public endpoints
  const isPublic = path.startsWith('/api/auth') || path.startsWith('/api/setup') || path.startsWith('/api/settings/public');
  if (isPublic) return next();

  const payload = c.get('jwtPayload') as {
    sub: string;
    orgId: string;
    role: string;
    permissions: string[];
    exp: number;
  } | undefined;

  if (!payload?.sub || !payload?.orgId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const db = drizzle(c.env.DB);
  const membership = await db
    .select({ id: organizationUser.id })
    .from(organizationUser)
    .where(
      and(
        eq(organizationUser.userId, payload.sub),
        eq(organizationUser.orgId, payload.orgId),
      ),
    )
    .get();

  if (!membership) {
    return c.json({ error: 'Session invalid: user or organization no longer exists' }, 401);
  }

  return next();
});

app.route('/api/people', peopleRouter);
app.route('/api/periods', periodsRouter);
app.route('/api/assemblies', assembliesRouter);
app.route('/api/generations', generationsRouter);
app.route('/api/timeline', timelineRouter);
app.route('/api/convocations', convocationsRouter);
app.route('/api/settings', settingsRouter);
app.route('/api/compliance', complianceRouter);
app.route('/api/documents', documentsRouter);
app.route('/api/export', exportRouter);
app.route('/api/import', importRouter);

export default app;
