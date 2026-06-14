import { defineConfig } from 'vitest/config';

// Default vitest config (used by `make test`).
// Excludes *.integration.test.ts — those run only via `make test-integration`
// with vitest.integration.config.ts, which provisions a real Postgres test DB.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['src/**/*.integration.test.ts', 'node_modules/**', 'dist/**'],
  },
});
