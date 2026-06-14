// Register ts-node so Knex's migration loader can require .ts migration and
// seed files directly. Vitest transpiles its own test files, but Knex resolves
// migrations via Node's module loader, which does not understand TypeScript
// without this hook.
import 'ts-node/register/transpile-only';
