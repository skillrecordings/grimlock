---
title: "Ralph Loops: Autonomous Coding with Codex"
description: "How we use OpenAI Codex in autonomous loops to execute multi-story implementations without hand-holding."
growthStage: "seedling"
topics: ["codex", "automation", "ralph", "agents"]
planted: "2026-02-02"
draft: false
---

# Ralph Loops: Autonomous Coding with Codex

Ralph is our autonomous coding loop that uses OpenAI Codex to execute multi-story implementations. Named after the pattern of "iterate until done" — write code, validate, commit, repeat.

## The Core Pattern

```
while stories_remain:
    story = get_next_story()
    spawn_codex(story)
    if validation_passes:
        commit()
        mark_complete()
    else:
        retry_or_escalate()
```

## Why Codex?

Codex runs in a sandboxed environment with full filesystem access. It can:
- Read and understand existing code
- Write implementations
- Run tests
- Fix errors iteratively
- Commit when done

The key insight: **don't micromanage**. Give Codex the context it needs and let it work.

## The PRD Pattern

Each Ralph project has a `prd.json` with stories:

```json
{
  "stories": [
    {
      "id": "story-1",
      "title": "Add user authentication",
      "description": "Implement OAuth login...",
      "validationCommand": "bun test auth",
      "priority": 1
    }
  ]
}
```

Ralph picks the highest-priority incomplete story and spawns Codex to execute it.

## Validation Gates

Every story has a `validationCommand`. Codex runs it before marking complete:
- Tests must pass
- Type checks must pass
- Lint must pass

If validation fails, Codex retries. After 3 failures, it escalates to human.

## Progress Tracking

Ralph maintains `progress.txt` — a human-readable log of what happened:

```
[2026-02-02 14:23] Starting story-1: Add user authentication
[2026-02-02 14:25] Validation passed
[2026-02-02 14:25] Committed: feat(auth): add OAuth login
[2026-02-02 14:26] Starting story-2: Add rate limiting
```

## The Meta-Loop

The real power is the meta-loop: **Ralph improving Ralph**.

When we hit friction:
1. Document it in the skill
2. Update the config
3. Store the learning in hivemind

Every failure makes the next run smoother.

## Config

```yaml
# ~/.codex/config.yaml
model: gpt-5.2-codex
sandbox: danger-full-access  # or safe-sandbox
autoCommit: true
```

`danger-full-access` means Codex can do anything — network, filesystem, git. Use with trusted repos only.

## When It Works Best

- Well-defined stories with clear acceptance criteria
- Good test coverage (validation is automatic)
- Clean codebase that Codex can understand
- Stories that don't require human judgment

## When It Struggles

- Vague requirements ("make it better")
- No tests (can't validate)
- Complex multi-file refactors with hidden dependencies
- Taste/design decisions

## The Swarm Connection

Ralph loops feed into the broader swarm system:
- Hivemind stores learnings from each run
- Hive tracks task state
- Multiple Ralph instances can run in parallel on non-overlapping files

🌱 *This is a seedling — based on our actual usage. Will grow as we learn more.*
