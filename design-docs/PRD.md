# AI Debate Arena — Product Requirements Document (PRD)

## Introductory Narrative
AI Debate Arena is an interactive, configurable debate simulator that orchestrates multiple AI Personas through a deterministic state-machine flow to analyze a topic from different perspectives. Users provide a topic, then a number of configurable Personas (e.g., a Moderator, an Empathy Advocate, and a Skeptical Academic) respond in turn. The Moderator extracts bullet points, the system advances through a configurable flow for several rounds, and a final moderator produces an impartial wrap-up analysis.

The application targets rapid exploration of complex topics, teaching critical thinking, and creating structured debate transcripts for study or content creation. It emphasizes clarity (moderation, summaries), transparency (debug logs), and flexibility (editable Personas and flow configuration).

---

## Goals & Non-Goals
- Goals
  - Provide a configurable, multi-Persona AI debate with a deterministic flow.
    - Number of Personas
    - Definition of those personas
      - Subject matter experts
      - Existing worldviews that bias how they ingest evidence
      - A score for how hard these biases are that can determine if their mind can be changed
    - Goal of the discussion
      - Find consensus of agreements
      - Determine validity of arguments
      - Create new and emergent ideas
    - Length of the discussion
      - Pre-defined number of rounds
      - A maximum number of rounds in the case of open-ended discussions
  - Capture a readable transcript and a final synthesis (report) that can be saved to a Neon Postgres database or downloaded
  - Enable in-UI editing of Persona prompts (name/role/task) and flow sequence.
    - Optional full "human in the loop" mode where users can edit Persona responses before continuing.
    - Optional learning system that can learn from user edits and improve Persona responses over time.
  - Offer basic import/export of configurations (JSON) for portability.
  - Maintain a debug log for state transitions and processing visibility.
- Non-Goals
  - Full user management, roles, or access control in v1.
  - Advanced analytics or heavy data warehousing.
  - Advanced long-running job orchestration or streaming tokens (initial MVP can be request/response per step).
  - Note: Basic persistence using a Neon Postgres database for configurations and transcripts IS in scope for MVP.

---

## Users & Use Cases
- Users
  - Curious learners, educators, content creators, researchers.
- Primary Use Cases
  - Explore a topic’s facets via simulated debate.
  - Produce a concise, human-readable final report (with key points and a winner rationale).
  - Customize Persona behavior and the debate flow to fit learning or content needs.
  - Elucidate original creative ideas through structured argumentation.
  - Save and resume debates; share or export results.
---

## Current Functionality (Reverse-Engineered from Code)
- Core Concepts
  - Personas: Configurable objects (id, name, role, task). Predefined: Moderator (summarizer), Empathy Advocate, Skeptical Academic.
  - State Machine: `stateFlow` is an array of Persona IDs executed in sequence across rounds. Example default: [Empathy → Moderator → Skeptic → Moderator] repeated.
  - Messages: Transcript entries with Persona name, content, timestamp, and round index.
  - Debate Log & Bullet Points: Moderator bullet point extraction (•, -, * patterns). Stored to support final analysis.
  - Final Analysis: A special “Final Moderator” Persona is invoked after flow completes and produces the wrap-up.

- UX & Interactions
  - Topic input textarea; Start Debate button; Continue button after each Persona finishes.
  - Setup Flow panel: Edit the state flow via select boxes; edit Persona prompts in a Persona editor.
  - Reset button: Clears transient state; New Debate button after completion.
  - Copy Report button: Generates a final report (topic, flow, entries, moderator bullets, final analysis) and copies to clipboard.
  - Debug Log panel: Records state transitions, prompts sent, errors, etc., and can be copied.

- Integration (assumed)
  - Uses `window.claude.complete(prompt)` for completions (a client-provided abstraction). In production, this should be replaced with a safe server/API call.

---

## Functional Requirements
1. Topic Entry & Start
   - Users enter a topic; Start initializes a new debate session, adds a “User” message, and begins the state flow.
2. Deterministic Flow Execution
   - System iterates `stateFlow` array; for each step, builds a prompt (role + task + context), calls LLM, appends message to transcript.
   - “Moderator” steps extract bullet points.
3. Continue Control
   - After each Persona response, the UI presents Continue to advance to the next state.
4. Final Analysis
   - When flow completes, the system compiles the topic, moderator bullets, and debate log into a final analysis request and appends “Final Analysis” message.
5. Persona Editing
   - In-UI editing of Persona `name`, `role`, `task`. Save updates the live configuration.
6. Flow Editing
   - Setup UI allows swapping which Persona runs at each index; supports adding/removing steps (internally supported).
7. Import/Export & Persistence
  - Primary: Save and load configurations and transcripts via Neon (serverless Postgres).
  - Fallback 1: Download configuration/transcript as a JSON file.
  - Fallback 2: Export JSON to clipboard. Import via pasted JSON (validate shape). Note: some UI for import/export may be minimal in MVP.
8. Reporting
   - Generate final report; copy to clipboard, with window fallback.
9. Debugging
   - Maintain and copy debug log of important events and errors.

---

## Non-Functional Requirements
- Performance: Single-user interactive use with small prompts; acceptable latency (LLM-bound).
- Reliability: Resilient to LLM failures with logged errors and ability to continue/reset.
- Security: Never expose API keys in the client. Use server-side proxy for LLM calls.
- Data Persistence: Use Neon Postgres with a migration workflow (e.g., Prisma or Drizzle) and clear backup/export strategy.
- Accessibility: Reasonable keyboard navigation and minimum hit target sizes (44px touch).
- Portability: Config JSON import/export for easy scenario sharing.

---

## Data Model (MVP)
- PersonaConfig: { id: number, name: string, role: string, task: string }
- ActivePersona (derived during runtime): { name: string, role: string, task: string, context: string, output: string|null }
- Message: { persona: string, personaId: number, content: string, timestamp: string, round: number|'Final' }
- DebateLogEntry: { personaName: string, personaId: number, round: number, context: string, output: string, timestamp: string }
- App State: personas: PersonaConfig[], stateFlow: number[], numRounds: number, topic: string, messages: Message[]

Database schema (Neon Postgres, MVP)
- personas (id PK, name, role, task, created_at, updated_at)
- flows (id PK, name, description, state_flow JSONB, num_rounds int, created_at, updated_at)
- debates (id PK, topic, flow_id FK->flows.id, started_at, completed_at, created_at)
- messages (id PK, debate_id FK->debates.id, persona_name, persona_id int, round int, content text, timestamp)
- summaries (id PK, debate_id FK->debates.id, summary text, created_at)

---

## Key Screens
- Home/Main
  - Topic input, Start, Reset, Setup Flow, Continue, transcript feed, status banner, debug log.
- Setup Flow
  - Flow sequence editor (per-index Persona selection), Personas list, Persona editor panel.
- Import/Export (Modal/Panel)
  - Paste/Copy JSON for configuration portability.

---

## State Machine Overview
- Flow: `stateFlow: number[]` of Persona indices into `Personas`.
- Round Calculation: `round = floor(currentIndex / (stateFlow.length / numRounds)) + 1`.
- Transitions
  - Start -> First Persona -> Continue -> Next Persona … -> Final Moderator -> Complete.
- Context Passing
  - Each Persona’s context is the prior output (or the topic for the very first Persona).

---

## Tech Stack Options (with Pros/Cons)
1. React + Vite + Tailwind (SPA)
   - Pros: Fast DX, minimal boilerplate, great ecosystem, instant deploy to static hosts; Tailwind accelerates UI.
   - Cons: Requires adding a small server/API for secure LLM calls.
2. Next.js (App Router) + Tailwind
   - Pros: File-based routing, server components, built-in API routes (ideal for LLM proxy), great deploy on Vercel.
   - Cons: Slightly heavier than pure Vite; learning curve if unfamiliar.
3. SvelteKit + Tailwind
   - Pros: Simple, reactive; built-in endpoints for API proxy; great perf.
   - Cons: Smaller ecosystem; team familiarity may vary.
4. Vue 3 + Vite + Tailwind (SPA)
   - Pros: Mature, approachable, good tooling.
   - Cons: Similar SPA caveat as React option regarding serverless proxy.

Database Options
- Neon (Serverless Postgres)
  - Pros: Managed serverless Postgres, branching, great for preview deployments, SQL familiarity.
  - Cons: Requires connection pooling on serverless platforms; SQL migrations to manage.
- SQLite (local/dev only)
  - Pros: Zero setup for prototyping.
  - Cons: Not suitable for multi-user cloud deployments.

Backend/LLM Proxy Options
- Serverless Functions (Vercel, Netlify, Cloudflare Workers)
  - Pros: Zero infra management, easy secrets, global edge.
  - Cons: Cold starts, vendor lock-in.
- Small Node/Express service (Railway/Fly.io/Render)
  - Pros: Full control; easy to add features later.
  - Cons: More ops than serverless.

LLM Providers/SDKs
- Anthropic (Claude), OpenAI, or local models via an API gateway.
- Pros: Flexibility; can swap via a thin server proxy.
- Cons: Cost/latency variance; provider limits.

---

## Top Recommendation for Quickest MVP
- Next.js (latest) + Tailwind + Serverless API route as an LLM proxy to Anthropic/OpenAI + Neon (Postgres)
  - Why: One repo, built-in API routes to keep keys server-side, super-fast deploy on Vercel, great DX.
  - Client: React components ported from this draft with minor adjustments.
  - Server: /app/api/complete/route.ts to accept {prompt} and call provider; return text.
  - Storage: Neon Postgres for configurations, debates, messages, and summaries; optional localStorage for draft state.

---

## High-Level Architecture (MVP)
- UI (Next.js app):
  - Pages/Routes: Debate page with Setup panel; optional /settings route.
  - Components: DebateArena, PersonaEditor, FlowConfigurator, DebugLog, Transcript.
- API Route /api/complete:
  - POST {prompt} -> Provider SDK -> {text}
  - Middleware: Basic input validation, rate-limit (if needed).
 - API Routes /api/config, /api/debate:
   - CRUD for Personas, flows, debates, and messages; connect to Neon via Prisma or Drizzle.
 - Database:
   - Neon Postgres with migration tooling; connection pooling (e.g., Prisma Accelerate or pgbouncer) for serverless.

---

## Delivery Plan & Milestones
1. Bootstrap Next.js + Tailwind; scaffold DebateArena page (0.5–1 day)
2. Wire serverless /api/complete to provider (0.5 day)
3. Add ORM and Neon: configure Prisma/Drizzle, define schema, run migrations, env secrets (0.5–1 day)
4. Port state machine and UI; replace window.claude with fetch('/api/complete') (1–2 days)
5. Implement Report copy, Debug log; build /api/config and /api/debate to persist to Neon (1 day)
6. Add Import/Export panel with Neon integration and JSON download/clipboard fallbacks; validation (0.5 day)
7. Optional: localStorage autosave for configs and last topic (0.5 day)

---

## Future Enhancements
- Persistence with user accounts; multi-session history.
- Streaming responses; token-by-token UI updates.
- Advanced visualization (graphs of arguments, contradictions, citations).
- More Persona archetypes and preset templates; marketplace for configs.
- Rate limiting, usage analytics.

---

## Risks & Mitigations
- LLM Variability: Use strong system prompts and clear tasks; capture errors.
- Cost/Latency: Add caching or rate limiting; optional provider switching.
- Security: Keep keys server-side; never expose in client code.
 - Data: Ensure Prisma/Drizzle migrations are reviewed; enable Neon branch previews for safe schema changes.

---

## Deployment Options
- Vercel + Next.js for speed of execution and the best MVP path (recommended)
- Neon Postgres for persistence (managed serverless DB)
- Optional: pgbouncer/Prisma Accelerate or Neon connection pooling for serverless scale
