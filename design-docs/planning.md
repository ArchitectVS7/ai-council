# AI Council — Delivery Plan

This document captures the audit, alignment decisions, and rollout plan to deliver the AI Council MVP per PRD.

## Checklist
- Understand PRD features/flows/tech
- Audit PRD vs current code, list gaps
- Pros/Cons: change PRD vs change MVP for each gap
- Phased rollout with tests and quality gates

## PRD Summary
- Multi-persona, deterministic discussion simulator with rounds, Moderator bullet extraction, and final synthesis.
- Personas and flow are editable; import/export JSON; persist to Neon (personas, flows, debates, messages, summaries).
- Debug log, final report, server-side LLM proxy; Next.js + Tailwind recommended.

## Audit: PRD vs Current Repo
- Stack: Next.js App Router + Tailwind + Postgres (aligned baseline).
- Missing: LLM proxy (/api/complete), PRD schema (personas/flows/debates/messages/summaries), state machine, debate UI, import/export, debug/report, branding.
- Present but unrelated: "profiles" demo table and page.

## Alignment Decisions (Pros/Cons)
1) ORM vs raw SQL
   - Keep raw SQL: fewer deps, but more boilerplate and weaker migrations.
   - Prisma: great DX, but heavier and serverless caveats.
   - Drizzle (recommended): typed SQL, lightweight, good with Neon serverless.

2) Neon driver/connection
   - Keep current postgres: works, but not ideal for serverless scale.
   - Neon serverless driver or Drizzle + neon (recommended): fewer connection issues.

3) LLM proxy
   - Simple REST /api/complete (recommended first): fast; add streaming later.
   - Vercel AI SDK later for streaming/structured outputs.

4) Orchestration
   - Client-only: simple but brittle for persistence.
   - Server-orchestrated: durable but more complex.
   - Hybrid (recommended): client drives UI; server runs single step + persistence.

5) DB schema scope
   - Minimal debates/messages first: quicker but loses configurability.
   - Full PRD schema (recommended): personas, flows, debates, messages, summaries.

6) UI approach
   - Keep starter at /starter; new AI Council at /. Rename branding immediately.

## Rollout Plan

Phase 0 — Rename, scaffold, keep build green
- Rename to "AI Council" (metadata/title, README).
- New Home (/) with: topic input, Start, Continue placeholder, Transcript placeholder, Debug log placeholder.
- Seed default personas and flow in code (Moderator, Empathy Advocate, Skeptical Academic; [Empathy → Moderator → Skeptic → Moderator] x rounds).
- Keep current starter page at /starter.
- Tests: basic render and form validation unit tests (optional initial).

Phase 1 — LLM proxy foundation
- /app/api/complete: POST {prompt} -> provider; return {text}. Non-streaming.
- Env: ANTHROPIC_API_KEY or OPENAI_API_KEY. Mock/fallback in dev.
- Wire client to call proxy; placeholder prompts.

Phase 2 — Core state machine
- lib/stateMachine.ts to build prompts and track sequence/rounds.
- DebateArena component: Start/Continue loop; Final Analysis persona; moderator bullet parsing.
- Debug log with timings/errors; simple retry policy.

Phase 3 — Persistence with Drizzle + Neon
- Add Drizzle and migrations for personas, flows, debates, messages, summaries.
- API routes: /api/config (CRUD) and /api/debate (create/append/complete).
- Client: Save/Load config and debate transcripts.

Phase 4 — Persona & Flow editors
- UI to edit personas (name/role/task) and flow sequence/rounds.
- Optional human-in-the-loop to edit persona outputs pre-commit.

Phase 5 — Import/Export & Reporting
- Export current config/transcript to JSON (download/clipboard). Import via paste with validation.
- Final report assembly and Copy Report.

Phase 6 — Hardening & polish
- Error handling and rate limiting; a11y passes; optional localStorage autosave.
- E2E smoke tests.

## Quality Gates (each phase)
- Build: next build PASS
- Lint/Typecheck: eslint + tsc PASS
- Unit tests: changed modules PASS
- Integration: minimal route tests PASS
- Smoke: short debate run with mocked LLM (after Phase 2)

## Assumptions
- Drizzle + Neon serverless for DB; non-streaming LLM initially; hybrid orchestration.

## How to Run (current)
- Env: POSTGRES_URL for the starter demo at /starter.
- Dev: pnpm i; pnpm dev; open /. The /starter route shows the original Postgres demo.
