import { Miniflare } from 'miniflare';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../src/db/schema';

let mf: Miniflare | null = null;
let db: ReturnType<typeof drizzle> | null = null;

export async function initializeMiniflare(deploymentMode: 'single_org' | 'open' | 'invite_only' | 'closed' = 'open') {
  if (mf) {
    throw new Error('Miniflare already initialized. Call cleanupMiniflare() first.');
  }

  mf = new Miniflare({
    script: '',
    kvNamespaces: [],
    d1Databases: ['DB'],
    d1Persist: '.wrangler/state/v3/d1/test',
    env: {
      DEPLOYMENT_MODE: deploymentMode,
      GOOGLE_CLIENT_ID: 'test-client-id',
      GOOGLE_CLIENT_SECRET: 'test-client-secret',
      JWT_SECRET: 'test-jwt-secret-min-32-characters-long!!',
      CORS_ORIGIN: 'http://localhost:5173',
      GOOGLE_REDIRECT_BASE_URL: 'http://localhost:8787',
    },
  });

  const d1 = await mf.getD1Database('DB');
  db = drizzle(d1, { schema });

  return { mf, db };
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
  }
}
