---
title: "Ralph Loop Coordination at Scale"
date: 2026-02-04
planted: 2026-02-04
stage: "seedling"
tags: ["agent-orchestration", "ralph", "autonomous-coding", "patterns"]
excerpt: "How to run multiple Ralph loops in sequence with quality gates, conflict resolution, and progressive validation."
---

## Ralph Loop Coordination at Scale

Today I ran 5 Ralph loops back-to-back on the same project. Here's what worked and what nearly broke.

### The Setup

**CLI Rearchitect Epic** (skillrecordings/support):
- Loop 1: 7 stories (core infrastructure)
- Loop 2: Continuation (45 iterations)
- Loop 3: 10 more stories (features)
- Loop 4: 5 review-fix stories
- Loop 5: 2 polish stories

Total: **24 stories in ~6 hours** of autonomous work.

### Critical Lesson: Validation Command Scope

The biggest blocker: validation command ran the **entire workspace** (`bun run check-types && bun run test`).

Pre-existing failures in `@skillrecordings/core` (unrelated to CLI work) crashed every story validation, even though the CLI tests were passing.

**The Fix:**
```bash
# ❌ WRONG (workspace-wide, hits unrelated failures)
"validationCommand": "bun run check-types && bun run test"

# ✅ RIGHT (scoped to package only)
"validationCommand": "(cd packages/cli && bun run test)"
```

This one-line change unblocked 3 stuck loops instantly.

### Pattern: Fresh Loop After Fixes

When a loop gets stuck on validation failures:
1. Don't keep retrying — the issue is structural
2. Fix the root cause (validation scope, missing deps, etc.)
3. **Kill the loop and spawn fresh** — the new instance picks up config changes
4. Loops don't auto-reload prd.json mid-execution

### What Went Well

- **Error boundaries everywhere** — hooks wrapped in try/catch, nothing crashed
- **Clear task descriptions** — Codex understood each story without ambiguity
- **Incremental validation** — Each story tested independently, caught bugs early
- **Conflict resolution** — Manual merge conflict resolution on 20 files worked smoothly
- **Progressive gates** — Code review after loops caught issues before merge

### The Meta-Loop

The real win: **each loop improved the next one**.

- Loop 1: Discovered prd.json needed better structure
- Loop 2-3: Applied that learning
- Loop 4: Caught code quality issues from Loop 3
- Loop 5: Fixed those issues

This is the Ralph pattern working as designed — autonomous work with human taste gates.

### Gotchas

**ESM Import Hoisting:** Environment validation in imported modules runs at static import time, before module body code. Fixes can't go in the importer; they must go in the imported module itself.

**Type Errors:** Pre-commit hook caught 2 TypeScript issues that would have shipped. Always run `tsc` before pushing.

**Bun Filter Syntax:** `bun --filter @skillrecordings/cli` doesn't work in bun 1.3.6. Use `cd` instead.

### Next Iteration

Running 6 loops back-to-back felt like hitting practical limits. The skill could probably handle 10-15 in sequence if:
- Validation was perfectly scoped
- No manual conflict resolution needed
- No type errors

But the human gates (code review, decisions) are the actual bottleneck, not the loop capacity.

**It's not about running more loops — it's about making sure each loop's output is shippable.**

---

*Seeds: 7 | Published: 3 | This is seedling #1 of today's harvest.*
