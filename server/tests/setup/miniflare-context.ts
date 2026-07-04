import { Miniflare } from 'miniflare';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../src/db/schema';

let mf: Miniflare | null = null;
let db: ReturnType<typeof drizzle> | null = null;
let rawD1: D1Database | null = null;

export async function initializeMiniflare(deploymentMode: 'single_org' | 'open' | 'invite_only' | 'closed' = 'open') {
  if (mf) {
    throw new Error('Miniflare already initialized. Call cleanupMiniflare() first.');
  }

  mf = new Miniflare({
    // Miniflare v4 requires a module worker + compatibilityDate for the D1
    // internal bindings (cloudflare-internal:d1-api) to initialize. Tests query
    // D1 directly via getD1Database(), so this stub worker is never dispatched to.
    modules: true,
    script: 'export default { fetch() { return new Response(null, { status: 404 }); } };',
    compatibilityDate: '2026-03-17',
    kvNamespaces: [],
    d1Databases: ['DB'],
    // No d1Persist: each test file gets its own isolated in-memory D1. A shared
    // on-disk path caused SQLITE_BUSY lock contention under vitest's parallel runs.
    bindings: {
      DEPLOYMENT_MODE: deploymentMode,
      GOOGLE_CLIENT_ID: 'test-client-id',
      GOOGLE_CLIENT_SECRET: 'test-client-secret',
      JWT_SECRET: 'test-jwt-secret-min-32-characters-long!!',
      CORS_ORIGIN: 'http://localhost:5173',
      GOOGLE_REDIRECT_BASE_URL: 'http://localhost:8787',
    },
  });

  const d1 = await mf.getD1Database('DB');
  rawD1 = d1 as unknown as D1Database;
  db = drizzle(d1, { schema });

  return { mf, db };
}

/**
 * Raw D1 handle for executing arbitrary SQL strings (migrations, resets).
 * Drizzle's db.all()/db.run() expect SQL expression objects, not raw strings,
 * so schema setup goes through the raw binding instead.
 */
export function getMiniflareRawDB() {
  if (!rawD1) {
    throw new Error('Database not initialized. Call initializeMiniflare() first.');
  }
  return rawD1;
}

export function getMiniflareDB() {
  if (!db) {
    throw new Error('Database not initialized. Call initializeMiniflare() first.');
  }
  return db;
}

export function getMiniflare() {
  if (!mf) {
    throw new Error('Miniflare not initialized. Call initializeMiniflare() first.');
  }
  return mf;
}

export async function cleanupMiniflare() {
  if (mf) {
    await mf.dispose();
    mf = null;
    db = null;
    rawD1 = null;
  }
}
