import { defineConfig } from 'drizzle-kit';

const env = process.env.ENVIRONMENT || process.env.NODE_ENV || 'dev';
const migrationsDir = env === 'production' ? './drizzle/migrations/prod' :
                      env === 'staging' ? './drizzle/migrations/staging' :
                      './drizzle/migrations/dev';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: migrationsDir,
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId: 'PLACEHOLDER', // This is used for remote, for local it works via wrangler
    databaseId: 'PLACEHOLDER',
    token: 'PLACEHOLDER',
  }
});
