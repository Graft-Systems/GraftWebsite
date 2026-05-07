# Stream 11 — Per-Tenant AI-Agent Architecture for Graft Spray

*Research brief · category `11_agent-architecture` · ~25 sources*

---

## 1. Background & Framing

The user's concept: each vineyard farm receives its own AI agent identified by an **AgentMail email address** (e.g., `oak-ridge-farm@agentmail.to`). The agent self-registers with a central cloud hub and performs four duties:

| Duty | Cadence | Notes |
|---|---|---|
| (a) Ingest sensor digests + weather/satellite | Daily | Structured data push via HTTP or email |
| (b) Emit spray verdict + 7-day forecast with citations | Daily | Email to grower + portal |
| (c) Field grower questions | On-demand | Email/chat reply loop |
| (d) Trigger scout tasks | Event-driven | Disease threshold crossed → push task |

The user explicitly wants a **survey of the space**. This brief evaluates eight candidate architectures, scores them across nine dimensions, and recommends a phased path.

---

## 2. Candidate Frameworks and Services

### 2.1 AgentMail (`agentmail.to`)

[AgentMail](https://agentmail.to) is a purpose-built email-inbox API for AI agents — described as "Gmail, but for agents." It provides programmatic inbox creation, REST/webhook delivery, thread management, semantic search, and structured data extraction from inbound messages [S1].

**What it actually is:** A managed email infrastructure layer. AgentMail does *not* include an LLM, orchestration engine, or memory store — it handles only the email I/O surface. An agent self-registers via a CLI/API (`agentmail agent sign-up`), receives an API key, and can immediately create inboxes and exchange messages [S2].

**Key features confirmed from docs:**
- `inboxes.create()` creates an inbox in milliseconds, with optional custom domain, idempotent via `client_id`
- Inbound messages delivered via webhook or WebSocket; no polling required
- `extracted_text` / `extracted_html` strips quoted reply history automatically [S2]
- Semantic search across all inboxes in an org
- Automatic email labeling via user-defined prompts
- Structured data extraction from unstructured emails [S1]

**SPF/DKIM/DMARC:** AgentMail provisions all three authentication records automatically on custom-domain setup. SPF uses `include:agentmail.to`, DKIM uses AgentMail-managed CNAME-based signing keys, and DMARC defaults to `p=reject` with aggregate reporting. For a new domain, staged rollout (`p=none` → `p=quarantine` → `p=reject`) is recommended [S3].

**Pricing (verified from agentmail.to/pricing):**

| Tier | Price | Inboxes | Emails/mo | Storage | Domains |
|---|---|---|---|---|---|
| Playground | Free | 3 | 3,000 | 3 GB | Default only |
| Developer | $20/mo | 10 | 10,000 | 10 GB | 10 |
| Starter | $100/mo | 50 | 50,000 | 50 GB | 50 |
| Enterprise | $500/mo | 300 | 300,000 | 300 GB | 300 |
| Custom | Negotiated | Unlimited | Custom | Custom | Unlimited |

At scale: 300 farms = Enterprise ($500/mo, 300 inboxes). **1,000 farms requires Custom pricing.** There is no published per-inbox overage rate — Custom is the only stated path above 300 [S4].

**Tenant isolation model:** Each inbox has a unique inbox ID and is scoped to an organization API key. Inbox-level isolation is logical, not cryptographic — all inboxes in an org share one API key. Farm-level separation requires application-layer key management or sub-org design (not documented as of writing).

**Audit trail:** Email threads are stored and searchable; no explicit immutable audit log / WORM storage mentioned in docs. Retention policy not published [S1].

**Open-source escape hatch:** AgentMail is a proprietary SaaS. No self-hosted option exists.

---

### 2.2 LangGraph (LangChain)

[LangGraph](https://www.langchain.com/langgraph) is an open-source, MIT-licensed graph-based agent orchestration framework from LangChain [S5]. It models agent workflows as directed graphs of stateful nodes. A hosted platform ("LangGraph Platform," now rebranded "LangSmith Deployment") offers managed cloud deployment [S6].

**Multi-tenant pattern:** Each farm maps to a `thread_id` in the PostgreSQL checkpointer. Tenant isolation is achieved via a separate `conversations` table with `tenant_id` + `user_id` columns, PostgreSQL Row-Level Security (RLS) policies enforcing tenant-scoped access, and `thread_id` treated as a foreign key to the `conversations` table [S7]. This is a community-documented pattern, not an official first-party feature.

**Persistence:** `PostgresSaver` / `AsyncPostgresSaver` stores checkpoints, writes, blobs, and migrations across four Postgres tables. Supports pause/resume (human-in-the-loop) and time-travel replay [S8].

**Email-as-IO:** LangGraph has no built-in email integration. Email ingress requires pairing with a custom inbound webhook (Postmark, SES, etc.).

**Pricing:**

| Plan | Price | Notes |
|---|---|---|
| Open Source | $0 | Self-hosted, MIT; no node limits |
| Developer | $0 (100k nodes/mo free) | Self-hosted server |
| Plus | $0.001/node + $0.0036/min prod standby + $39/user/mo LangSmith | Managed cloud |
| Enterprise | Custom | BYOC / self-hosted data plane |

For 10,000 farm-scale: if each farm emits 1 daily digest + 5 queries/day = ~60 nodes/day/farm × 10,000 = 600,000 nodes/day = ~$600/day on Plus → **LangGraph Cloud does not scale economically.** Self-hosted open-source is the correct path [S6].

**Vendor lock-in:** Low — core library is MIT-licensed and portable. Checkpointer backends (Postgres, Redis) are swappable [S9].

---

### 2.3 CrewAI

[CrewAI](https://crewai.com) is an open-source, role-based multi-agent framework. Agents are defined as "crew members" with specific roles, backstories, and tools; crews collaborate on defined tasks [S10].

**Multi-tenant relevance:** CrewAI's execution model is workflow-centric (one crew = one workflow run). It is not designed for long-lived, always-on per-tenant agents. Spinning up 10,000 simultaneously-active farm agents is not a natural fit for CrewAI's crew execution paradigm.

**Pricing (cloud platform):**

| Plan | Price | Executions/mo | Live Crews |
|---|---|---|---|
| Open Source | $0 | Unlimited (self-hosted) | Unlimited |
| Basic | $99/mo | 100 | 2 |
| Standard | $6,000/yr | 1,000 | 5 |
| Pro | $12,000/yr | 2,000 | 10 |
| Enterprise | $60,000/yr | 10,000 | 50 |
| Ultra | $120,000/yr | 500,000 | 100 |

At 1,000 farms running 1 crew/day = 30,000 executions/month → requires Ultra ($120k/yr) or self-hosted open-source. Execution cap model (no pay-as-you-go overage) makes cloud-hosted CrewAI economically awkward for farm-scale [S10].

**Memory:** CrewAI integrates with external memory stores but has no native long-term persistence comparable to Letta.

**Email-as-IO:** None native.

---

### 2.4 Letta (formerly MemGPT)

[Letta](https://www.letta.com) is a stateful agent framework built around persistent, editable memory blocks [S11]. The MemGPT operating-system analogy — context window as RAM, external storage as disk — provides agents with effectively unlimited memory through tiered retrieval [S12].

**Memory architecture:**
- **Core memory:** In-context blocks (user profile, farm parameters, persona) always pinned to context
- **Recall memory:** Full conversational history, searchable, persists to disk automatically
- **Archival memory:** Vector DB / graph DB–backed externally stored knowledge
- **Sleep-time compute:** Asynchronous memory agents refine and reorganize memory during idle periods [S13]

**Multi-tenant fit:** Letta API plan offers **unlimited agents** at $0.10/active agent/month, making it economically viable for per-farm agent deployment. Each agent maintains its own persistent state, memory blocks, and conversation history [S14].

**Pricing:**

| Plan | Price | Agents | Notes |
|---|---|---|---|
| Free | $0 | Limited | Development |
| Pro | $20/mo | Up to 20 | Personal use |
| API Plan | $20/mo base + $0.10/active agent/mo | Unlimited | Org use |

At 1,000 active farms: $20 + $100 = **$120/mo** for the Letta API layer (plus LLM token costs). At 10,000 farms: ~$1,020/mo [S14].

**Email-as-IO:** No native email integration; requires custom inbound webhook coupling.

**Open-source:** Apache 2.0 licensed core; self-hostable [S11].

**GDPR/data residency:** Self-hosted Letta gives full data residency control.

---

### 2.5 OpenAI Assistants API / Responses API

OpenAI launched the Assistants API in 2023 and has since announced migration to the **Responses API** (Prompts + Conversations paradigm) [S15].

**What changed:**
- Assistants → Prompts (versioned behavioral configs)
- Threads → Conversations (stream of items, not just messages)
- Runs → Responses (input items in, output items out)

**Multi-tenant threads:** Each farm maps to a `conversation_id` with `metadata: {tenant_id, user_id}`. OpenAI does not enforce tenant isolation at the API level — isolation is application-layer [S16].

**Managed memory:** Conversations are stored server-side; file search tool enables RAG over uploaded documents. No explicit long-term memory beyond conversation history.

**Email-as-IO:** None native. Requires custom inbound email routing to trigger API calls.

**Pricing:** Token-based (gpt-4.1: $2.50/M input, $15.00/M output; gpt-4.1-mini: $0.40/M input, $1.60/M output). No platform fee per agent [S17].

**Vendor lock-in:** High — Assistants/Responses API is proprietary OpenAI. Conversations do not export in standard format. Migration to another provider requires re-implementation.

**GDPR:** DPA available; 30-day data retention for abuse monitoring; Zero Data Retention (ZDR) available at Enterprise tier [S18].

---

### 2.6 Anthropic Claude Agents (Computer Use, Tools)

Anthropic's approach is model-API + tool use + developer-designed harness rather than a managed agent platform [S19]. The **Claude Agent SDK** supports long-running multi-context-window workflows through structured harness design.

**Long-running agent patterns (from Anthropic engineering blog):**
- Initializer agent: establishes environment, feature list, git repo, progress file
- Coding/task agent: reads progress file, works incrementally, commits state
- Context compaction handles context overflow, but is not sufficient alone
- Clean-state handoff between context windows is the key engineering challenge [S20]

**Computer use:** Claude 3.5+ supports `computer_use` tool for browser/GUI automation, relevant for scraping weather portals if APIs are unavailable.

**Multi-tenant:** No managed multi-tenancy. Each farm's conversation state must be managed by the application layer (separate conversation objects / metadata tags).

**Pricing:** claude-3-5-sonnet: $3.00/M input, $15.00/M output; claude-3-haiku: $0.25/M input, $1.25/M output [S17].

**Email-as-IO:** None native.

**Vendor lock-in:** High for model dependency; however, tool definitions are transferable across LLM providers if using a framework layer.

**GDPR:** 90-day data retention by default; DPA available [S18].

---

### 2.7 Custom Email-Ingress (Postmark / SendGrid / AWS SES → Lambda → Custom Agent Loop)

The DIY baseline: route all farm agent email through a managed inbound email parsing service, triggering a custom agent loop.

**Postmark Inbound:** Parses incoming emails into structured JSON payloads (From, To, headers, SpamAssassin score, `StrippedTextReply` for clean reply text, attachments). Posts JSON to a configured webhook. No per-inbox pricing — billed per email processed. `MailboxHash` (plus-addressing: `farm123+ticket@inbound.postmarkapp.com`) enables farm-level routing in a single inbox [S21].

**AWS SES → Lambda:** SES receives email on owned domains, runs SPF/DKIM/spam checks, stores message body in S3, invokes Lambda with headers-only event. Lambda fetches full body from S3. Per-email cost: ~$0.10/1,000 received messages (SES) + Lambda invocation ($0.20/1M) [S22]. Requires full DNS management (SPF `include:amazonses.com`, SES-provided DKIM TXT records, DMARC policy).

**SendGrid Inbound Parse:** Similar to Postmark; POSTs multipart/form-data to configured URL. Free plan includes 100 inbound emails/day [S23].

**Custom agent loop:** After parsing, messages are enqueued (SQS/Pub-Sub), a worker retrieves farm context from the data lake, calls the LLM API, and replies via the sending path (SES, Postmark, SendGrid). Reply threading requires preserving `Message-ID` and setting `In-Reply-To` / `References` headers.

**Advantages:** Zero vendor lock-in on email layer; full control of DNS/deliverability; cheapest at scale; per-farm routing via plus-addressing or subdomain MX.

**Disadvantages:** 2–4 weeks to build a production-quality stack; requires operational expertise in deliverability, bounce handling, unsubscribe management.

---

### 2.8 Pure-API Alternative (No Per-Farm Agent)

The "do nothing fancy" baseline: a single shared inference service with per-farm configuration stored in a database. No agent identity, no persistent agent state, no email loop.

**Architecture:**
1. Cron job triggers daily for each active farm
2. System fetches farm config (thresholds, pest models, weather location)
3. Calls shared LLM API with farm-specific context injected into prompt
4. LLM returns spray verdict + forecast
5. System emails grower via standard transactional email (SendGrid / SES)
6. Grower replies → webhook → same shared inference, farm context looked up by sender

**Advantages:**
- Simplest possible architecture
- No agent framework overhead
- Cheapest to build and operate at small scale
- No per-farm email inbox provisioning
- Full GDPR control (data entirely in your DB)

**Disadvantages:**
- No persistent agent memory — each invocation is stateless; historical context must be explicitly assembled in every prompt
- No agent identity — growers cannot "email their agent" as a distinct entity
- Harder to scale Q&A to natural conversation style
- No audit trail of agent reasoning unless explicitly logged
- Context window management entirely manual

At MVP stage (< 50 farms), this is the lowest-friction path. The lack of persistent per-farm memory is a real capability ceiling at scale.

---

## 3. Scoring Matrix

Scoring: **1 = poor / 5 = excellent**. Cost scores assume 100 / 1k / 10k farms.

| | **Tenant isolation** | **Durable memory** | **Email-as-IO** | **Audit / compliance** | **Cost @ 100 farms** | **Cost @ 1k farms** | **Cost @ 10k farms** | **Vendor lock-in** | **Time-to-MVP** | **GDPR/CCPA fit** | **OSS escape hatch** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **AgentMail** | 3 | 1 | 5 | 2 | 4 | 2 | 1 | 2 | 5 | 2 | 1 |
| **LangGraph (self-hosted)** | 4 | 4 | 2 | 4 | 5 | 5 | 5 | 5 | 2 | 5 | 5 |
| **LangGraph Cloud (Plus)** | 4 | 4 | 2 | 3 | 3 | 1 | 1 | 3 | 3 | 3 | 4 |
| **CrewAI (open source)** | 3 | 2 | 2 | 3 | 5 | 4 | 4 | 5 | 3 | 4 | 5 |
| **Letta API** | 4 | 5 | 2 | 3 | 5 | 5 | 4 | 3 | 2 | 4 | 4 |
| **OpenAI Responses API** | 2 | 3 | 2 | 2 | 4 | 3 | 2 | 1 | 4 | 2 | 1 |
| **Anthropic Claude API** | 2 | 2 | 2 | 2 | 4 | 3 | 2 | 2 | 4 | 2 | 2 |
| **Custom email-ingress** | 5 | 3 | 5 | 5 | 3 | 4 | 5 | 5 | 1 | 5 | 5 |
| **Pure-API baseline** | 5 | 1 | 3 | 4 | 5 | 4 | 4 | 5 | 1 | 5 | 5 |

**Score justifications (selected):**

| Candidate | Tenant isolation | Durable memory | Email-as-IO | Audit / compliance | Cost @ 100 | Cost @ 1k | Cost @ 10k | Vendor lock-in | Time-to-MVP | GDPR/CCPA | OSS escape |
|---|---|---|---|---|---|---|---|---|---|---|---|
| AgentMail | Logical inbox isolation per farm (3); shared org API key is a concern (−2) | No memory layer — email-only I/O, no state persistence | Native inbox creation + webhook + thread management (5) | Email threads stored but no immutable audit log or stated retention policy | $500/mo Enterprise covers 300 farms (4) | Custom pricing required (2) | Unknown cost; no published rate (1) | Proprietary SaaS, no self-host option | Fastest email-IO path; 1-day integration | No DPA, no data residency doc, no deletion API for email data | None |
| LangGraph self-hosted | PostgreSQL RLS per thread_id enforces strong logical isolation (4); physical isolation requires separate DB schemas (extra effort) | PostgresSaver provides durable checkpoints; supports pause/resume/time-travel (4) | No native; requires Postmark/SES coupling (2) | Full control — implement WORM logs, structured audit trail, immutable storage yourself (4) | Self-hosted: only infra cost (5) | Linear infra scale; PostgreSQL handles 1k threads trivially (5) | Same; horizontal sharding needed at extreme scale (5) | MIT license; Postgres checkpointer is commodity storage; no lock-in (5) | 2–3 weeks to production-quality setup (2) | Full data residency control; DPA with any LLM provider; deletion is a DB row delete (5) | Full OSS, self-hostable |
| Letta API | Separate agent per farm (agent ID = farm ID); memory blocks are per-agent isolated (4) | Best-in-class: core/recall/archival memory tiers, sleep-time compute, automatic persistence (5) | No native email I/O; requires custom webhook coupling (2) | Partial — Letta logs tool calls; no built-in compliance audit export; self-hosted gives full control (3) | $0.10/agent/mo × 100 = $10 + base (5) | $100/mo Letta layer (5); LLM tokens are separate | $1,000/mo Letta layer (4); manageable | Apache 2.0 core; self-hostable alternative exists but less polished | Letta client SDKs simple; 1–2 weeks for memory integration (2) | Self-hosted: excellent. Hosted: 90-day retention concern; DPA needed (4) | Apache 2.0, self-hostable |
| Custom email-ingress | Strongest: you own the routing, RLS, and encryption keys (5) | Depends on what you build — if backed by vector DB + structured store, can be excellent (3) | Native (5) | You control every log; immutable append-only store trivially implementable (5) | Dev cost high; infra $20–50/mo (3) | SES ~$0.10/1k emails; near-zero marginal cost (4) | Near-zero marginal (5) | Zero lock-in — standard DNS/SMTP ecosystem (5) | Highest build time (1–2 months) | Full control; deletion is a DB delete (5) | Fully custom |
| Pure-API baseline | Strongest: farm config in your DB, no external state (5) | Stateless — history assembled per-call from DB (1) | Transactional email only — not a two-way agent identity (3) | Full control, you log everything (4) | Near-zero platform cost (5) | Near-zero (4) | Near-zero (4) | No lock-in (5) | Fastest overall (1 week) (1) | Full control (5) | Full custom |

---

## 4. Recommended Path

### Verdict on AgentMail

AgentMail is **genuinely useful for the email I/O surface**, and the user's instinct is directionally correct: per-farm email identity is a compelling UX. AgentMail's auto-provisioned SPF/DKIM/DMARC removes a real operational burden. However, AgentMail is **an email plumbing service, not an agent framework.** It provides no LLM, no memory, no orchestration, no audit trail, and no GDPR compliance tooling. At 1,000+ farms, the pricing model has no documented path — "Custom" is the only option above 300 inboxes. The proprietary SaaS-only model with no published data retention or DPA means it cannot be the sole data layer for GDPR-regulated farms.

**Recommendation: use AgentMail for email I/O only, not as the agent platform.** Pair it with a proper orchestration + memory layer.

---

### Recommended Architecture: Hybrid — LangGraph (Self-Hosted) + AgentMail + Letta Memory

#### Phase 1 — MVP (Months 1–3, < 100 farms)

**Stack:**
- **Orchestration:** Pure-API baseline with LangGraph graph structure (single agent template, parameterized per farm)
- **Memory:** PostgreSQL with farm-specific `thread_id` rows; simple context window stuffing
- **Email I/O:** AgentMail Developer ($20/mo covers 10 inboxes for beta farms) → Starter ($100/mo for 50 farms)
- **Inbound routing:** AgentMail webhook → Lambda/worker → LLM API → AgentMail send reply
- **Outbound daily digest:** Standard transactional email (Postmark / SES) from a shared address

**Justification:** Fast to ship. AgentMail solves the email identity problem without DNS complexity. LangGraph's PostgresSaver provides basic durability. No Letta overhead at small scale.

**Cost estimate (50 farms):** AgentMail Starter $100/mo + LLM tokens (~$0.05/farm/day × 50 = $75/mo) + hosting ≈ **$250–350/mo**.

---

#### Phase 2 — Growth (Months 4–12, 100–1,000 farms)

**Stack:**
- **Orchestration:** LangGraph self-hosted with `AsyncPostgresSaver`, PostgreSQL RLS per `tenant_id`
- **Memory:** Migrate to **Letta API Plan** ($0.10/active agent/month) for farms that have accumulated > 30 days of history; Letta's core/recall/archival memory tiers replace manual context assembly
- **Email I/O:** AgentMail Enterprise ($500/mo for 300 farms); negotiate Custom for 300–1,000 farms, OR migrate email I/O to custom SES stack if AgentMail pricing becomes prohibitive
- **Data lake integration:** LangGraph nodes read from/write to the secure S3 data lake; Letta archival memory indexes farm sensor history in a vector DB (pgvector or Pinecone)
- **Scout task triggers:** LangGraph edge conditions emit task creation events to the scout task queue

**Decision gate at ~300 farms:** If AgentMail Custom pricing is not competitive, replace with **AWS SES + S3 + Lambda inbound** (full DNS control, ~$0.10/1,000 emails, near-zero marginal cost). Email identity (`farm-oak-ridge@graftspray.com`) is preserved via SES subdomain routing.

**Cost estimate (1,000 farms):** AgentMail Custom (est. $1,000–2,000/mo) OR SES (~$50/mo) + Letta API ($120/mo) + LLM tokens (~$1,500/mo) + hosting ≈ **$2,000–3,500/mo** total.

---

#### Phase 3 — Scale (Year 2+, 1,000–10,000 farms)

**Stack:**
- **Email I/O:** Custom SES stack; AgentMail is replaced (cost and control)
- **Orchestration:** LangGraph self-hosted on Kubernetes, Postgres with horizontal sharding per region (EU vs US data residency)
- **Memory:** Letta API Plan ($1,020/mo for 10k farms) OR self-hosted Letta (Apache 2.0) on your own K8s cluster (higher DevOps cost, full control)
- **Compliance:** Per-tenant encrypted PostgreSQL schemas (or RLS); Letta agent files exportable in `.af` (Agent File) format for portability [S14]; full deletion via agent + DB row removal

**Total platform cost at 10,000 farms (rough):** SES ~$100/mo + Letta self-hosted ~$500/mo infra + LLM tokens ~$15,000/mo + hosting/ops ~$2,000/mo ≈ **$18,000/mo**. Per-farm: **$1.80/farm/month** in platform costs, excluding LLM inference.

---

### Why Not CrewAI?

CrewAI's role-based crew model is oriented toward *workflows* (a crew executes a task), not *long-lived per-tenant agents*. It has no built-in memory beyond the conversation window, and the cloud platform's execution-cap pricing model is economically punishing at 1,000+ farms. The open-source library is viable but adds no differentiation over LangGraph's more flexible graph model.

### Why Not OpenAI Responses API or Anthropic Claude API as the Platform?

Both are excellent LLM APIs and should be used as the **inference layer** within the above stack. Neither provides agent orchestration, persistent memory, multi-tenant isolation, or email I/O. OpenAI's Responses API stores conversation history server-side but offers no deletion API, no data residency outside the US (standard tier), and no per-tenant export primitive — a GDPR liability. Use them as the model backend, not the architecture backbone.

---

## 5. Data Lake & Memory Implications

### Interaction with the Secure Data Lake

The farm data lake stores sensor ingests, weather/satellite signals, historical spray records, and audit logs. The agent architecture must integrate at three layers:

**Write path (daily ingest → agent):**
- Sensor digests land in S3 (partitioned by `farm_id/date/`)
- A daily Lambda/Fargate job reads the digest, calls the LangGraph workflow
- The workflow fetches the farm's Letta memory context (core memory block: farm crop, region, thresholds), runs the spray verdict chain, and writes:
  - The verdict + forecast to the lake (append-only, for audit)
  - An updated memory block to Letta (e.g., "last spray date," "cumulative degree-days")
  - The outbound email to AgentMail/SES

**Read path (grower Q&A):**
- Incoming email → inbound webhook → LangGraph node
- Node queries Letta recall memory (prior conversations) and archival memory (sensor history vector search)
- Constructs context-rich prompt → LLM → reply

**GDPR/CCPA compliance integration:**

| Requirement | Implementation |
|---|---|
| Per-user export | Export LangGraph `checkpoints` rows + Letta agent file (`.af`) + S3 prefix dump for `farm_id` |
| Per-user deletion | `DELETE FROM checkpoints WHERE thread_id IN (SELECT id FROM conversations WHERE tenant_id = $farm_id)`; Letta agent deletion API; S3 Object Delete with versioning tombstone |
| Granular consent | Consent flags stored in farm config table; LangGraph graph checks consent flag before writing to memory or external services |
| Tenant isolation | PostgreSQL RLS on all tables keyed by `tenant_id`; separate Letta agent per farm (agent ID = farm UUID) |
| Encrypted at rest | AWS S3 SSE-KMS (per-tenant CMK); PostgreSQL `pgcrypto` for sensitive fields; Letta self-hosted with encrypted EBS/volume |
| Encrypted in transit | TLS 1.3 for all API calls; AgentMail/SES both enforce TLS for SMTP relay |
| Audit immutability | Verdict + reasoning logs written to S3 with Object Lock (WORM) enabled on the audit prefix; CloudTrail for infrastructure actions |
| Data minimization | LangGraph nodes have explicit "what to remember" instructions; Letta sleep-time agents prune low-signal memories automatically |

**Key design principle:** The Letta agent's core memory block for each farm is small (< 2,000 tokens): farm name, crop variety, region, current spray calendar, last action date, active disease pressure. The archival memory stores the full sensor/weather history and is retrieved via vector search only when needed. This minimizes PII surface in any single context window.

---

## 6. Email Identity & Deliverability

If email-as-IO is used (recommended for grower-facing interaction), the following applies:

### SPF/DKIM/DMARC Setup

**Using AgentMail with custom domain (`farm@graftspray.com`):**
1. Add `include:agentmail.to` to your domain's SPF TXT record (merge, do not duplicate)
2. Add AgentMail's CNAME-based DKIM record (`agentmail._domainkey.graftspray.com`)
3. Start DMARC at `p=none` with `rua=mailto:dmarc@graftspray.com` for 2–4 weeks monitoring
4. Graduate to `p=quarantine` then `p=reject` once all sending paths are confirmed [S3]

**Using AWS SES with custom subdomain (`farm@agents.graftspray.com`):**
1. Add SES domain verification TXT record
2. Add SES-provided CNAME-based DKIM records (automatically managed by SES)
3. Add SPF: `v=spf1 include:amazonses.com ~all`
4. Set DMARC on `_dmarc.agents.graftspray.com`

**Subdomain isolation strategy:** Strongly recommended to use a subdomain (`agents.graftspray.com` or `farms.graftspray.com`) rather than the root domain. This prevents any deliverability issues from agent email (high volume, automated) from contaminating the root domain's reputation (used for marketing/transactional email from humans).

### Reply Threading

Email reply threading relies on `Message-ID`, `In-Reply-To`, and `References` headers. AgentMail automatically handles threading for its managed inboxes. In a custom SES stack, the application must:
- Generate a unique `Message-ID` for each outbound message
- Store `Message-ID` in the conversation record
- On reply, set `In-Reply-To: <original-message-id>` and append to `References`
- AgentMail's `extracted_text` already strips quoted reply history, a real convenience

### Spam Classification Risk

Automated farm-agent emails have several spam risk factors:
- **High volume, repetitive content:** Daily spray verdicts from the same sender look like bulk email. Mitigate with per-farm unique `Message-ID`, personalized subject lines (`Spray Verdict — Oak Ridge Farm — June 14`), and unsubscribe links
- **New domain/subdomain:** Use a subdomain with warm-up period (ramp from 100/day to full volume over 4–6 weeks)
- **Attachment handling:** If citing satellite images, prefer hosted links over inline attachments (reduces spam score)
- **Feedback loop registration:** Register with Gmail Postmaster Tools and Microsoft JMRP to monitor spam rate; aim for < 0.1%
- **Bounce management:** Hard bounces must be removed within 24 hours (SES automatically suppresses; AgentMail's policy not documented)

---

## 7. Summary Recommendation Table

| Phase | Email I/O | Orchestration | Memory | Estimated cost/100 farms |
|---|---|---|---|---|
| MVP (< 100 farms) | AgentMail Starter | LangGraph self-hosted + Postgres | PostgreSQL checkpoints | ~$300/mo |
| Growth (100–1k) | AgentMail Enterprise → evaluate Custom vs SES migration | LangGraph + Postgres RLS | Letta API Plan | ~$2,000–3,500/mo |
| Scale (1k–10k) | Custom AWS SES stack | LangGraph on K8s | Letta API or self-hosted | ~$18,000/mo |

**AgentMail:** Use it — it's the fastest path to per-farm email identity and handles SPF/DKIM/DMARC. Watch the pricing cliff above 300 farms and plan a migration trigger if Custom pricing exceeds the SES alternative.

**LangGraph:** The orchestration layer. MIT-licensed, self-hostable, Postgres-backed, excellent multi-tenant patterns, no per-node cloud fees at self-hosted scale.

**Letta:** The memory layer. Best-in-class persistent agent memory, $0.10/active agent/month on the API plan, Apache 2.0 for self-hosting. Eliminates the "assemble all history into every prompt" problem that breaks at 1,000+ farm scale.

**Pure-API baseline:** Build it first. Get 10 farms working with simple prompt assembly + transactional email before adding framework complexity. The transition to LangGraph + Letta is straightforward and preserves the existing data model.

---

## Sources

| Ref | Title | Org | Year | Type | URL |
|---|---|---|---|---|---|
| S1 | AgentMail — Email Inbox API for AI Agents (homepage) | AgentMail | 2025 | Product | https://agentmail.to |
| S2 | AgentMail Quickstart Documentation | AgentMail | 2026 | Docs | https://docs.agentmail.to/quickstart |
| S3 | How do I set up SPF, DKIM, and DMARC? | AgentMail | 2026 | Docs | https://www.agentmail.to/docs/knowledge-base/spf-dkim-dmarc |
| S4 | AgentMail Pricing | AgentMail | 2025 | Pricing | https://agentmail.to/pricing |
| S5 | LangGraph: Agent Orchestration Framework | LangChain | 2025 | Product | https://www.langchain.com/langgraph |
| S6 | LangGraph Pricing Guide: How Much Does It Cost? | ZenML Blog | 2025 | Analysis | https://www.zenml.io/blog/langgraph-pricing |
| S7 | Multi-tenant / per-user checkpoint querying with AsyncPostgresSaver | LangChain Forum | 2025 | Forum | https://forum.langchain.com/t/multi-tenant-per-user-checkpoint-querying-with-asyncpostgressaver/2604 |
| S8 | Mastering LangGraph Checkpointing: Best Practices for 2025 | Sparkco AI | 2025 | Blog | https://sparkco.ai/blog/mastering-langgraph-checkpointing-best-practices-for-2025 |
| S9 | LangSmith Plans and Pricing | LangChain | 2025 | Pricing | https://www.langchain.com/pricing |
| S10 | CrewAI Pricing Guide: Plans and Features | ZenML Blog | 2025 | Analysis | https://www.zenml.io/blog/crewai-pricing |
| S11 | Letta's Next Phase | Letta | 2026 | Blog | https://www.letta.com/blog/our-next-phase |
| S12 | Agent Memory: How to Build Agents that Learn and Remember | Letta | 2025 | Blog | https://www.letta.com/blog/agent-memory |
| S13 | Sleep-time Compute | Letta | 2025 | Research | https://www.letta.com/blog/sleep-time-compute (inferred from blog index) |
| S14 | Letta Pricing | Letta | 2025 | Pricing | https://www.letta.com/pricing |
| S15 | Assistants Migration Guide (Responses API) | OpenAI | 2025 | Docs | https://platform.openai.com/docs/assistants/overview |
| S16 | Multitenant Azure OpenAI isolation patterns | Microsoft / GitHub | 2024 | Docs | https://github.com/microsoftdocs/architecture-center/blob/main/docs/guide/multitenant/service/openai.md |
| S17 | OpenAI API Pricing | OpenAI | 2025 | Pricing | https://openai.com/api/pricing/ |
| S18 | AI Agent Security: GDPR, HIPAA & SOC 2 Requirements | P0stman | 2025 | Guide | https://p0stman.com/guides/ai-agent-security-data-privacy-guide-2025.html |
| S19 | Tool Use with Claude — Agents and Tools Overview | Anthropic | 2025 | Docs | https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview |
| S20 | Effective Harnesses for Long-Running Agents | Anthropic Engineering | 2025 | Blog | https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents |
| S21 | Inbound Email Processing — Postmark | Postmark | 2025 | Docs | https://postmarkapp.com/inbound-email |
| S22 | Replace Traditional Email Polling with SES + Lambda | AWS Blog | 2021 | Blog | https://aws.amazon.com/blogs/messaging-and-targeting/replace-traditional-email-mailbox-polling-with-real-time-reads-using-amazon-ses-and-lambda/ |
| S23 | Inbound Webhook — Postmark Developer Documentation | Postmark | 2025 | Docs | https://postmarkapp.com/developer/webhooks/inbound-webhook |
| S24 | Email Deliverability for AI Agents: SPF, DKIM, DMARC | Reddit r/aiagents | 2026 | Community | https://www.reddit.com/r/aiagents/comments/1smef3h/email_deliverability_for_ai_agents_what_spf_dkim/ |
| S25 | GDPR-Compliant AI Agents 2026: Enterprise Security | Technova Partners | 2026 | Guide | https://technovapartners.com/en/insights/security-gdpr-enterprise-ai-agents |
| S26 | Build Multi-Agent Systems with LangGraph and Amazon Bedrock | AWS ML Blog | 2025 | Blog | https://aws.amazon.com/blogs/machine-learning/build-multi-agent-systems-with-langgraph-and-amazon-bedrock/ |
| S27 | Choosing the Right Multi-Agent Architecture | LangChain Blog | 2026 | Blog | https://www.langchain.com/blog/choosing-the-right-multi-agent-architecture |
| S28 | Letta Introduction Documentation | Letta | 2026 | Docs | https://docs.letta.com |
| S29 | CrewAI Framework 2025 Complete Review | Latenode | 2026 | Review | https://latenode.com/blog/ai-frameworks-technical-infrastructure/crewai-framework/crewai-framework-2025-complete-review-of-the-open-source-multi-agent-ai-platform |
