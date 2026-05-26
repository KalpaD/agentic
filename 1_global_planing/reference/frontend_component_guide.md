# Frontend Component Building Guide

Quick reference for building React components following our codebase conventions.

## Component Anatomy

Every component follows this pattern:

```typescript
/**
 * Component description and purpose.
 *
 * Key features or states handled.
 */

// 1. Imports (types, UI components, utilities)
import type { Product } from "@/types/product";
import { Card } from "@/components/ui/card";

// 2. Props interface with JSDoc
interface ProductCardProps {
  /** JSDoc description for each prop */
  product: Product;

  /** Optional props marked with ? */
  onClick?: (product: Product) => void;
}

// 3. Component function with destructured props
export function ProductCard({ product, onClick }: ProductCardProps) {
  // 4. Component logic (state, handlers, formatting)
  const formattedPrice = formatPrice(product.product_price_usd);

  // 5. Return JSX with proper structure
  return (
    <Card>
      {/* Component content */}
    </Card>
  );
}
```

## Props Interface Rules

Always define explicit Props interfaces:

```typescript
interface ComponentNameProps {
  /** Required props without default */
  data: DataType;

  /** Optional props with ? */
  loading?: boolean;

  /** Handler functions with clear signatures */
  onSubmit?: (data: FormData) => void;

  /** Children when component wraps content */
  children?: React.ReactNode;
}
```

**Key Rules:**
- PascalCase for interface names
- JSDoc comment for each prop
- Use type imports: `import type { ... }`
- Match backend models exactly (`Product` fields)

## State Management

Handle common UI states explicitly:

```typescript
export function ProductGrid({ products, loading }: ProductGridProps) {
  // Loading state
  if (loading) {
    return <LoadingSpinner />;
  }

  // Empty state
  if (products.length === 0) {
    return <EmptyMessage />;
  }

  // Success state
  return <div className="grid">{/* render products */}</div>;
}
```

## Using shadcn/ui Components

Build on top of UI primitives from `@/components/ui/`:

```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>{product.product_name}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Content */}
      </CardContent>
    </Card>
  );
}
```

**Available UI Components:**
- Card, CardHeader, CardTitle, CardContent
- Button
- Input
- Label
- Select
- Form (with react-hook-form integration)

## Styling with Tailwind

Use Tailwind utility classes for all styling:

```typescript
// Layout
<div className="flex items-center justify-between gap-4">

// Responsive design
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">

// Typography
<h2 className="text-2xl font-bold text-foreground">

// Colors (use CSS variables)
<span className="text-muted-foreground bg-primary">

// State variants
<Card className="hover:shadow-lg transition-shadow">
```

**Key Rules:**
- No custom CSS files
- Use Tailwind's responsive prefixes (md:, lg:)
- Use design system colors (foreground, muted-foreground, primary)
- Add transitions for interactive elements

## Type Safety with Backend Models

Frontend types must match backend Pydantic models exactly:

```typescript
// Backend (Python)
class Product(BaseModel):
    product_id: int
    product_price_usd: Decimal  # Serializes to string

// Frontend (TypeScript) - must match!
interface Product {
  product_id: number;
  product_price_usd: string;  // Decimal → string in JSON
}
```

## Accessibility

Always include proper accessibility attributes:

```typescript
// ARIA labels for icons
<svg role="img" aria-label="In stock">

// Alt text for images
<img src={url} alt={`Photo of ${product.product_name}`} />

// Semantic HTML
<button type="button" aria-label="Close dialog">
```

## Component Organization

Place components in the right location:

```
src/components/
├── ui/              # shadcn primitives (don't modify directly)
├── ProductCard.tsx  # Domain components at root
└── ProductGrid.tsx  # Domain components at root
```

## Quick Checklist

When building a new component:

- [ ] Define Props interface with JSDoc for all props
- [ ] Use explicit TypeScript types everywhere
- [ ] Handle loading/empty/success states
- [ ] Use shadcn/ui components for primitives
- [ ] Style with Tailwind utilities only
- [ ] Match backend model types exactly
- [ ] Add accessibility attributes (aria-label, role)
- [ ] Export component with `export function`
- [ ] Add top-level component docstring