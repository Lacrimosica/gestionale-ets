import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Mirror wrangler's Text rule so modules importing .sql files work under test.
  plugins: [
    {
      name: 'sql-as-text',
      transform(code, id) {
        if (id.endsWith('.sql')) return { code: `export default ${JSON.stringify(code)};`, map: null };
      },
    },
  ],
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    // beforeEach boots Miniflare and replays every migration; under a parallel full
    // run that can exceed vitest's 10s hook default and fail an unrelated test.
    hookTimeout: 30000,
    setupFiles: [],
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/api-collections/**'],
  },
});
