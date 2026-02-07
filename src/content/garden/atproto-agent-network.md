---
title: "AT Protocol as an Agent Network"
description: "Pi-powered agents on Cloudflare with atproto-style coordination. Private by default, encrypted by default, self-extending."
growthStage: "seedling"
topics: ["atproto", "agents", "decentralized", "identity", "memory", "coordination", "cloudflare", "pi", "encryption"]
planted: "2026-02-07"
updated: "2026-02-07"
draft: false
---

## The Question

Could the AT Protocol be more than a social network backbone? What if we treated it as a decentralized communication and memory network for AI agents?

This post maps atproto primitives to agent network requirements, explores existing implementations, and sketches a Cloudflare-native path forward.

## Prior Art: It Already Exists

Before building anything, study these:

- **[Cirrus](https://github.com/ascorbic/cirrus)** — Production-ready single-user PDS on Cloudflare Workers. Uses Durable Objects (SQLite) + R2. The reference implementation.
- **[moltworker](https://github.com/cloudflare/moltworker)** — OpenClaw running in Cloudflare Sandbox containers. Shows the infrastructure patterns.
- **[atproto-oauth-client-cloudflare-workers](https://github.com/nDimensional/atproto-oauth-client-cloudflare-workers)** — OAuth client patched for Workers runtime.

Cirrus handles single-user PDS. The interesting question is: what about N agents talking to each other?

## Why Pi as the Agent Runtime?

[Pi](https://github.com/badlogic/pi-mono) is what drives the agents. Not OpenClaw, not a custom runtime — Pi.

From [Armin Ronacher's deep dive](https://lucumr.pocoo.org/2026/1/31/pi/):

> "Pi's entire idea is that if you want the agent to do something that it doesn't do yet, you don't go and download an extension or a skill or something like this. You ask the agent to extend itself."

**What makes Pi special:**

- **Tiny core** — 4 tools: Read, Write, Edit, Bash. Shortest system prompt of any agent.
- **Extension system** — Extensions persist state into sessions. Hot reloading built-in.
- **Session trees** — Branch, navigate, rewind. Side-quests without wasting context.
- **Self-extending** — Agent builds its own tools and skills. Software building software.

OpenClaw is built on Pi. We're building an agent network on Pi. Each agent extends itself — no MCP, no community skills marketplace. The agent maintains its own functionality.

## Security: Private by Default

**ENCRYPTED BY DEFAULT. PRIVATE BY DEFAULT.**

| Layer | Protection |
|-------|------------|
| Transport | TLS 1.3 + X25519MLKEM768 (post-quantum) |
| At-rest | Per-agent X25519 encryption keys |
| Memory | Envelope encryption (DEK per record) |
| Sharing | Explicit key exchange for public/shared |

Privacy levels:
- **private** (default) — Only the agent can decrypt
- **shared** — DEK encrypted for specific recipients  
- **public** — Opt-in plaintext for network visibility

Every memory is encrypted. Public sharing requires explicit action.

## Why AT Protocol for Agents?

Atproto already ships the primitives we need:
- **Decentralized identity** via DIDs
- **Content-addressed repository** per identity
- **Schema enforcement** via Lexicons
- **Real-time firehose** for coordination

Instead of inventing another agent bus, we can assemble an agent network from proven, interoperable building blocks.

## Architecture: Cloudflare Edition

Cloudflare's primitives map surprisingly well to atproto's architecture:

| AT Protocol | Cloudflare | Notes |
|-------------|------------|-------|
| DID/Identity | Durable Objects | One DO per agent, holds keys and state |
| Repo (MST) | D1 + R2 | D1 for records, R2 for blobs |
| Lexicons | Zod schemas | Type validation at edge |
| Firehose | DO WebSockets + Queues | Real-time via DO, async via Queues |
| Relay | Worker + DO coordination | Aggregates events, routes messages |
| PDS | The whole stack | D1/R2/DO combined = mini-PDS |

```
┌─────────────────┐     ┌─────────────────┐
│    Agent A      │     │    Agent B      │
│   DID + Keys    │     │   DID + Keys    │
└────────┬────────┘     └────────┬────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│     PDS A       │     │     PDS B       │
│  Repo + XRPC    │     │  Repo + XRPC    │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     ▼
            ┌─────────────────┐
            │      Relay      │
            │    Firehose     │
            │   Aggregation   │
            └────────┬────────┘
                     │
                     ▼
            ┌─────────────────┐
            │  Coordination   │
            │    Workers      │
            │  Queue / Cache  │
            └────────┬────────┘
                     │
                     ▼
              Agent B reacts
```

## Identity: DIDs as Agent IDs

Every agent is a DID. Handles are optional and purely for display. The DID document publishes the repo signing key and PDS endpoint.

For Cloudflare-native identities, we can define `did:cf:<durable-object-id>` as a lightweight DID method, bridging to `did:plc` when atproto interop is needed.

**Key takeaways:**
- DIDs are canonical. Handles are UX only.
- DID documents provide both public keys and PDS discovery.
- Key rotation is a first-class workflow, not an afterthought.

## Memory: Repo as Source of Truth

Atproto repositories are signed, content-addressed Merkle trees (MSTs). Each agent repo is a durable, appendable memory log with a native audit trail.

We model memory as structured records in named collections:
- Stable record keys for de-duplication
- `tid` keys for chronological logs

**Memory patterns:**
- Structured facts and decisions live in dedicated collections
- Episodic notes are append-only and pruned via periodic summaries
- Large artifacts become blobs referenced by CID

For semantic retrieval, pair with Cloudflare Vectorize — atproto as source of truth, vector index as derived view.

## Lexicons: Agent-to-Agent Messaging Contracts

Lexicons are the schema layer. We define `agent.comms.*` records for typed agent coordination:

```typescript
// Zod schemas (compile from Lexicon JSON if needed)
const Message = z.object({
  $type: z.literal('agent.comms.message'),
  sender: z.string(),  // DID
  recipient: z.string(),  // DID
  thread: z.string().optional(),
  content: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('text'), text: z.string() }),
    z.object({ kind: z.literal('json'), data: z.unknown() }),
    z.object({ kind: z.literal('ref'), uri: z.string() }),
  ]),
  priority: z.number().int().min(1).max(5).default(3),
  createdAt: z.string().datetime(),
})
```

**Core message types:**
- `agent.comms.message` — direct agent messaging
- `agent.comms.broadcast` — swarm-wide announcements
- `agent.comms.request` / `agent.comms.response` — task workflows
- `agent.comms.handoff` — context transfer between agents

## Coordination: Firehose as the Agent Bus

The firehose streams repo updates in near real time. For coordination, agents filter commit events by collection prefix, then fetch matching records.

```
  Agent A          PDS A           Relay          Agent B
     │               │               │               │
     │──createRecord─▶               │               │
     │  (agent.comms │               │               │
     │   .message)   │               │               │
     │               │               │               │
     │               │──firehose────▶│               │
     │               │  commit event │               │
     │               │               │               │
     │               │               │──filtered────▶│
     │               │               │  commit event │
     │               │               │               │
     │               │◀──────────────────getRecord───│
     │               │               │   (at://...)  │
     │               │               │               │
     │               │───────────────────record─────▶│
     │               │               │               │
     │               │               │       handle message
     │               │               │               │
```

## What We Steal from moltworker

[moltworker](https://github.com/cloudflare/moltworker) runs OpenClaw in Cloudflare Sandbox containers. Key patterns to lift:

- **R2 backup/restore** — `src/gateway/sync.ts` syncs state every 5 min
- **Sandbox process management** — `src/gateway/process.ts` handles lifecycle
- **CF Access auth** — `src/auth/middleware.ts` validates JWTs
- **WebSocket proxy** — Message interception for error transformation

The Dockerfile base (`cloudflare/sandbox:0.7.0`) gives us a container environment for agents that need more than edge compute.

## Tradeoffs vs Centralized

**Pros:**
- Decentralized identity and portability across hosts
- Signed, portable memory log with native export (CAR)
- Built-in replication and interoperability
- Zero ops on Cloudflare (managed edge)

**Cons:**
- Public-by-default storage requires encryption for sensitive data
- Not federated with existing atproto network (without bridges)
- Not optimized for vector search (use Vectorize as derived index)
- Vendor lock-in to Cloudflare

**When to use this:**
- Private agent networks (enterprise, internal tools)
- Prototyping agent coordination patterns
- Edge-first applications where latency matters

**When to use full atproto:**
- Public agent interop with Bluesky ecosystem
- Decentralization as a core requirement

## POC Path

Using [Pi](https://github.com/badlogic/pi-mono) as the agent runtime (minimal, focused) on Cloudflare primitives:

1. **Single Agent**: Pi in Sandbox, identity, D1/R2 storage
2. **Agent Memory**: Record schemas, Vectorize semantic search
3. **Multi-Agent**: Coordinator DO, message lexicons, WebSocket relay
4. **Firehose**: Event streaming, subscriptions, cursors

Full spec: [joelhooks/atproto-agent-network](https://github.com/joelhooks/atproto-agent-network)

## Final Take

AT Protocol gives agents a decentralized identity, a tamper-evident memory log, and a shared coordination stream. Cloudflare gives us the infrastructure to run it at the edge without ops burden.

The most effective architecture is hybrid: atproto concepts for identity and memory, Cloudflare primitives for execution, and specialized systems (Vectorize) for fast retrieval.

Cirrus proves single-user PDS works on Cloudflare. The next step is multi-agent coordination.

## Sources

**Agent Runtime:**
- **[Pi Monorepo](https://github.com/badlogic/pi-mono)** by Mario Zechner — The agent runtime
- **[Pi: The Minimal Agent Within OpenClaw](https://lucumr.pocoo.org/2026/1/31/pi/)** by Armin Ronacher — Why Pi matters

**Cloudflare Infrastructure:**
- **[Cirrus](https://github.com/ascorbic/cirrus)** by Matt Kane — Production PDS on Cloudflare
- **[moltworker](https://github.com/cloudflare/moltworker)** — OpenClaw on CF Sandbox ([blog](https://blog.cloudflare.com/moltworker-self-hosted-ai-agent/))
- **[Serverless Statusphere](https://blog.cloudflare.com/serverless-statusphere/)** by Inanna Malick — ATProto on CF Workers
- **[Serverless Matrix](https://blog.cloudflare.com/serverless-matrix-homeserver-workers/)** by Nick Kuntz — Matrix on CF with post-quantum TLS
- **[atproto-oauth-client-cloudflare-workers](https://github.com/nDimensional/atproto-oauth-client-cloudflare-workers)** — OAuth for CF Workers

**Protocol:**
- **[AT Protocol Docs](https://atproto.com)** — Official specs

**Full Spec:**
- **[joelhooks/atproto-agent-network](https://github.com/joelhooks/atproto-agent-network)** — Implementation details and PI-POC.md
