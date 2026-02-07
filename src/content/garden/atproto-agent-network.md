---
title: "AT Protocol as an Agent Network"
description: "How AT Protocol primitives map to AI agent identity, durable memory, and real-time coordination — now with a Cloudflare implementation path."
growthStage: "seedling"
topics: ["atproto", "agents", "decentralized", "identity", "memory", "coordination", "cloudflare"]
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

- **[Cirrus](https://github.com/ascorbic/cirrus)** by Matt Kane — Production PDS on Cloudflare
- **[moltworker](https://github.com/cloudflare/moltworker)** — OpenClaw on CF Sandbox ([blog](https://blog.cloudflare.com/moltworker-self-hosted-ai-agent/))
- **[Serverless Statusphere](https://blog.cloudflare.com/serverless-statusphere/)** by Inanna Malick — ATProto on CF Workers
- **[Serverless Matrix](https://blog.cloudflare.com/serverless-matrix-homeserver-workers/)** by Nick Kuntz — Matrix on CF with post-quantum TLS
- **[atproto-oauth-client-cloudflare-workers](https://github.com/nDimensional/atproto-oauth-client-cloudflare-workers)** — OAuth for CF Workers
- **[AT Protocol Docs](https://atproto.com)** — Official specs
