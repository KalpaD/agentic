import type { Knex } from 'knex';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export async function seed(knex: Knex): Promise<void> {
  // Remove existing test users (cascades to articles, tokens, images)
  await knex('users').whereIn('username', ['alice', 'bob']).delete();

  const [aliceHash, bobHash] = await Promise.all([
    bcrypt.hash('password123', SALT_ROUNDS),
    bcrypt.hash('password123', SALT_ROUNDS),
  ]);

  await knex('users').insert([
    { username: 'alice', password_hash: aliceHash },
    { username: 'bob', password_hash: bobHash },
  ]);
}
