---
title: "Vitest Mock Hoisting: Why Your Mocks Can't See Their Own Shadows"
description: "Fixed 84 failing tests by understanding how vi.mock() hoisting works. Here's the pattern."
growthStage: "seedling"
topics: ["testing", "vitest", "debugging", "patterns"]
planted: "2026-02-03"
draft: false
---

Fixed 84 failing tests by understanding a weird vitest quirk. Here's the pattern so you don't waste 30 minutes on it.

## The Problem

You write a vitest file with mocks and get this error:

```
ReferenceError: Cannot access 'mockPaginate' before initialization
```

Your code looks fine:

```typescript
const mockPaginate = vi.fn()  // Line 5

vi.mock('@skillrecordings/front-sdk', () => ({  // Line 8 - hoisted to top
  paginate: mockPaginate,  // Tries to use mockPaginate
}))
```

The error makes no sense. `mockPaginate` is declared on line 5, used on line 8, so why is it "before initialization"?

## The Reason

**Vitest hoists `vi.mock()` calls to the very top of the file**, but it does NOT hoist variable declarations.

So your code actually executes like this:

```typescript
// Hoisted to top first
vi.mock('@skillrecordings/front-sdk', () => ({
  paginate: mockPaginate,  // ❌ ReferenceError - doesn't exist yet!
}))

// Then this runs
const mockPaginate = vi.fn()  // Now it exists, too late
```

The `vi.mock()` factory function runs before the variable is even declared.

## The Solution

Use `vi.hoisted()` to declare your mocks in a scope that's ALSO hoisted:

```typescript
// This entire block is hoisted along with vi.mock()
const { mockPaginate, mockUpsertVector } = vi.hoisted(() => ({
  mockPaginate: vi.fn(),
  mockUpsertVector: vi.fn(),
}))

// Now safe to use in vi.mock() factory
vi.mock('@skillrecordings/front-sdk', () => ({
  paginate: mockPaginate,  // ✅ Exists and ready
  upsertVector: mockUpsertVector,  // ✅ Exists and ready
}))
```

The `vi.hoisted()` callback runs at the same hoist-time as `vi.mock()`, so everything synchronizes.

## Why This Matters

This pattern shows up in:
- Migrating test suites from other frameworks
- Testing libraries that need multiple mocks in factories
- Any vitest file with complex mock dependencies

The error message is misleading (it doesn't tell you about hoisting), so the fix isn't obvious.

## Bonus: Also Fix bun:test Imports

While you're in here, if you inherited tests using `bun:test`:

```typescript
// ❌ Old
import { describe, expect, it, mock } from 'bun:test'

// ✅ New
import { describe, expect, it, vi } from 'vitest'
```

And convert `mock()` calls to `vi.fn()`. The APIs are similar but not identical.

---

**Real-world proof:** Fixed 1440 tests across the support agent pipeline with this one pattern. Worth knowing.
