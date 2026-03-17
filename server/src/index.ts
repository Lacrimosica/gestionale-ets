import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { peopleRouter } from './routes/people';
import periodsRouter from './routes/periods';
import { assembliesRouter } from './routes/assemblies';
import { generationsRouter } from './routes/generations';
import timelineRouter from './routes/timeline';
import { convocationsRouter } from './routes/convocations';
import authRouter from './routes/auth';
import settingsRouter from './routes/settings';
import complianceRouter from './routes/compliance';

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
  CORS_ORIGIN?: string;
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

// Protected routes middleware
app.use('/api/*', async (c, next) => {
  if (c.req.path.startsWith('/api/auth') || c.req.path.startsWith('/api/settings/public')) return next();

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

app.route('/api/people', peopleRouter);
app.route('/api/periods', periodsRouter);
app.route('/api/assemblies', assembliesRouter);
app.route('/api/generations', generationsRouter);
app.route('/api/timeline', timelineRouter);
app.route('/api/convocations', convocationsRouter);
app.route('/api/settings', settingsRouter);
app.route('/api/compliance', complianceRouter);

export default app;
