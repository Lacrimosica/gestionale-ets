import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId: 'PLACEHOLDER', // This is used for remote, for local it works via wrangler
    databaseId: 'PLACEHOLDER',
    token: 'PLACEHOLDER',
  }
});
