import knex, { Knex } from 'knex';

const TEST_DB_NAME = 'blog_test';

function buildUrl(database: string): string {
  // Allow override (e.g. when running outside Docker) but default to the
  // Compose-internal connection string used by the api service.
  const base = process.env.TEST_DATABASE_BASE_URL || 'postgres://blog:blog@db:5432';
  return `${base}/${database}`;
}

async function withAdmin<T>(fn: (admin: Knex) => Promise<T>): Promise<T> {
  const admin = knex({ client: 'pg', connection: buildUrl('postgres') });
  try {
    return await fn(admin);
  } finally {
    await admin.destroy();
  }
}

/**
 * Drops and recreates the test database, then returns a Knex instance
 * pointed at it (migrations not yet applied — caller decides when to run them).
 */
export async function setupTestDb(): Promise<Knex> {
  await withAdmin(async (admin) => {
    // Terminate any lingering connections to the test DB so DROP succeeds.
    await admin.raw(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
       WHERE datname = ? AND pid <> pg_backend_pid()`,
      [TEST_DB_NAME],
    );
    await admin.raw(`DROP DATABASE IF EXISTS ${TEST_DB_NAME}`);
    await admin.raw(`CREATE DATABASE ${TEST_DB_NAME}`);
  });

  return knex({
    client: 'pg',
    connection: buildUrl(TEST_DB_NAME),
    migrations: { directory: './src/db/migrations', extension: 'ts' },
    seeds: { directory: './src/db/seeds', extension: 'ts' },
  });
}

export async function teardownTestDb(db: Knex): Promise<void> {
  await db.destroy();
  await withAdmin(async (admin) => {
    await admin.raw(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
       WHERE datname = ? AND pid <> pg_backend_pid()`,
      [TEST_DB_NAME],
    );
    await admin.raw(`DROP DATABASE IF EXISTS ${TEST_DB_NAME}`);
  });
}

export async function listTables(db: Knex): Promise<string[]> {
  const rows = await db.raw<{ rows: { table_name: string }[] }>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name NOT LIKE 'knex_%'`,
  );
  return rows.rows.map((r) => r.table_name).sort();
}

export async function indexExists(db: Knex, indexName: string): Promise<boolean> {
  const rows = await db.raw<{ rows: { indexname: string }[] }>(
    `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname = ?`,
    [indexName],
  );
  return rows.rows.length > 0;
}
