import bcrypt from 'bcryptjs';
import { Knex } from 'knex';
import { describe, expect, it, vi } from 'vitest';
import { INVALID_CREDENTIALS, attemptLogin } from './login';

interface UserRow {
  id: string;
  username: string;
  password_hash: string;
}

// Tiny mock Knex: where({ username }).first() resolves to the row matching the
// stored username, or undefined. Just enough chain shape for attemptLogin.
function mockDb(users: UserRow[]): Knex {
  const builder = (table: string) => {
    if (table !== 'users') throw new Error(`unexpected table: ${table}`);
    return {
      where: (criteria: { username: string }) => ({
        first: () =>
          Promise.resolve(users.find((u) => u.username === criteria.username)),
      }),
    };
  };
  return builder as unknown as Knex;
}

describe('attemptLogin', () => {
  const aliceHash = bcrypt.hashSync('correct-horse-battery-staple', 4);
  const alice: UserRow = {
    id: 'u-alice',
    username: 'alice',
    password_hash: aliceHash,
  };

  it('returns ok with user info on valid credentials', async () => {
    const result = await attemptLogin(
      mockDb([alice]),
      'alice',
      'correct-horse-battery-staple',
    );
    expect(result).toEqual({ ok: true, user: { id: 'u-alice', username: 'alice' } });
  });

  it('returns generic error when username is unknown', async () => {
    const result = await attemptLogin(mockDb([alice]), 'mallory', 'anything');
    expect(result).toEqual({ ok: false, error: INVALID_CREDENTIALS });
  });

  it('returns generic error when password is wrong', async () => {
    const result = await attemptLogin(mockDb([alice]), 'alice', 'wrong-password');
    expect(result).toEqual({ ok: false, error: INVALID_CREDENTIALS });
  });

  // Property 1 — Authentication Error Indistinguishability.
  // Both failure modes return byte-identical results so a caller cannot
  // distinguish "no such user" from "wrong password" by the response alone.
  it('produces byte-identical error for unknown-user vs wrong-password', async () => {
    const unknownUser = await attemptLogin(mockDb([alice]), 'mallory', 'anything');
    const wrongPass = await attemptLogin(mockDb([alice]), 'alice', 'wrong-password');
    expect(JSON.stringify(unknownUser)).toBe(JSON.stringify(wrongPass));
  });

  it('rejects non-string inputs without querying the database', async () => {
    const db = mockDb([alice]);
    const spy = vi.spyOn(db as unknown as { (t: string): unknown }, 'apply' as never);
    const result = await attemptLogin(db, 42 as unknown, null as unknown);
    expect(result).toEqual({ ok: false, error: INVALID_CREDENTIALS });
    expect(spy).not.toHaveBeenCalled();
  });
});
