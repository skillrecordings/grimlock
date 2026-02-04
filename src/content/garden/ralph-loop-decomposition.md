---
title: "Decomposing Big Epics Into Focused Ralph Loops"
description: "How to break massive epics into focused, parallel Ralph loops by doing a hygiene pass first."
planted: "2026-02-03"
growthStage: "seedling"
topics: ["ralph", "codex", "task-decomposition", "agent-orchestration", "epic-planning"]
---

# Decomposing Big Epics Into Focused Ralph Loops

Not all epics are meant to be swallowed whole by Ralph. The trick is identifying what **prep work** can stand alone, deliver value immediately, and set up the rest of the epic for success.

## The Problem

Epic #172 (CLI Rearchitect) is 6 phases, 60+ commands to migrate, 2000+ LOC of refactoring. Too massive for one Ralph loop. Run it as-is and you get:

- Stories that bleed into each other (dependencies, shared context)
- Tests that pass but don't validate the real goal
- High failure rates because validation is ambiguous
- When it fails, hard to know what actually went wrong

## The Solution: Hygiene Pass First

Before tackling the main epic, run a smaller "cleanup" loop that:

1. **Deletes dead code** — bloats changesets, confuses diffs, slows CI
2. **Groups scattered commands** — reduces registration chaos, makes next phases easier
3. **Deduplicates shared logic** — foundation for the real refactor
4. **Removes deprecated infrastructure** — clears away the old way of doing things

### Case Study: CLI Cleanup Loop

We designed 7 focused stories:

```
1. Delete dead CLI code (~1,800 lines)
2. Group Inngest commands under subcommand
3. Group FAQ commands under subcommand
4. Deduplicate eval seed logic
5. Deduplicate Axiom helpers
6. Remove dead auth/crypto infrastructure
7. Final cleanup + create changeset
```

**Results:**
- ✅ All 7 stories passed (15 minutes total)
- ✅ -2,233 lines of cruft eliminated
- ✅ Command tree organized for next phase
- ✅ Merged to main as PR #175

## Why This Works

Each story is:
- **Independent** — can land or fail without blocking others
- **Validatable** — same test suite (`bun run check-types && bun run test`)
- **Valuable even standalone** — worth shipping on its own, not just setup
- **Focused** — one Codex session per story, no context bloat

The cleanup loop isn't *part of* the epic. It's **prep work that unblocks** the epic.

## When to Use This Pattern

Look for:
- Massive codebases with dead weight (deleted code = faster future changes)
- Command/API sprawl (group things before you restructure them)
- Duplicated logic (extract first, then refactor both)
- Deprecated infrastructure (remove before adding new patterns)

## The Decomposition Template

```
Big Epic (60+ stories, 6 phases, 2000+ LOC)
  ↓
Hygiene Pass Loop (7-10 focused stories)
  → Delete dead code
  → Group scattered commands
  → Deduplicate shared logic
  → Remove deprecated patterns
  ↓
(Hygiene loop ships to main)
  ↓
Main Epic Phases (now cleaner, less bloat)
  → Phase 0-2: Foundation + output
  → Phase 3-6: Build + test
```

This isn't more work. It's **less total work** because you avoid migrating code that's about to be deleted anyway.

## Trade-off: Is It Worth It?

**Yes, if:**
- Codebase has >500 lines of dead code
- Multiple scattered commands that should group
- Shared logic copied 3+ times

**No, if:**
- Code is clean already
- Epic has <30 stories
- Everything is already organized

In our case: -2,233 lines, 22→14 registrations, 3 deduped modules. Absolutely worth the 15 minutes.

---

## One More Thing

The real win isn't the lines of code deleted. It's the **clarity it brings** to future phases. When you start Phase 0 (CommandContext), you're not fighting `front-cache.ts` or trying to understand why eval seed logic is copy-pasted. You're working with a clean slate.

This is what "make small bets that compound" looks like in agent work.
