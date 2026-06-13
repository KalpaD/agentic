import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('article_images', (table) => {
    table
      .specificType('id', 'UUID')
      .primary()
      .defaultTo(knex.raw('gen_random_uuid()'));
    table
      .specificType('article_id', 'UUID')
      .nullable()
      .references('id')
      .inTable('articles')
      .onDelete('SET NULL');
    table
      .specificType('user_id', 'UUID')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.string('storage_key', 512).notNullable();
    table.text('url').notNullable();
    table.bigInteger('size_bytes').notNullable();
    table.string('mime_type', 64).notNullable();
    table
      .specificType('uploaded_at', 'TIMESTAMPTZ')
      .notNullable()
      .defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('article_images');
}
