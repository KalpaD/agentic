# CLAUDE.md — Personal Finance Manager

## 1. Core Principles

- **Type safety everywhere** — strict mypy on the backend, strict TypeScript on the frontend. No `any`, no `# type: ignore` without an explanation comment.
- **Thin routers, fat services** — business logic lives only in service classes, never in routers or repositories.
- **Never expose DB models directly** — always use separate Pydantic schemas for API I/O.
- **Structured logging on every operation** — use `structlog` with request IDs; never use `print()`.
- **Test the important paths** — ≥80% line coverage on backend; every service method has a unit test.
- **One source of truth for API types** — generate TypeScript types from the OpenAPI spec (via `orval`), never hand-write them.
- **No secrets in code** — all config via environment variables, loaded through `pydantic-settings`.

---

## 2. Tech Stack

### Backend
| Concern | Tool | Version |
|---|---|---|
| Language | Python | 3.12 |
| Package manager | uv | ≥0.5 |
| Framework | FastAPI | ≥0.115 |
| ORM | SQLModel + SQLAlchemy 2.x | SQLModel ≥0.0.14 |
| Migrations | Alembic | ≥1.13 |
| Auth | PyJWT + passlib[bcrypt] | PyJWT ≥2.8 |
| Logging | structlog | ≥24.x |
| Linting | ruff | ≥0.9 |
| Type checking | mypy (strict) | ≥1.11 |
| Testing | pytest + pytest-asyncio + httpx | pytest ≥8 |
| ASGI server | uvicorn[standard] | ≥0.30 |

### Frontend
| Concern | Tool | Version |
|---|---|---|
| Language | TypeScript | ≥5.5 (strict) |
| Runtime/build | Vite | ≥6.x |
| Package manager | pnpm | ≥9.x |
| UI components | shadcn/ui + Tailwind CSS | Tailwind v4 |
| Server state | TanStack Query | v5.x |
| Client/UI state | Zustand | v5.x |
| API client | Axios + orval (codegen) | Axios ≥1.7 |
| Runtime validation | Zod | ≥3.23 |
| Lint/format | Biome | ≥1.9 |
| Testing | Vitest + React Testing Library | Vitest ≥2.x |
| E2E | Playwright | ≥1.45 |

---

## 3. Architecture

### Backend folder structure
```
app/
├── main.py                  # FastAPI app factory + lifespan
├── config.py                # pydantic-settings — env vars
├── dependencies.py          # Shared Depends() — DB session, current user
├── api/
│   └── v1/
│       ├── router.py        # Aggregates domain routers
│       ├── accounts/
│       │   ├── router.py    # HTTP in/out only
│       │   ├── schemas.py   # Pydantic request/response models
│       │   ├── service.py   # Business logic
│       │   └── repository.py
│       ├── transactions/
│       └── budgets/
├── core/
│   ├── security.py          # JWT + password hashing
│   ├── exceptions.py        # AppError + exception handlers
│   └── middleware.py        # CORS, request-ID injection
├── db/
│   ├── session.py           # Async engine + get_session()
│   └── migrations/          # Alembic
└── models/                  # SQLModel table definitions (DB layer only)
tests/
├── conftest.py
├── unit/                    # Service tests with mocked repos
└── integration/             # Full request → DB tests
```

### Frontend folder structure
```
src/
├── api/
│   └── generated/           # orval-generated TanStack Query hooks — DO NOT EDIT
├── components/
│   ├── ui/                  # shadcn/ui primitives (auto-generated)
│   └── [feature]/           # Feature-specific composed components
├── pages/                   # Route-level page components
├── hooks/                   # Custom React hooks
├── stores/                  # Zustand stores (UI/client state only)
├── lib/
│   ├── axios.ts             # Axios instance + interceptors
│   ├── errors.ts            # ApiError class
│   └── utils.ts
├── types/                   # Manually maintained shared types (non-API)
└── schemas/                 # Zod validation schemas
```

### Layer rules
- **Router** → validates HTTP, calls service, returns schema. Zero business logic.
- **Service** → owns business rules, calls repositories, raises `AppError`.
- **Repository** → all ORM queries. Returns domain objects, no SQLAlchemy types leak out.
- **Frontend**: TanStack Query hooks for all server data; Zustand only for UI state (modals, filters).

---

## 4. Code Style

### Backend
```python
# Functions: snake_case. Classes: PascalCase. Constants: UPPER_SNAKE.
# Model fields: snake_case. Private methods: _leading_underscore.

# Service class pattern
class TransactionService:
    def __init__(self, repo: TransactionRepository) -> None:
        self._repo = repo

    async def create_transaction(
        self, user_id: UUID, payload: TransactionCreate
    ) -> TransactionRead:
        if payload.amount <= 0:
            raise AppError(422, "invalid-amount", "Invalid amount", "Amount must be positive")
        return await self._repo.create(user_id=user_id, payload=payload)

# Pydantic schemas — always separate from DB models
class TransactionCreate(BaseModel):
    account_id: UUID
    amount: Decimal
    description: str

class TransactionRead(TransactionCreate):
    id: UUID
    created_at: datetime
```

### Frontend
```typescript
// Components: PascalCase. Functions/variables: camelCase.
// Types/interfaces: PascalCase. Zod schemas: camelCase + Schema suffix.

// Component pattern
interface TransactionCardProps {
  transaction: TransactionRead;
  onDelete: (id: string) => void;
}

export function TransactionCard({ transaction, onDelete }: TransactionCardProps) {
  // ...
}

// Zod validation schema
const transactionCreateSchema = z.object({
  accountId: z.string().uuid(),
  amount: z.number().positive(),
  description: z.string().min(1).max(255),
});
```

---

## 5. Logging

Use `structlog` throughout. Never use `print()` or bare `logging.info()`.

```python
import structlog

log = structlog.get_logger()

# In service methods — bind context, then log
async def create_transaction(self, user_id: UUID, payload: TransactionCreate) -> TransactionRead:
    log.info("transaction.create.start", user_id=str(user_id), amount=str(payload.amount))
    try:
        result = await self._repo.create(user_id=user_id, payload=payload)
        log.info("transaction.create.success", transaction_id=str(result.id))
        return result
    except Exception:
        log.exception("transaction.create.failed", user_id=str(user_id))
        raise
```

```typescript
// Frontend: structured console logs in development; no-op in production via Vite env
const logger = {
  info: (event: string, ctx?: Record<string, unknown>) =>
    import.meta.env.DEV && console.info(JSON.stringify({ event, ...ctx })),
  error: (event: string, error: unknown, ctx?: Record<string, unknown>) =>
    console.error(JSON.stringify({ event, error: String(error), ...ctx })),
};

logger.info("transaction.submit", { accountId, amount });
```

Log format: `domain.action.status` (e.g., `account.create.start`, `auth.login.failed`). Always include relevant IDs as string fields. Never log raw passwords, tokens, or PII.

---

## 6. Testing

### Backend
```python
# tests/conftest.py — shared fixtures
@pytest.fixture
async def client(app: FastAPI) -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(app=app, base_url="http://test") as c:
        yield c

@pytest.fixture
def mock_transaction_repo() -> MagicMock:
    return MagicMock(spec=TransactionRepository)

# Unit test — service with mocked repo
async def test_create_transaction_rejects_negative_amount(
    mock_transaction_repo: MagicMock,
) -> None:
    service = TransactionService(repo=mock_transaction_repo)
    with pytest.raises(AppError, match="invalid-amount"):
        await service.create_transaction(user_id=uuid4(), payload=TransactionCreate(amount=Decimal("-10"), ...))

# Integration test — full HTTP round-trip
async def test_create_transaction_returns_201(client: AsyncClient, auth_headers: dict) -> None:
    response = await client.post("/api/v1/transactions", json={...}, headers=auth_headers)
    assert response.status_code == 201
    assert response.json()["id"]
```

- Unit tests mock repositories via `MagicMock(spec=Repo)`.
- Integration tests use an in-memory SQLite DB with per-test transaction rollback.
- Test files mirror source: `tests/unit/accounts/test_service.py` ↔ `app/api/v1/accounts/service.py`.
- Run: `uv run pytest --cov=app --cov-fail-under=80`

### Frontend
```typescript
// Vitest + React Testing Library
describe("TransactionCard", () => {
  it("calls onDelete with the transaction id when delete button is clicked", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<TransactionCard transaction={mockTransaction} onDelete={onDelete} />);
    await user.click(screen.getByRole("button", { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledWith(mockTransaction.id);
  });
});
```

Run: `pnpm test` (Vitest watch) | `pnpm test:run` (CI) | `pnpm e2e` (Playwright).

---

## 7. API Contracts

FastAPI generates the OpenAPI spec; `orval` generates typed React hooks. **Never hand-write API types on the frontend.**

```python
# Backend: separate response schema — never return the DB model directly
class AccountRead(BaseModel):
    id: UUID
    name: str
    balance: Decimal
    currency: str
    created_at: datetime

@router.get("/{account_id}", response_model=AccountRead)
async def get_account(account_id: UUID, service: AccountService = Depends(get_account_service)) -> AccountRead:
    return await service.get_by_id(account_id)
```

```typescript
// Frontend: use the generated hook — type comes from the spec
import { useGetAccount } from "@/api/generated";

function AccountDetail({ id }: { id: string }) {
  const { data, isLoading } = useGetAccount(id);
  // data is typed as AccountRead automatically
}
```

```bash
# Regenerate after any backend schema change
pnpm orval
```

### Error contract
All errors follow RFC 9457 Problem Details:
```json
{ "type": "invalid-amount", "title": "Invalid amount", "detail": "Amount must be positive", "status": 422 }
```

Frontend maps `type` strings to user messages in a single `lib/errors.ts` switch — never parse error strings in components.

---

## 8. Common Patterns

### Backend: FastAPI dependency injection chain
```python
# dependencies.py
def get_account_repo(session: AsyncSession = Depends(get_session)) -> AccountRepository:
    return AccountRepository(session)

def get_account_service(repo: AccountRepository = Depends(get_account_repo)) -> AccountService:
    return AccountService(repo)

# router.py
@router.post("/", response_model=AccountRead, status_code=201)
async def create_account(
    payload: AccountCreate,
    service: AccountService = Depends(get_account_service),
    current_user: User = Depends(get_current_user),
) -> AccountRead:
    return await service.create(owner_id=current_user.id, payload=payload)
```

### Frontend: data fetching + form pattern
```typescript
// pages/accounts/NewAccountPage.tsx
export function NewAccountPage() {
  const { mutate, isPending } = useCreateAccount();
  const form = useForm<z.infer<typeof accountCreateSchema>>({
    resolver: zodResolver(accountCreateSchema),
  });

  const onSubmit = form.handleSubmit((data) => {
    mutate(data, {
      onSuccess: () => navigate("/accounts"),
      onError: (err) => toast.error(toUserMessage(err)),
    });
  });

  return <form onSubmit={onSubmit}>...</form>;
}
```

### Zustand store (UI state only)
```typescript
// stores/uiStore.ts
interface UiStore {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
```

---

## 9. Development Commands

### Backend
```bash
uv sync                          # Install all dependencies
uv run uvicorn app.main:app --reload  # Dev server (port 8000)
uv run pytest                    # Run tests
uv run pytest --cov=app --cov-fail-under=80  # Tests with coverage
uv run ruff check .              # Lint
uv run ruff format .             # Format
uv run mypy app                  # Type check
uv run alembic upgrade head      # Apply migrations
uv run alembic revision --autogenerate -m "description"  # New migration
```

### Frontend
```bash
pnpm install                     # Install dependencies
pnpm dev                         # Dev server (port 5173)
pnpm build                       # Production build
pnpm preview                     # Preview production build
pnpm test                        # Vitest watch mode
pnpm test:run                    # Vitest CI (no watch)
pnpm e2e                         # Playwright E2E tests
pnpm lint                        # Biome lint
pnpm format                      # Biome format
pnpm orval                       # Regenerate API types from OpenAPI spec
```

---

## 10. AI Coding Assistant Instructions

- **Read this file first** before writing any code. Follow every convention exactly.
- **Consult the folder structure in §3** when creating new files — place files in the correct layer (router/service/repository/model).
- **Never add business logic to routers** — if it's not HTTP parsing, it belongs in a service.
- **Never expose SQLModel table models in API responses** — always create a separate Pydantic schema in `schemas.py`.
- **Run `uv run ruff check . && uv run mypy app`** after every backend change. Fix all errors before considering the task done.
- **Run `pnpm lint && pnpm tsc --noEmit`** after every frontend change.
- **Run `pnpm orval`** whenever a backend API schema changes so frontend types stay in sync.
- **Log every service operation** using `structlog` with `domain.action.status` event names and relevant ID fields.
- **Write tests alongside new code** — unit test for every new service method, integration test for every new endpoint.
- **Never hard-code secrets or config values** — use `app/config.py` (pydantic-settings) on the backend and Vite `import.meta.env` on the frontend.
