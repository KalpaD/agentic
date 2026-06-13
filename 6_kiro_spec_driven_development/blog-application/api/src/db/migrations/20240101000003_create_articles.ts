import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('articles', (table) => {
    table
      .specificType('id', 'UUID')
      .primary()
      .defaultTo(knex.raw('gen_random_uuid()'));
    table
      .specificType('user_id', 'UUID')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.string('title', 200).notNullable().defaultTo('');
    table
      .specificType('body', 'JSONB')
      .notNullable()
      .defaultTo(knex.raw(`'{"type":"doc","content":[]}'::jsonb`));
    table
      .string('status', 20)
      .notNullable()
      .defaultTo('draft')
      .checkIn(['draft', 'published'], 'articles_status_check');
    table
      .specificType('created_at', 'TIMESTAMPTZ')
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .specificType('updated_at', 'TIMESTAMPTZ')
      .notNullable()
      .defaultTo(knex.fn.now());
  });

  // Index for efficient per-user article listing sorted by updated_at
  await knex.schema.raw(
    'CREATE INDEX idx_articles_user_updated ON articles (user_id, updated_at DESC)'
  );

  // Trigger to automatically update updated_at on every UPDATE
  await knex.schema.raw(`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.schema.raw(`
    CREATE TRIGGER articles_updated_at
    BEFORE UPDATE ON articles
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.raw('DROP TRIGGER IF EXISTS articles_updated_at ON articles');
  await knex.schema.raw('DROP FUNCTION IF EXISTS set_updated_at');
  await knex.schema.raw('DROP INDEX IF EXISTS idx_articles_user_updated');
  await knex.schema.dropTable('articles');
}
