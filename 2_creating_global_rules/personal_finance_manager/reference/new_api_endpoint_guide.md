# New API Endpoint Guide

Use when adding a REST endpoint for an API resource (accounts, transactions, budgets, etc.).

## Overall Pattern

```
Router (HTTP only) → Service (business logic) → Repository (ORM) → Model (SQLModel)

app/
├── models/{resource}.py           # SQLModel table
└── api/v1/{resource}/
    ├── schemas.py                 # Pydantic request/response
    ├── repository.py              # ORM queries only
    ├── service.py                 # Business logic + AppError
    └── router.py                  # HTTP wiring, Depends() calls only
```

---

## Step 1: SQLModel Table Model

`app/models/account.py`

```python
from uuid import UUID, uuid4
from datetime import datetime
from decimal import Decimal
from sqlmodel import SQLModel, Field

class Account(SQLModel, table=True):
    __tablename__ = "account"  # singular
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    owner_id: UUID = Field(foreign_key="user.id", index=True)
    name: str = Field(max_length=128)
    balance: Decimal = Field(default=Decimal("0"), decimal_places=2)
    currency: str = Field(max_length=3)
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

- Singular table name; UUID PK; index all FK columns
- Never import this model from the API layer

---

## Step 2: Pydantic Schemas

`app/api/v1/accounts/schemas.py`

```python
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field

class AccountCreate(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    currency: str = Field(min_length=3, max_length=3)

class AccountUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=128)

class AccountRead(BaseModel):
    id: UUID
    name: str
    balance: Decimal
    currency: str
    created_at: datetime
    model_config = {"from_attributes": True}
```

- `Create`: required input + validation; `Update`: all fields optional; `Read`: all exposed fields
- `Read` must have `model_config = {"from_attributes": True}`; never include internal FK fields

---

## Step 3: Repository

`app/api/v1/accounts/repository.py`

```python
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.models.account import Account
from app.api.v1.accounts.schemas import AccountCreate

class AccountRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, account_id: UUID) -> Account | None:
        return await self._session.get(Account, account_id)

    async def list_by_owner(self, owner_id: UUID) -> list[Account]:
        result = await self._session.exec(select(Account).where(Account.owner_id == owner_id))
        return list(result.all())

    async def create(self, owner_id: UUID, payload: AccountCreate) -> Account:
        account = Account(owner_id=owner_id, **payload.model_dump())
        self._session.add(account)
        await self._session.commit()
        await self._session.refresh(account)
        return account
```

- Inject `session` via `__init__`; return domain objects (`Account`), never raw dicts
---

## Step 4: Service

`app/api/v1/accounts/service.py`

```python
from uuid import UUID
import structlog
from app.core.exceptions import AppError
from app.api.v1.accounts.repository import AccountRepository
from app.api.v1.accounts.schemas import AccountCreate, AccountRead

log = structlog.get_logger()

class AccountService:
    def __init__(self, repo: AccountRepository) -> None:
        self._repo = repo

    async def create(self, owner_id: UUID, payload: AccountCreate) -> AccountRead:
        log.info("account.create.start", owner_id=str(owner_id))
        account = await self._repo.create(owner_id=owner_id, payload=payload)
        log.info("account.create.success", account_id=str(account.id))
        return AccountRead.model_validate(account)

    async def get_by_id(self, account_id: UUID, owner_id: UUID) -> AccountRead:
        account = await self._repo.get_by_id(account_id)
        if not account:
            raise AppError(404, "account-not-found", "Account not found", "")
        if account.owner_id != owner_id:
            raise AppError(403, "forbidden", "Access denied", "")
        return AccountRead.model_validate(account)
```

- Log `domain.action.start` + `domain.action.success`; raise `AppError`, never `HTTPException`
- Return `Read` schemas — never SQLModel objects; ownership checks live here
---

## Step 5: Router + Dependency Wiring

`app/api/v1/accounts/router.py`

```python
from uuid import UUID
from fastapi import APIRouter, Depends, status
from app.dependencies import get_current_user, get_account_service
from app.api.v1.accounts.schemas import AccountCreate, AccountRead
from app.api.v1.accounts.service import AccountService
from app.models.user import User

router = APIRouter(prefix="/accounts", tags=["accounts"])

@router.get("/", response_model=list[AccountRead])
async def list_accounts(
    service: AccountService = Depends(get_account_service),
    current_user: User = Depends(get_current_user),
) -> list[AccountRead]:
    return await service.list_for_owner(owner_id=current_user.id)

@router.post("/", response_model=AccountRead, status_code=status.HTTP_201_CREATED)
async def create_account(
    payload: AccountCreate,
    service: AccountService = Depends(get_account_service),
    current_user: User = Depends(get_current_user),
) -> AccountRead:
    return await service.create(owner_id=current_user.id, payload=payload)
```

Add factories to `app/dependencies.py`:

```python
def get_account_repo(session: AsyncSession = Depends(get_session)) -> AccountRepository:
    return AccountRepository(session)

def get_account_service(repo: AccountRepository = Depends(get_account_repo)) -> AccountService:
    return AccountService(repo)
```

Mount in `app/api/v1/router.py`: `api_router.include_router(accounts_router)`

---

## Quick Checklist

- [ ] SQLModel table in `app/models/` — UUID PK, indexed FK, `created_at`
- [ ] `{Resource}Create`, `{Resource}Update`, `{Resource}Read` schemas; `Read` has `from_attributes = True`
- [ ] Repository injects session via `__init__`, returns domain objects
- [ ] Service logs `domain.action.start/success`, raises `AppError`, returns `Read` schemas
- [ ] Router has zero business logic; every route has explicit `response_model` + `status_code`
- [ ] Dependency factories in `app/dependencies.py`; router mounted in `app/api/v1/router.py`
- [ ] Alembic migration: `uv run alembic revision --autogenerate -m "add_{resource}"`
- [ ] Unit test per service method; integration test per endpoint
- [ ] `uv run ruff check . && uv run mypy app` passes; `pnpm orval` run
