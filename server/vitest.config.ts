import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    setupFiles: [],
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/api-collections/**'],
  },
});
