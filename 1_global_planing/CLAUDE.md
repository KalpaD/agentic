# Product Catalog E-Commerce App - Global Development Rules

## 1. Core Principles

**VERBOSE NAMING IS NON-NEGOTIABLE**
- Use intention-revealing names: `product_id`, `product_name` (not `id`, `name`)
- Choose clarity over brevity always

**AI-FRIENDLY LOGGING IS MANDATORY**
- Structured JSON to stdout/console with contextual fields
- Descriptive event names (snake_case: `filtering_products`, `validation_failed`)
- Include `fix_suggestion` in error logs

**TYPE SAFETY IS REQUIRED**
- Backend: Full Pydantic validation
- Frontend: TypeScript strict mode, no `any` without justification

**DOCUMENTATION EVERYWHERE**
- Backend: Google-style docstrings with examples
- Frontend: JSDoc for complex functions

---

## 2. Tech Stack

### Backend
- FastAPI 0.118+ with Pydantic 2.11+
- Python 3.12 with UV package manager
- pytest 8.4+ with FastAPI TestClient
- Ruff 0.8+ for linting/formatting (120 char, double quotes)

### Frontend
- React 19 with TypeScript strict mode
- Bun runtime + bundler
- Tailwind CSS 4.0 + Radix UI + shadcn/ui
- React Hook Form + Zod validation
- Biome 2.2+ for linting/formatting (120 char, double quotes)

---

## 3. Architecture

### Backend: `app/api/` → `app/services/` → `app/models/`
- Service Layer: API routes delegate to service functions
- Tests mirror `app/` structure (`test_<module>.py`)
- StructuredLogger for all logging

### Frontend: `src/components/` + `src/lib/` + `src/types/`
- Component composition with explicit Props interfaces
- TypeScript types match backend Pydantic models exactly
- StructuredLogger matching backend pattern

---

## 4. Code Style

### Backend (Python)
- Naming: `snake_case` functions, `PascalCase` classes, verbose fields (`product_id`)
- Always include type hints and Google-style docstrings with examples
```python
def filter_products(category: str, min_price: Decimal) -> list[Product]:
    """
    Filter products by category and minimum price.

    Args:
        category: Product category to filter by
        min_price: Minimum price in USD (inclusive)

    Returns:
        List of Product objects matching criteria
    """
```

### Frontend (TypeScript)
- Naming: `PascalCase` components, `camelCase` functions, explicit types everywhere
```typescript
interface ProductGridProps {
  products: Product[];
  loading: boolean;
}

export function ProductGrid({ products, loading }: ProductGridProps) {
  // Implementation
}
```

---

## 5. Logging (Structured JSON)

### Backend
```python
from app.core.logging_config import StructuredLogger
logger = StructuredLogger(__name__)

logger.info("filtering_products", filter_category="electronics", total_results=15)
logger.error("validation_failed", error_type="invalid_price_range",
             fix_suggestion="Ensure min_price_usd <= max_price_usd")
```

### Frontend
```typescript
import { logger } from "@/lib/logger";

logger.info("fetching_products", { endpoint: "/api/products" });
logger.error("fetch_failed", { error_message: err.message,
                                fix_suggestion: "Check backend server" });
```

---

## 6. Testing

### Backend
- Tests mirror `app/` structure: `test_<module>.py`
- Fixtures in `tests/conftest.py`
- Verbose test names: `test_get_products_with_category_returns_filtered_list`
```python
def test_get_products_returns_200(test_client: TestClient) -> None:
    """Test that GET /api/products returns HTTP 200."""
    response = test_client.get("/api/products")
    assert response.status_code == 200
```

**Run:** `uv run pytest`

---

## 7. API Contracts (Backend ↔ Frontend Must Match)

### Models
```python
# Backend
class Product(BaseModel):
    product_id: int = Field(..., gt=0)
    product_name: str = Field(..., min_length=1, max_length=200)
    product_price_usd: Decimal = Field(..., gt=0, decimal_places=2)
```

```typescript
// Frontend (matching exactly)
interface Product {
  product_id: number;
  product_name: string;
  product_price_usd: string; // Decimal → string
}
```

### Error Handling
```python
# Backend
class ErrorResponse(BaseModel):
    error_code: str
    error_message: str
    error_details: dict[str, Any] | None = None
    timestamp_utc: str
```

```typescript
// Frontend
interface ErrorResponse {
  error_code: string;
  error_message: string;
  error_details?: Record<string, unknown>;
  timestamp_utc: string;
}

class ApiError extends Error {
  constructor(public readonly statusCode: number,
              public readonly errorResponse: ErrorResponse) {
    super(errorResponse.error_message);
  }
}
```

---

## 8. Common Patterns

### Backend Service with Logging
```python
def get_filtered_products(category: str | None = None) -> list[Product]:
    """Get products filtered by category."""
    logger.info("filtering_products_started", category=category)
    results = [p for p in _PRODUCTS_DATABASE if not category or p.product_category == category]
    logger.info("filtering_products_completed", total_results=len(results))
    return results
```

### Frontend API Fetch with Error Handling
```typescript
async function fetchProducts(): Promise<ProductListResponse> {
  logger.info("fetching_products", { endpoint: "/api/products" });
  try {
    const response = await fetch("/api/products");
    if (!response.ok) {
      const errorData: ErrorResponse = await response.json();
      throw new ApiError(response.status, errorData);
    }
    const data: ProductListResponse = await response.json();
    logger.info("fetch_success", { total_count: data.total_count });
    return data;
  } catch (error) {
    logger.error("fetch_failed", { error_message: error instanceof Error ? error.message : "Unknown",
                                    fix_suggestion: "Check backend on http://localhost:8000" });
    throw error;
  }
}
```

---

## 9. Task-Specific Reference Guides

For detailed instructions on specific development tasks, refer to these guides:

### Building API Endpoints
**When to use:** Creating new REST API endpoints, adding routes, implementing backend features

Read: `reference/API_guide.md`

This guide covers:
- Three-layer architecture (models → services → API)
- Pydantic model creation with validation
- Service layer patterns with logging
- FastAPI endpoint implementation
- Response model specifications

### Building Frontend Components
**When to use:** Creating React components, implementing UI features, building views

Read: `reference/frontend_component_guide.md`

This guide covers:
- Component structure and Props interfaces
- State management patterns (loading/empty/success)
- Using shadcn/ui components
- Tailwind styling conventions
- Type safety with backend models
- Accessibility requirements

---

## 10. Development Commands

### Backend
```bash
uv sync                                           # Install
uv run uvicorn app.main:app --reload --port 8000 # Dev server
uv run pytest                                     # Test
uv run ruff check . && uv run ruff format .      # Lint + format
```

### Frontend
```bash
bun install       # Install
bun run dev       # Dev server (HMR)
bun run check:fix # Lint + format + organize imports
```

---

## 11. AI Coding Assistant Instructions

When working with this codebase:

1. **Read existing code first** to understand patterns
2. **Match naming conventions** (verbose, prefixed fields like `product_id`)
3. **Use structured JSON logging** with contextual fields for all operations
4. **Add docstrings** (Google style backend, JSDoc frontend) with examples
5. **Include type hints everywhere** (Python and TypeScript)
6. **Write tests** mirroring source structure with verbose names
7. **Run linters** before completing (Ruff, Biome must pass)
8. **Include `fix_suggestion`** in all error logs
9. **Never sacrifice clarity** for brevity
10. **Consult reference guides** for task-specific patterns before implementing

**Important:** When working on specific task types (API endpoints, frontend components), always read the corresponding reference guide first to ensure consistency with established patterns.