import bcrypt from 'bcryptjs';
import { Knex } from 'knex';

// Property 1 — Authentication Error Indistinguishability.
// Every failure mode (unknown username, wrong password, malformed input)
// returns this exact string so the caller cannot infer which field was wrong.
export const INVALID_CREDENTIALS = 'Invalid username or password';

export interface AuthenticatedUser {
  id: string;
  username: string;
}

export type LoginResult =
  | { ok: true; user: AuthenticatedUser }
  | { ok: false; error: string };

interface UserRow {
  id: string;
  username: string;
  password_hash: string;
}

export async function attemptLogin(
  db: Knex,
  username: unknown,
  password: unknown,
): Promise<LoginResult> {
  if (typeof username !== 'string' || typeof password !== 'string') {
    return { ok: false, error: INVALID_CREDENTIALS };
  }

  const user = await db<UserRow>('users').where({ username }).first();
  if (!user) {
    return { ok: false, error: INVALID_CREDENTIALS };
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return { ok: false, error: INVALID_CREDENTIALS };
  }

  return { ok: true, user: { id: user.id, username: user.username } };
}
