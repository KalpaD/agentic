# API Endpoint Building Guide

Quick reference for building FastAPI endpoints following our codebase conventions.

## The Three-Layer Pattern

Every API endpoint follows this structure:

```
app/models/       →  app/services/      →  app/api/
(Data Models)        (Business Logic)       (HTTP Handlers)
```

## Step 1: Define Models (`app/models/`)

Create Pydantic models with verbose naming and full validation:

```python
from pydantic import BaseModel, Field
from decimal import Decimal

class Product(BaseModel):
    """Model docstring explaining purpose."""
    product_id: int = Field(..., description="Clear description", gt=0)
    product_name: str = Field(..., min_length=1, max_length=200)
    product_price_usd: Decimal = Field(..., gt=0, decimal_places=2)

class ProductListResponse(BaseModel):
    """Wrapper for list responses (enables future extensions)."""
    products: list[Product]
    total_count: int = Field(..., ge=0)
```

**Key Rules:**
- Verbose field names with prefixes (`product_id`, not `id`)
- Full validation rules in Field()
- Google-style docstrings with examples
- Use wrapper objects for list responses

## Step 2: Create Service Function (`app/services/`)

Business logic with structured logging:

```python
from app.core.logging_config import StructuredLogger
from app.models.product import Product

logger = StructuredLogger(__name__)

def get_filtered_products(category: str | None = None) -> list[Product]:
    """
    Service function docstring.

    Args:
        category: Filter parameter description

    Returns:
        List of Product objects
    """
    logger.info("operation_started", category=category, operation="get_filtered_products")

    # Business logic here
    results = [p for p in _DATABASE if not category or p.product_category == category]

    logger.info("operation_completed", total_results=len(results))
    return results
```

**Key Rules:**
- Type hints on all parameters and returns
- Log at start and end with contextual fields
- Keep business logic separate from HTTP concerns
- Use snake_case for function names

## Step 3: Create API Endpoint (`app/api/`)

Thin HTTP layer that delegates to service:

```python
from fastapi import APIRouter
from app.core.logging_config import StructuredLogger
from app.models.product import ProductListResponse
from app.services import product_service

router = APIRouter(prefix="/api/products", tags=["products"])
logger = StructuredLogger(__name__)

@router.get("", response_model=ProductListResponse)
async def get_products() -> ProductListResponse:
    """
    Endpoint docstring with example response.

    Returns:
        ProductListResponse with products and count
    """
    logger.info("api_request_received", endpoint="/api/products", http_method="GET")

    # Delegate to service
    products = product_service.get_filtered_products()

    logger.info("api_response_prepared", products_count=len(products))
    return ProductListResponse(products=products, total_count=len(products))
```

**Key Rules:**
- Always specify `response_model`
- Delegate business logic to service layer
- Log API entry/exit points
- Return response model objects, not raw data

## Registration

Register router in `app/main.py`:

```python
from app.api import products
app.include_router(products.router)
```

## Quick Checklist

When building a new API endpoint:

- [ ] Create Pydantic models with verbose names and validation
- [ ] Write service function with type hints and logging
- [ ] Create API endpoint that delegates to service
- [ ] Specify response_model on route decorator
- [ ] Add Google-style docstrings to all functions
- [ ] Log operations with structured context
- [ ] Register router in main.py
- [ ] Write tests mirroring the structure