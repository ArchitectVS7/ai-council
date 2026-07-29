# AI Council v2 — Product Requirements Document (Rebuild)

**Status:** Draft for rebuild kickoff
**Supersedes:** `01-PRD-As-Built.md` (retained as historical record only)
**Date:** 2026-07-27
**Amendments:** A1 (2026-07-28, convener directive at the T-016 gate) — per-session model selection: `sessions` gains a nullable `model` column, the new-session form gains a model picker (curated per-provider list, default = env `LLM_MODEL`), and the Chamber shows the effective model. Per-persona overrides remain deferred (§13).
A2 (2026-07-28, convener decision after the M1 gate) — **privacy/local-first positioning**: a `local` LLM provider (OpenAI-compatible base URL — Ollama/LM Studio/vLLM; no API key) joins the provider set, `LLM_BASE_URL` joins the env-var set (now six), §4.1 states the product's reason to exist, §11 gains the sufficiency kill-test, and the fully-private deployment path (local model + local Postgres) is documented. Implemented by task T-030b.
A3 (2026-07-28, convener directive at the T-024 gate) — **council directive**: councils gain an optional `directive` text field fed to every member (the Chair included) on every turn, entering the session snapshot at creation. Unlike `description`, which remains display-only. Closes the UX trap where the description box looks like it should influence behavior but doesn't. Implemented by task T-031b.

---

## 1. One-Paragraph Vision

AI Council lets a user convene a panel of AI personas to debate a topic in structured rounds. Each persona holds a distinct charter (perspective, expertise, disposition), sees the **full debate transcript**, and must engage the other members' arguments directly. The user acts as convener: they can let rounds run, interject to steer, regenerate a weak turn, and end the session with a synthesis that states where the council agrees, where it doesn't, and what it recommends. Sessions persist, and the output exports as clean Markdown.

That is the entire product. Everything that is not that loop is out of scope until that loop is excellent.

---

## 2. Post-Mortem: Why v1 Failed (Design Constraints, Not History)

v1 died of scope, not of difficulty. The core engine (~200 lines of state machine + one LLM proxy) worked; the other ~90% of the repo was generated to satisfy an aspirational PRD and never wired to anything a user could reach. Each failure below becomes a binding rule for v2.

| v1 failure | Evidence | v2 rule |
|---|---|---|
| Features specced far beyond intent to build | Metrics engine, marketplace, persona memory: zero code ever written | **R1 — This PRD contains only what we will build.** Ideas go in §13 (Deferred), which creates no obligations. |
| Orphaned modules | Flow designer, editing suite, 3 integrations, PDF/DOCX generators: no UI caller for any of them | **R2 — No code without a caller.** Every merged PR must be exercisable from the UI. Dead-export detection (`knip`) runs in CI and fails the build. |
| Terminology drift | debates / discussions / sessions / flows / workflows / templates / agent templates, all live at once | **R3 — The glossary (§3) is law.** Code, UI, DB, and docs use these words and no synonyms. |
| Silent fallbacks | DB errors swallowed → dashboard showed hardcoded fake stats; LLM proxy silently returned mock text | **R4 — Fail loudly.** No mock data in production paths. Mock LLM exists only behind explicit `LLM_PROVIDER=mock`, with a visible "MOCK MODE" badge in the UI. |
| Weak debate mechanic | Each persona received only the *previous* message as context | **R5 — Shared transcript.** Every turn is prompted with the full (budgeted) transcript. This is the product's core quality lever. |
| Test theater | 34/81 tests failing, written against never-integrated code | **R6 — CI gates merge.** Build + typecheck + lint + tests green, always. Tests cover behavior that exists. |
| Docs describing a different app | README routes and paths that don't exist; "100% Complete" phase summaries | **R7 — Docs follow code.** README is regenerated at each milestone from what actually ships. |

---

## 3. Glossary (Canonical Vocabulary)

| Term | Meaning |
|---|---|
| **Persona** | A named AI participant: name, role, charter (system-prompt text), avatar color. |
| **Council** | A reusable configuration: an ordered list of personas + number of rounds. |
| **Session** | One run of a council on one topic. Owns a transcript. Snapshots its council at creation. |
| **Turn** | One entry in a transcript: a persona statement, a user interjection, or a synthesis. |
| **Round** | One full pass through the council's speaking order. |
| **Interjection** | A user-authored turn that steers the debate. |
| **Synthesis** | The closing turn: agreements, open disagreements, recommendation. Produced by the Chair. |
| **The Chair** | A built-in synthesizer persona present in every session (not part of the speaking order). |
| **Directive** | Optional council-level instruction fed to every member (Chair included) on every turn — e.g. adversarial, cooperative, hybrid-seeking. Display-only `description` never reaches the AI; the directive always does. (A3) |

Banned words in code/UI: *flow, workflow, template, debate (as a noun for the entity), discussion, agent*. If a concept needs a new word, amend this table first.

---

## 4. Users & Use Cases

Single user (the repo owner), no auth, no multi-tenancy. Representative uses:

- **Decision stress-testing** — "Should I rewrite this service in Rust?" argued by a pragmatist, a performance zealot, and a maintenance skeptic.
- **Creative iteration** — a game concept pushed through a narrative designer, a market cynic, and a systems designer, refined across rounds via interjections.
- **Document/plan review** — paste a plan as the topic; council critiques it from assigned angles.

### 4.1 Why not just prompt Claude? (A2)

Honest positioning against the obvious substitute — in 2026 the user can already run multi-persona conversations in a chat window, or spawn parallel blind subagents in Claude Code and weigh their independent agreement. What justifies a purpose-built app:

1. **Privacy — the anchor use case.** Some of the convener's work cannot touch a cloud model. Council on a `local` provider (Ollama/LM Studio/vLLM) plus local Postgres runs entirely on-machine: prompts, transcripts, and persona charters never leave it. Where cloud models are banned, "just prompt Claude" is not an option — this is the differentiator with no substitute, and it takes marginal cost off the table too.
2. **The convener loop.** Interject mid-round, regenerate a weak turn, reopen after synthesis — live, steerable deliberation. Subagent orchestration is batch-shaped (fan out → wait → synthesis); Council is a seminar you sit in.
3. **Repeatability + UI.** Saved personas/councils and persistent, exportable sessions replace a retyped prompt ritual, in an interface usable outside a terminal.

Equally honest about when *not* to use it: one-shot cheap questions (chat wins on friction) and parallel research/review fan-outs over code or documents (Claude Code wins). Context isolation per persona is table stakes, not the pitch — blind parallel subagents achieve it too.

---

## 5. The Core Loop (Functional Spec)

### 5.1 Session lifecycle

```
create(topic, council) → snapshot council into session
  └─ repeat: advance()          # next persona in order speaks
       ├─ user may: interject() # inserts a user turn; subsequent speakers must address it
       ├─ user may: regenerate(turn) # discards a turn and its successors? NO — only the latest turn may be regenerated
       └─ round boundary → user may: run next round | synthesize | abandon
  └─ synthesize() → Chair produces synthesis → session status = completed
  └─ completed sessions may be reopened: reopen() → back to active, more rounds allowed
```

- **Advance is server-authoritative.** The server derives the next speaker from persisted session state. The client never tells the server whose turn it is.
- **Auto-run controls:** *Step* (one turn), *Run round* (advance to round boundary), *Pause*. Auto-run stops immediately on any turn failure.
- **Regenerate** applies only to the most recent turn (persona or synthesis). It replaces the turn in place; the discarded text is not retained in v2.
- **Interjections** may be inserted at any point while the session is active. They occupy a slot in the transcript but do not consume a persona's turn.
- **Reopen after synthesis** is the "iterate" mechanic: synthesis becomes part of the transcript, the user interjects a refined direction, and further rounds run. A session may contain multiple syntheses; the latest one is the session's result.

### 5.2 Turn prompting (the quality core)

Each generated turn is one LLM call:

- **System prompt:** persona charter + the council directive when one is set (A3) + fixed debate rules:
  - Stay in persona; never break character or mention being an AI panelist mechanic.
  - Engage at least one prior argument *by persona name* (rounds ≥ 2).
  - Address the most recent interjection if one exists since your last turn.
  - Be concise: hard cap communicated in-prompt (default ≤ 300 words), enforced by `max_tokens`.
- **User prompt:** topic + transcript (see budget below) + round-specific instruction:
  - Round 1: "Give your opening position on the topic."
  - Rounds ≥ 2: "Respond to the debate so far: rebut, concede, or build. Do not restate your opening."
  - Synthesis: "Synthesize the debate: (1) points of agreement, (2) unresolved disagreements with the strongest argument on each side, (3) a concrete recommendation."
- **Transcript budget (deterministic):** include the topic, all Round-1 openings, all interjections and syntheses, and the most recent turns up to a fixed character budget (default 24,000 chars). If over budget, drop middle-round persona turns oldest-first. No LLM summarization in v2 — deterministic truncation only.
- **Defaults:** temperature 0.7, `max_tokens` 700 per persona turn, 1200 for synthesis. App-default model set by env (`LLM_MODEL`); a session may override it at creation via the model picker (Amendment A1), stored on the session. Per-persona model overrides are deferred (§13).

### 5.3 Limits (cost/runaway guards)

- Council: 2–8 personas. Rounds per run: 1–5.
- Hard cap: 60 generated turns per session (including regenerations); the UI shows the running count and the server rejects turn 61.
- One in-flight generation per session (server-enforced lock).

### 5.4 Failure behavior

- A failed turn (provider error, timeout) is stored as `status: failed` with the error message, shown inline with a **Retry** button. It is excluded from transcript context. Auto-run halts. Nothing is silently retried or mocked (R4).

---

## 6. Screens (Complete List — Four)

There is no marketing landing page, no dashboard, no settings screen in v2.

1. **`/` — Sessions.** List (topic, council name, status, last activity) + "New session" (topic textarea + council picker + rounds override + model picker per Amendment A1). This is the home page.
2. **`/sessions/[id]` — Chamber.** The product. Transcript as a threaded feed (persona-colored turns, interjections visually distinct, syntheses highlighted); controls: Step / Run round / Pause / Interject / Regenerate last / Synthesize / Reopen; Export Markdown (copy + download); turn counter; MOCK MODE badge when applicable.
3. **`/councils` — Councils.** List + form-based editor: name, description, directive (A3 — with helper text distinguishing it from the display-only description), ordered member list (add/remove/reorder from persona library — plain buttons, **no drag-and-drop library**), default rounds. Editing a council never mutates past sessions (snapshot rule).
4. **`/personas` — Personas.** Library grid + editor: name, role (one line), charter (multiline), color. Archive instead of delete when referenced by any council or session.

---

## 7. Data Model (Postgres via Drizzle — 5 Tables, Final for v2)

```
personas          id, name, role, charter, color, archived bool, created_at, updated_at
councils          id, name, description, directive text nullable (A3), default_rounds int, archived bool, created_at, updated_at
council_members   council_id FK, persona_id FK, position int   (PK: council_id, position)
sessions          id, topic text, council_id FK nullable,
                  model text nullable,                          -- per-session override; null = env default (A1)
                  council_snapshot jsonb NOT NULL,   -- {name, rounds, directive?, members:[{name, role, charter, color}]} (directive per A3)
                  status enum(active|completed|abandoned),
                  turn_cursor int NOT NULL default 0,           -- server-authoritative position
                  created_at, updated_at, completed_at
turns             id, session_id FK, seq int NOT NULL,          -- transcript order, unique per session
                  kind enum(persona|interjection|synthesis),
                  speaker_name text,                            -- from snapshot; null for interjection
                  round int,
                  content text,
                  status enum(complete|failed),
                  error text nullable,
                  model text, prompt_tokens int, completion_tokens int,
                  created_at
                  UNIQUE(session_id, seq)
```

Rules: sessions read personas **only** through `council_snapshot`. `council_id` is a provenance pointer, nullable, never joined for rendering. No other tables ship in v2 — a migration adding a table requires amending this PRD first (R1).

---

## 8. API Surface (Route Handlers — Complete List)

```
POST   /api/sessions                      create (topic, councilId, rounds?) → snapshots council
GET    /api/sessions                      list
GET    /api/sessions/:id                  session + turns
POST   /api/sessions/:id/advance          generate next persona turn (server derives speaker; 409 if locked/complete/capped)
POST   /api/sessions/:id/interject        add user turn {content}
POST   /api/sessions/:id/synthesize       generate synthesis; sets status=completed
POST   /api/sessions/:id/reopen           completed → active
POST   /api/sessions/:id/retry-last       retry the latest failed turn
POST   /api/sessions/:id/regenerate-last  replace the latest complete turn
PATCH  /api/sessions/:id                  {status: abandoned}

CRUD   /api/personas, /api/councils       standard; DELETE archives when referenced
```

- All request bodies validated with zod; salvage v1's validation/sanitization approach from `app/api/complete/route.ts`.
- LLM access lives in one server module `lib/llm.ts` with a provider interface: `anthropic` (default), `openai`, `local` (OpenAI-compatible endpoint at `LLM_BASE_URL`, no key — A2), `mock`. Selected by env. Keys never reach the client; there is no key-entry UI.
- Rate limiting: simple per-IP in-memory limiter (single-user app; no KV dependency).

---

## 9. Technology Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript + Tailwind | Known stack, serverless-friendly, keep what worked |
| DB | Neon Postgres + Drizzle; plain Postgres throughout, so a **local Postgres** `DATABASE_URL` gives the fully-private deployment (A2) | Already provisioned in v1; schema is 5 tables |
| LLM | Anthropic default (`claude-sonnet-5`), OpenAI or a **local OpenAI-compatible server** (Ollama/LM Studio/vLLM via `LLM_BASE_URL`, A2) selectable via env | Provider interface is ~50 lines, not a framework |
| Streaming | **Not in MVP** — request/response per turn; SSE streaming is Milestone 3's first item | Ship the loop first |
| State | Server-authoritative session state; client is a renderer + button panel | Kills v1's client-side orchestration drift |
| Dependencies | Target < 15 production deps | Delete: puppeteer, docx, googleapis, @slack/web-api, @microsoft/microsoft-graph-client, reactflow, @xyflow/react, react-dnd, @vercel/kv, marked |
| Tests | Vitest or Jest: unit tests on `lib/` (speaker scheduling, prompt building, transcript budgeting, snapshot logic) + one API happy-path integration test | Test the deterministic core hard; skip UI test theater |
| CI | build + typecheck + lint + test + `knip` on every PR | Enforces R2/R6 mechanically |

**Rebuild approach:** greenfield in this repo on a `v2` branch (or `git mv` old app to `legacy/` then delete at Milestone 2). Salvage candidates: proxy validation patterns, Tailwind config, help-article prose (content only, rewritten to new vocabulary). Everything else — including the nine stray `appapp*` directories, `/starter`, and all orphan modules — is deleted, not migrated.

---

## 10. Milestones (Each Ends User-Runnable; Definition of Done Included)

### Milestone 0 — Clean Room (≈ half a day)
Scaffold, prune deps, schema + migrations, seed script (8 default personas incl. The Chair; 3 default councils: *Decision Panel*, *Creative Board*, *Red Team*), CI pipeline with all gates.
**Done when:** fresh clone → `pnpm install && pnpm db:migrate && pnpm seed && pnpm dev` works; CI green on an empty-app PR.

### Milestone 1 — The Loop (the real MVP)
Sessions list + create; Chamber with Step / Run round / Synthesize; full-transcript prompting with budget; failure/retry; turn cap; Markdown export; mock provider + badge.
**Done when:** with no API key (mock mode) and with a real key, a user creates a session from a seeded council, runs 2 full rounds + synthesis with zero console errors, refreshes mid-session without losing state, and exports Markdown.

### Milestone 2 — Convener Powers + Library
Interject, regenerate-last, reopen/iterate; persona CRUD; council builder; archive semantics; snapshot correctness under council edits.
**Done when:** a user builds a custom council from custom personas, runs a session, interjects mid-round and sees the next speaker address it, completes synthesis, reopens with a new direction, and completes a second synthesis. Editing the council afterward does not alter the finished transcript.

### Milestone 3 — Feel
SSE streaming of turns; loading/skeleton states; session JSON import/export (config + transcript); keyboard shortcuts (Space = step); README regeneration (R7).
**Done when:** turns stream token-by-token; a session exported as JSON re-imports and renders identically.

Nothing beyond Milestone 3 is committed. Post-M3 planning happens with the product in hand.

---

## 11. Success Criteria (Measurable Locally — No Market Fantasy)

- Cold start to first completed 3-persona, 2-round session: **< 3 minutes** of user effort.
- Every interactive element in the UI does something real: **zero** "Coming Soon" buttons.
- `knip` reports **zero** unused exports/files; CI green on `main` continuously.
- p95 non-streaming turn latency < 10s with default model; failures always surface with retry.
- Subjective quality bar (the one that matters): in a 2-round session, every Round-2 turn references another persona's argument by name. If prompting can't reliably achieve this, fixing it outranks any milestone work.
- **Sufficiency kill-test (A2):** the bar is not "beats one-shot Claude" — it is "the deliberation loop is good enough on small/local models to be useful where cloud models are banned." Concretely: a 2-round + synthesis session on a small model (Haiku as proxy until T-030b; then a local model) yields a synthesis the convener judges decision-useful, with the engage-by-name bar holding. If small-model sessions can't clear this after prompt iteration, halt feature work and reassess before M3 completes.

---

## 12. Explicit Non-Goals for v2 (The Cut List)

Cut, with the v1 corpse each rule buries:

- ❌ Collaboration Health Metrics / analytics dashboards *(never existed; stays that way for now)*
- ❌ Cross-session persona memory & learning-from-edits *(orphaned `lib/learning/`)*
- ❌ Template/council marketplace, ratings, community sharing *("Coming Soon" buttons)*
- ❌ Slack / Google Workspace / Microsoft 365 integrations *(~1,000 orphaned lines)*
- ❌ PDF/DOCX generation *(~1,900 orphaned lines; Markdown export covers v2)*
- ❌ Drag-and-drop visual flow designer, branching/decision nodes *(orphaned `flow-designer/`)*
- ❌ Auth, roles, multi-user, teams, billing, marketing landing page
- ❌ In-app help system & guided tour *(good prose, wrong priority; revisit post-M3)*
- ❌ Inline editing of persona responses *(interjection + regenerate is the v2 HITL)*
- ❌ Fact-checking, citations, argument mapping

## 13. Deferred (Genuinely Interesting, Zero Obligation)

Per-persona model/temperature overrides; LLM-summarized transcript compression for very long sessions; parallel "simultaneous openings" in Round 1; council presets shareable as JSON gists; a lightweight "who's winning" reaction from the Chair between rounds; **auto-convener mode (A2 candidate)** — the Chair critiques between rounds and issues the next round's steering directive itself ("attack the weakest assumption", "hybridize the Visionary's and Economist's positions"), reusing the interjection machinery, one level deep only; **hybrid-synthesis prompt variant** ("produce a best-of-both position, not a compromise"). The A2 candidates are gated on the §11 sufficiency kill-test passing. None of these may be started before M3 ships and this PRD is amended.

---

## 14. Open Questions (Convener Decides; Defaults Apply Otherwise)

1. **Provider default:** Anthropic assumed. Confirm which key(s) you actually want to run on.
2. **DB:** keep the existing Neon instance (assumed) vs. fresh database vs. local Postgres for dev.
3. **v1 disposal:** rebuild on `v2` branch of this repo (assumed) vs. fresh repository.
4. **Package manager:** pnpm (assumed — ends v1's npm/pnpm ambiguity).
