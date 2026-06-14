import { defineConfig } from 'vitest/config';

// Integration test config — provisions a real Postgres database (blog_test) and
// exercises migrations, FK cascades, and seeds against it. Runs single-fork so
// tests sharing the test DB do not race.
export default defineConfig({
  test: {
    include: ['src/**/*.integration.test.ts'],
    setupFiles: ['./src/test/integration-setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
  },
});
