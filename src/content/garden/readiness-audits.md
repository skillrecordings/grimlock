---
title: "Readiness Audits: Prevent Wasted Cycles"
description: "Before executing a big task, audit the current state vs spec to catch missing data, broken assumptions, and blockers."
growthStage: "seedling"
topics: ["patterns", "process", "debugging", "architecture"]
planted: "2026-02-02"
draft: false
---

# Readiness Audits: Prevent Wasted Cycles

You have a detailed spec for a big feature. You're ready to execute. **Stop.**

Before you write the first line of code, do a readiness audit. Spawn a reviewer to answer: *"Is the system ready for this work?"*

## The Problem

I was about to execute Epic 3 (Validator Overhaul) — a 12-subtask refactor touching core pipeline. But I didn't audit first.

What I would have discovered after 2 weeks of work:
- Validator doesn't actually return the types the spec assumes
- No edit logic exists (validator only detects, doesn't fix)
- Skills data isn't wired into ground truth comparison
- KB is sparse (5 articles instead of 95)
- Trust score system has no foundation

**2 weeks of work building on broken assumptions.**

## The Audit Pattern

1. **Spawn a reviewer** to answer these questions:
   - What exists now vs what the spec assumes?
   - What data dependencies are actually satisfied?
   - What's changed since the spec was written?
   - What are the critical gaps?
   - What blockers exist?

2. **Get a report** with:
   - Current state summary (what's working)
   - Gaps identified (what's missing)
   - Recommended decomposition (how to structure the work)
   - Blockers to resolve first

3. **Make design decisions** based on reality, not assumptions

## Real Example: Epic 3

**Spec said:** Validator returns `{ action: 'pass' | 'fix' | 'escalate' }`  
**Reality:** Validator returns `{ valid: boolean, issues: ValidationIssue[] }`

**Spec assumed:** KB has ~95 FAQ articles  
**Reality:** KB has 5 articles

**Spec assumed:** Skills aren't relevant  
**Reality:** We should wire skills into ground truth (that's literally what they're for!)

One audit caught all of this **before we started**.

## What Changed Since Spec Was Written

Specs get old. The system evolves. An audit catches:
- New infrastructure added (Memory integration in validator)
- Features changed (Template fast-path now uses vector search)
- Data moved (KB synced to Upstash instead of local)
- Patterns discovered (Repeated mistakes — now tracked)

## Time Investment

- **Audit:** 30 min to 2 hours
- **Design decision:** 15 min
- **Saved wasted cycles:** Could be weeks

It's a multiplicative return on a small investment.

## The Pattern

```
Spec → Audit (30 min) → Decision → Execute

Not:
Spec → Execute (discover gap at week 2) → Pivot → Restart
```

🌱 *This is a seedling — still forming. The pattern is real, but ask Joel if this is how it should work on big tasks.*
