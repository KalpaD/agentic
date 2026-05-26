### BE-002 — Database Layer

#### Background
The database layer must be established before any domain feature work begins. This story sets up the async database connection, all three SQLModel table definitions with their constraints, the first Alembic migration, and a local Docker Compose PostgreSQL service. Every subsequent backend story that touches data depends on this foundation.

#### User Story
As an engineer working on the PFM application, I want SQLModel table definitions for accounts, categories, and transactions with all constraints and indexes, and an Alembic migration that creates them cleanly, so that the database is ready for domain feature development.

#### Tasks
- [ ] Implement `app/db/session.py` — async engine factory + `get_session()` async generator for FastAPI `Depends()`
- [ ] Implement `app/models/account.py` — `Account` SQLModel table with `id`, `owner_id`, `name`, `currency`, `created_at`, `updated_at`
- [ ] Implement `app/models/category.py` — `Category` SQLModel table with `UNIQUE(owner_id, name)` constraint
- [ ] Implement `app/models/transaction.py` — `Transaction` SQLModel table with FK to `accounts` (CASCADE), FK to `categories` (SET NULL), `CHECK amount > 0`, `CHECK type IN ('INCOME','EXPENSE')`
- [ ] Set up Alembic: `alembic init app/db/migrations`, configure `env.py` for async SQLAlchemy
- [ ] Generate and review initial migration: `alembic revision --autogenerate -m "create_accounts_categories_transactions"`
- [ ] Add all indexes from HLD §5 to the migration: `ix_accounts_owner`, `ix_categories_owner`, `ix_transactions_account_date`, `ix_transactions_account_category`
- [ ] Add PostgreSQL 16 service to `docker-compose.yml`
- [ ] Add `DATABASE_URL` to `.env.example` and `.env.local`

#### Testing and Verification

**Unit tests** — test model definitions and enum values in isolation, no database connection:
- `test_transaction_type_enum_has_income_and_expense_values` — assert `TransactionType.INCOME == "INCOME"` and `TransactionType.EXPENSE == "EXPENSE"`
- `test_account_model_default_currency_is_usd` — instantiate `Account` without currency and assert default is `"USD"`
- `test_transaction_model_fields_exist` — assert `Transaction` has `id`, `account_id`, `category_id`, `type`, `amount`, `description`, `date`, `created_at`, `updated_at` attributes

**Integration tests** — require a real PostgreSQL database (test DB spun up via pytest fixture):
- `test_alembic_upgrade_creates_all_three_tables` — run `alembic upgrade head` on test DB; query `information_schema.tables` to assert `accounts`, `categories`, `transactions` all exist
- `test_all_expected_indexes_exist` — query `pg_indexes` and assert all four indexes from HLD §5 are present
- `test_category_unique_constraint_raises_integrity_error` — insert two `Category` rows with the same `owner_id` and `name`; assert `IntegrityError` is raised
- `test_transaction_amount_check_constraint_rejects_zero` — insert `Transaction` with `amount=0`; assert `IntegrityError`
- `test_transaction_amount_check_constraint_rejects_negative` — insert `Transaction` with `amount=-1`; assert `IntegrityError`
- `test_account_delete_cascades_to_transactions` — insert account + transactions, delete account, assert transactions are gone
- `test_category_delete_nullifies_transaction_category_id` — insert category + transaction with that category, delete category, assert transaction `category_id` is `NULL`

#### Dependencies
- BE-001

#### Open Questions
- None

#### Acceptance Criteria
- `docker compose up -d postgres` starts PostgreSQL 16 without errors
- `uv run alembic upgrade head` runs cleanly against the Docker Compose database with zero errors
- All three tables exist with correct columns, constraints, and indexes after migration
- All integration tests pass against a real PostgreSQL instance
- `uv run mypy app` passes with zero errors

#### Relative Estimation
- [ ] 5 points

#### Special Notes
- The `owner_id` column on `accounts` and `categories` is `TEXT` (not a UUID foreign key) — it stores the Cognito `sub` string directly. There is no `users` table. This is an intentional design decision (HLD §5).
- All schema changes for the lifetime of the project must use Alembic `--autogenerate` committed alongside the code. No raw SQL schema changes outside of Alembic.
