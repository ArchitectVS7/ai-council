# AI Council v2 — Master Task List

Rebuild AI Council per `design-docs/02-PRD-Rebuild.md` (the sole source of truth; its §3 glossary, §5 core-loop spec, §7 data model, and §8 API surface are normative). Greenfield on a `v2` branch of this repo; the v1 app is deleted in T-001 and lives on in git history (salvage pointers are given per task). **Package manager: npm** — the PRD assumed pnpm, but pnpm is not installed on this machine and the run must be unattended.

## Orchestrator protocol

1. **Check out** the first task with `status: TODO` whose `after:` tasks are all DONE. Set it `IN-PROGRESS`.
2. **Plan** — hand the coder the task block plus `design-docs/02-PRD-Rebuild.md`. Nothing else.
3. **Code** — implement per the plan and the Standing constraints.
4. **Review** — check the diff against the task's **Accept** criteria.
5. On pass: run the gate, commit as `<ID>: <title>`, set `status: DONE`, update this file in the same commit. On fail: one fix round, then escalate, then halt.

**Gate (every task):** `npm run check` and `npm run build` both exit 0. (`npm run check` = typecheck + lint + unit tests + knip, established in T-001; for T-001 itself the gate doubles as its Accept.) No gate command may require `DATABASE_URL`, an API key, or network access — DB/provider verification happens only at human-gate checkpoints.

**Standing constraints** (the reviewer enforces on every task):
- **No code without a caller** (PRD R2): every new module must be reachable from a route, page, script, or test that exercises real behavior; `knip` must stay clean.
- **Glossary is law** (PRD R3): only *persona / council / session / turn / round / interjection / synthesis / the Chair* in code, UI, and DB. Banned nouns: flow, workflow, template, debate-as-entity, discussion, agent.
- **Fail loudly** (PRD R4): no silent fallbacks, no mock data in production paths; the mock LLM exists only behind `LLM_PROVIDER=mock` and the UI badge.
- **Snapshot rule** (PRD §7): sessions render exclusively from `council_snapshot`; `council_id` is provenance only and is never joined for rendering.
- **Server-authoritative state**: the client never tells the server whose turn it is.
- No tables beyond PRD §7 and no production dependencies beyond the PRD's <15-dep budget without a note in the task body explaining why.

Statuses: `TODO` | `IN-PROGRESS` | `DONE` | `BLOCKED(reason)`

---

## M0 — Clean Room

### T-001 · v2 branch + clean-room scaffold — `status: DONE` · `coder: opus` · `after: —`
Create and switch to a `v2` branch. Delete the v1 application: `app/`, `components/`, `lib/`, `types/`, `__tests__/`, `scripts/`, `drizzle/`, `drizzle.config.ts`, `jest.config.js`, `jest.setup.js`, the nine stray empty `appapp*` and `componentslayout` directories, and stale docs (`PR_HELP_ONBOARDING_WORKFLOWS.md`, `ENVIRONMENT_SETUP.md`, `setup-instructions.md`, `ACTION-ITEMS.md`). Keep `design-docs/`, `.env.local`, `.env.example` (rewrite to list only: `DATABASE_URL`, `LLM_PROVIDER`, `LLM_MODEL`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`). Rewrite `package.json`: name/repository fields corrected, dependencies pruned to the PRD §9 target (delete puppeteer, docx, googleapis, @slack/web-api, @microsoft/microsoft-graph-client, reactflow, @xyflow/react, react-dnd, react-dnd-html5-backend, @vercel/kv, marked, ms, @types/ms, jest and friends). Scaffold a fresh Next.js App Router + TypeScript + Tailwind app with a single placeholder page at `/`. Tooling: Vitest (unit tests, jsdom where needed), ESLint, `knip` with config, and scripts `dev`, `build`, `start`, `lint`, `test`, `typecheck` (`tsc --noEmit`), and `check` (typecheck && lint && test && knip). Update `CLAUDE.md` to describe the v2 stack, glossary pointer, and commands.
**Accept:** on branch `v2`; `npm install && npm run check && npm run build` all exit 0; `git ls-files` contains none of the deleted paths; `package.json` lists none of the banned dependencies and ≤15 production deps; `.env.example` lists exactly the five variables above; placeholder page renders (`build` output includes `/`).

**Delivered (2026-07-27):** Checked out the `v2` branch and removed the entire v1 application tree — `app/`, `components/`, `lib/`, `types/`, `__tests__/`, `scripts/`, `drizzle/` plus `drizzle.config.ts`, `jest.config.js`, `jest.setup.js`, and the stale docs (`PR_HELP_ONBOARDING_WORKFLOWS.md`, `ENVIRONMENT_SETUP.md`, `setup-instructions.md`, `ACTION-ITEMS.md`), then scaffolded a fresh Next.js App Router + TypeScript + Tailwind app with a single placeholder page at `/`, a rewritten `.env.example` (exactly the five PRD variables), a pruned `package.json` (banned deps removed, Jest replaced by Vitest via `vitest.config.ts`), `knip.json` for dead-code gating, and `dev`/`build`/`start`/`lint`/`test`/`typecheck`/`check` scripts, plus an updated `CLAUDE.md` describing the v2 stack and glossary pointer; deliberate scope boundary — no domain logic, schema, or routes beyond the single placeholder page were added, since those are T-002 onward.
Orchestration: graphify=none — no `graphify-out/graph.json` in the repo root; T-001 is a delete-and-scaffold task grounded in TASKS.md + PRD §9. · attempts=1/4.

### T-002 · Drizzle schema + migrations — `status: DONE` · `coder: opus` · `after: T-001`
Implement PRD §7 exactly: `personas`, `councils`, `council_members` (PK `council_id, position`), `sessions` (with `council_snapshot jsonb NOT NULL`, `status` enum active|completed|abandoned, `turn_cursor int`), `turns` (with `kind` enum persona|interjection|synthesis, `status` enum complete|failed, `UNIQUE(session_id, seq)`) in `lib/db/schema.ts`, plus `drizzle.config.ts`, a `lib/db/index.ts` connection module that throws loudly when `DATABASE_URL` is missing (no fallback), and scripts `db:generate` / `db:migrate`. Generate the initial migration with `npm run db:generate` (offline; no DB connection). Add a unit test asserting the exported schema's table and column names match PRD §7 (guards drift).
**Accept:** generated SQL migration committed under `drizzle/` and contains all 5 tables, both enums or check constraints, and `UNIQUE(session_id, seq)`; schema-shape unit test green; no other tables defined; gate green.

**Delivered (2026-07-27):** Added `lib/db/schema.ts` defining the five PRD §7 tables (`personas`, `councils`, `council_members` with composite PK `(council_id, position)`, `sessions` with a required `council_snapshot` jsonb column, `session_status` enum, and a server-authoritative `turn_cursor`, and `turns` with the `turn_kind`/`turn_status` enums and a `UNIQUE(session_id, seq)` constraint), a `lib/db/index.ts` lazy connection module (`@neondatabase/serverless` + `drizzle-orm/neon-http`) that throws loudly at call time when `DATABASE_URL` is absent with no in-memory fallback, `drizzle.config.ts` loading `.env.local`, and `db:generate`/`db:migrate` npm scripts; ran `npm run db:generate` offline to produce `drizzle/0000_married_king_bedlam.sql` (all 5 tables, all 3 enums, and the `turns_session_id_seq_unique` constraint verified present) plus `drizzle/meta/`, and added `lib/db/schema.test.ts` / `lib/db/index.test.ts` guarding the schema shape and the missing-`DATABASE_URL` error path; deliberate scope boundary — no seed data, query helpers, or API routes were added, and `council_id` on `sessions` is provenance-only per PRD (nullable, never joined for rendering), since those are later tasks.
Orchestration: graphify=none — no `graphify-out/graph.json` in the repo root (checked); T-002 is a self-contained schema task grounded in PRD §7 + TASKS.md. · attempts=1/4.

### T-003 · LLM provider module — `status: DONE` · `coder: opus` · `after: T-001`
Build server-only `lib/llm.ts`: a provider interface `generate({system, prompt, maxTokens, temperature}) → {text, promptTokens, completionTokens}` with three implementations — `anthropic` (default, model from `LLM_MODEL` defaulting to `claude-sonnet-5`), `openai`, and `mock` (deterministic: derives output from a hash of inputs, so tests are stable) — selected by `LLM_PROVIDER`. Missing key for a real provider throws at call time with a clear message (R4). Input options validated with zod; salvage the sanitization approach from v1 via `git show ccead99:app/api/complete/route.ts`. Mark the module `server-only`.
**Accept:** unit tests cover provider selection by env, mock determinism (same inputs → same output), and missing-key error message; `server-only` import present; no fetch occurs in tests (real providers not exercised); gate green.

**Delivered (2026-07-27):** Added `server-only` `lib/llm.ts` exporting a `generate({system, prompt, maxTokens, temperature}) → {text, promptTokens, completionTokens}` interface with `anthropic` (default, `LLM_MODEL` falling back to `claude-sonnet-5`), `openai`, and `mock` implementations selected via `LLM_PROVIDER`; zod validates and sanitizes all options (script-block stripping and control-character removal salvaged from v1's `app/api/complete/route.ts` at `ccead99`, narrowed to not strip ordinary angle brackets and to throw rather than silently truncate over-length input); `mockGenerate` derives deterministic text and token counts from a djb2 hash of the inputs so identical calls are byte-identical and any change to an option changes the output; a missing `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` throws at call time naming the env var and the `mock` escape hatch, with no automatic fallback; and `lib/llm.test.ts` covers provider selection, model resolution, mock determinism, missing-key errors, option validation, sanitization, and both providers' request builders/response parsers, stubbing `fetch` to hard-fail so no real network call can occur in tests; deliberate scope boundary — the module talks to providers with plain `fetch` (no vendor SDKs, per PRD §9's dependency budget) and is not wired into any API route or session/turn flow, since that orchestration is a later task.
Orchestration: graphify=none — no `graphify-out/graph.json` in the repo root (checked); T-003 is a single self-contained module grounded in PRD §5.2/§8/§9 + the v1 salvage commit. · attempts=1/4.

### T-004 · Seed data + seed script — `status: DONE` · `coder: sonnet` · `after: T-002`
Create `lib/seed-data.ts` as a pure, typed module: 8 default personas (distinct charters per PRD §5.2 debate rules — include e.g. Pragmatist, Skeptic, Visionary, Economist, User Advocate, Systems Thinker, Contrarian, and **The Chair** synthesizer) and 3 default councils — *Decision Panel*, *Creative Board*, *Red Team* — each with an ordered member list (2–8 members, The Chair in none of the speaking orders) and `default_rounds` 2. Add `scripts/seed.ts` + `npm run seed` that upserts idempotently by persona/council name (requires `DATABASE_URL`; not run in the gate).
**Accept:** unit test validates seed-data shape against PRD limits (member counts 2–8, rounds 1–5, The Chair present as persona but in no council's speaking order, charters non-empty); `seed` script exists and imports only from `lib/seed-data.ts` + db module; gate green.

**Delivered (2026-07-27):** Added zero-import `lib/seed-data.ts` exporting 8 typed personas (Pragmatist, Skeptic, Visionary, Economist, User Advocate, Systems Thinker, Contrarian, and the non-speaking synthesizer **The Chair**), each with a distinct hex color and a substantive charter describing perspective/expertise/disposition only, plus 3 default councils (Decision Panel, Creative Board, Red Team) with 3–4-member speaking orders and `defaultRounds: 2`; added `scripts/seed.ts`, wired to `npm run seed` (via `tsx`, added as a new devDependency), which upserts personas and councils by name against `getDb()` and wholesale-replaces each council's `councilMembers` rows to converge on reorders, leaving `archived` untouched so re-seeding cannot revive an intentionally archived row; and `lib/seed-data.test.ts` validates the PRD §5.3 member/round limits, name uniqueness, The Chair's absence from every speaking order, every non-Chair persona being seated in at least one council, and the PRD §3 banned-vocabulary glossary. Deliberate scope boundary — the seed script requires `DATABASE_URL` and is not run in the gate (per the task's own acceptance criteria), so DB connectivity is unverified until T-006's human gate.
Orchestration: graphify=none — no `graphify-out/graph.json` in the repo root (checked); T-004 is a small, self-contained data+script task grounded in PRD §5.2/§5.3/§7 and the existing  · attempts=1/4.

### T-005 · CI workflow — `status: DONE` · `coder: sonnet` · `after: T-001`
Add `.github/workflows/ci.yml`: on push/PR to `v2` and `main`, Node 22, `npm ci`, `npm run check`, `npm run build`. No secrets, no DB.
**Accept:** workflow file present and its steps are exactly the gate commands; YAML parses (validated by any local yaml parse in a test or `node -e` check); gate green.

**Delivered (2026-07-27):** Added `.github/workflows/ci.yml` with a single `check` job triggered on push and pull_request to `v2` and `main`, checking out the repo, setting up Node 22 with npm caching, then running the gate verbatim and in order — `npm ci`, `npm run check`, `npm run build` — with no `secrets:`, `env:`, or `services:` blocks and no DB/API-key references; added `ci-workflow.test.ts` (via the new `yaml` devDependency) that parses the workflow file and asserts the triggers, Node version, checkout-before-install ordering, exact gate-command run steps with no `continue-on-error`, that the invoked npm scripts exist in `package.json`, and the no-secrets/no-DB constraint. Deliberate scope boundary — the workflow only runs the existing `check`/`build` scripts and does not add new CI jobs (lint-only, deploy, matrix builds, etc.) beyond what the task specified.
Orchestration: graphify=none — no `graphify-out/graph.json` in the repo root (checked); T-005 is a self-contained CI-config task grounded in TASKS.md's gate definition and the repo's e · attempts=1/4.

### T-006 · CHECKPOINT — M0 review, DB migrate + seed — `status: TODO` · `coder: sonnet` · `after: T-002, T-003, T-004, T-005` · `[BLOCKED BY = Human Gate: confirm Neon DB migrated/seeded and provider keys chosen]`
Automated prep: attempt `npm run db:migrate` and `npm run seed` against the configured `DATABASE_URL`, writing stdout/stderr to `design-docs/m0-db-report.md` (commit it; failure to connect is reported, not fatal). Then halt for the human to confirm: Neon connectivity, migration applied, seed rows present, and which provider key(s) will be used (PRD §14 Q1/Q2).
**Accept:** (human-checked) report committed; human confirms DB state and provider choice.

---

## M1 — The Loop

### T-010 · Core domain logic (scheduling, budgeting, prompts) — `status: DONE` · `coder: opus` · `after: T-002`
Implement pure, heavily-tested functions in `lib/council/`: (1) **scheduler** — derive next speaker and round from `council_snapshot` + existing turns, honoring that interjections occupy transcript slots but consume no persona turn, and enforcing the 60-generated-turn session cap; (2) **transcript budgeter** — deterministic truncation per PRD §5.2: always keep topic, all Round-1 openings, all interjections and syntheses; drop middle-round persona turns oldest-first to fit the 24,000-char budget; failed turns always excluded; (3) **prompt builder** — system prompt (charter + fixed debate rules incl. ≤300-word cap and engage-by-name rule for rounds ≥2) and user prompt with round-specific instruction (opening / rebuttal / synthesis per PRD §5.2). No DB or LLM imports — pure data in, data out.
**Accept:** unit tests cover: speaker order across ≥2 rounds; interjections not consuming persona slots; cap rejection at turn 61; budget truncation keeps openings/interjections/syntheses and drops oldest middle turns first (asserted on a constructed over-budget transcript); failed turns excluded; each of the three round-type instructions asserted by substring; module imports neither `lib/db` nor `lib/llm`; gate green.
**Delivered (2026-07-27):** Added `lib/council/types.ts` (the zero-import `CouncilSnapshot`/`TranscriptTurn`/`SessionState` domain types, now re-exported by `lib/db/schema.ts` so the dependency direction is db → domain and never the reverse), `lib/council/scheduler.ts` (`nextSpeaker`/`canGenerate`/`currentRound`/`nextTurnSeq`, deriving the next speaker and round purely from completed persona turns, refusing generation on an inactive session, a pending failed turn, or the 60-generated-turn cap per PRD §5.3, and treating interjections/syntheses as slot-occupying but persona-turn-free), `lib/council/transcript.ts` (`budgetTranscript`/`formatTurn`, excluding failed turns outright and dropping middle-round persona turns oldest-first against the 24,000-char default budget while always protecting the topic, Round-1 openings, interjections, and syntheses), and `lib/council/prompt.ts` (`buildTurnPrompt`/`buildSystemPrompt`, assembling the charter-first system prompt with the ≤300-word cap and the engage-by-name rule gated to rounds ≥2, and the topic/roster/budgeted-transcript user prompt with the verbatim PRD §5.2 opening/rebuttal/synthesis instructions), each paired with a `.test.ts`, plus `lib/council/purity.test.ts` which scans every non-test module in the directory to assert it imports nothing outside its own folder (specifically never `lib/db`/`lib/llm`/drizzle/`server-only`/next) and stays within the PRD §3 glossary, exempting only the verbatim round-instruction prose; deliberate scope boundary — nothing here calls the LLM or touches a database, so the retry/regenerate 4xx/409 wiring, session-status transitions, and interjection persistence itself are left to T-012/T-020 as planned.
Orchestration: graphify=none — no `graphify-out/graph.json` in the repo root (checked); T-010 is a self-contained pure-logic task grounded in PRD §5.2/§5.3/§7 and the existing `lib/` m · attempts=1/4.

### T-011 · Sessions API — create / list / get — `status: TODO` · `coder: opus` · `after: T-004, T-010`
Route handlers `POST /api/sessions` (body `{topic, councilId, rounds?}`, zod-validated → 400 with issues on bad input), `GET /api/sessions`, `GET /api/sessions/[id]` (session + ordered turns). Create must copy the council into `council_snapshot` `{name, rounds, members:[{name, role, charter, color}]}` and store `council_id` as nullable provenance. Put DB access behind thin functions in `lib/db/repo.ts` so snapshot construction is a pure, unit-testable function.
**Accept:** unit tests: snapshot builder output matches PRD §7 shape from sample council+personas; zod schema rejects missing topic / bad councilId / rounds outside 1–5; repo functions are the only place route handlers touch drizzle; gate green.

### T-012 · Advance, synthesize, retry endpoints — `status: TODO` · `coder: opus` · `after: T-003, T-011`
`POST /api/sessions/[id]/advance`: server derives the next speaker via the T-010 scheduler, acquires a per-session in-flight lock (409 if held), calls `lib/llm.ts`, stores the turn (`complete`, or `failed` with error text — never thrown away), releases the lock. `POST .../synthesize`: the Chair generates the synthesis turn and sets `status=completed`. `POST .../retry-last`: retries the latest turn only if `failed`. Enforce: 409 on completed/abandoned sessions, 4xx with clear message at the 60-turn cap, provider errors surfaced verbatim in the stored turn (R4).
**Accept:** unit tests (mock provider, repo test doubles): lock → 409; failed provider call → turn stored `failed` with error, session still advanceable via retry-last only; advance on completed session → 409; cap → 4xx; synthesis turn has `kind: synthesis`, speaker "The Chair", and flips session status; gate green.

### T-013 · Chamber UI — `status: TODO` · `coder: opus` · `after: T-012`
Build `/sessions/[id]`: transcript feed (persona-colored turns, syntheses visually highlighted, failed turns inline with error + **Retry** button), controls **Step / Run round / Pause / Synthesize**, running turn counter ("n / 60"), and a **MOCK MODE** badge when the server reports `LLM_PROVIDER=mock` (expose via the session GET payload). Run-round auto-advances turn-by-turn and halts immediately on any failure or on Pause. Buttons disable while a generation is in flight. Every rendered control must be functional — no placeholders.
**Accept:** unit tests on the client round-runner logic (halts on failure, stops at round boundary, respects pause); a component test renders a transcript fixture with persona/synthesis/failed turns and asserts Retry appears only on the failed one; badge renders iff mock flag set; `knip` confirms no unused components; gate green.

### T-014 · Sessions home + new-session form — `status: TODO` · `coder: sonnet` · `after: T-011`
Build `/`: session list (topic, council name from snapshot, status, last-activity time, link to chamber) and a "New session" form (topic textarea, council picker fed by `GET /api/councils` — add that read-only list endpoint here if T-023 hasn't shipped — rounds override 1–5 defaulting to the council's `default_rounds`). Successful create redirects to the chamber. Remove the T-001 placeholder page content.
**Accept:** component test: list fixture renders all four fields per row; form rejects empty topic client-side and surfaces server 400s loudly; create → `router.push` to `/sessions/[id]` (asserted with a mocked fetch); gate green.

### T-015 · Markdown export — `status: TODO` · `coder: sonnet` · `after: T-013`
Pure serializer `lib/council/export-md.ts`: session → Markdown with title/topic/council/date header, turns grouped by round with `### <speaker>` headings, interjections rendered as distinct blockquotes labeled "Convener", syntheses as their own top-level section (latest labeled "Result"). Chamber gets **Copy Markdown** and **Download .md** buttons wired to it.
**Accept:** serializer unit test on a fixture asserts header fields, round grouping, convener blockquote, synthesis "Result" label, and that failed turns are omitted; both buttons present and call the serializer (component test with clipboard/download mocked); gate green.

### T-016 · CHECKPOINT — M1 full-loop review — `status: TODO` · `coder: sonnet` · `after: T-013, T-014, T-015` · `[BLOCKED BY = Human Gate: run a complete session in mock and real mode]`
Automated prep: write `design-docs/m1-walkthrough.md` — exact steps for the human: start dev server in mock mode, create session from seeded council, run 2 rounds + synthesis, refresh mid-session (state must survive), export Markdown; then repeat with the real provider key. Halt for human verification (PRD Milestone 1 definition of done).
**Accept:** (human-checked) walkthrough committed; human confirms both modes pass with zero console errors.

---

## M2 — Convener Powers + Library

### T-020 · Interject, regenerate-last, reopen — API + domain — `status: TODO` · `coder: opus` · `after: T-012`
`POST /api/sessions/[id]/interject` (`{content}` → turn `kind: interjection`, no persona slot consumed), `POST .../regenerate-last` (replaces the latest **complete** persona/synthesis turn in place — same `seq`; 409 otherwise; counts toward the 60-cap), `POST .../reopen` (completed → active; further rounds allowed; prior synthesis stays in transcript). Extend the T-010 prompt builder: speakers after an interjection get an explicit "address the convener's latest note" instruction referencing its text.
**Accept:** unit tests: scheduler unaffected by interjections (same next speaker before/after); prompt after interjection contains the interjection text and the address-instruction; regenerate keeps `seq` and rejects when latest turn is failed or an interjection; reopen flips status and advance works again; regeneration increments the cap count; gate green.

### T-021 · Chamber: interject / regenerate / reopen controls — `status: TODO` · `coder: sonnet` · `after: T-013, T-020`
Add to the chamber: an **Interject** input (renders as a visually distinct "Convener" turn), **Regenerate last** (enabled only when the latest turn is a complete persona/synthesis turn), and **Reopen** (shown only on completed sessions; restores round controls). Multiple syntheses render with only the latest labeled "Result".
**Accept:** component tests: interjection styling class differs from persona turns; Regenerate disabled-state logic matches T-020 rules against fixtures; Reopen visible only when `status: completed`; two-synthesis fixture labels only the latest "Result"; gate green.

### T-022 · Personas CRUD — API + page — `status: TODO` · `coder: sonnet` · `after: T-004`
`/api/personas` CRUD (zod-validated; DELETE archives instead of deleting whenever the persona is referenced by any council or exists in history) and the `/personas` page: library grid (name, role, color swatch) + editor form (name, role one-line, charter multiline, color). Archived personas are hidden from pickers/library by default but never break old sessions (snapshots make this automatic — do not add joins).
**Accept:** unit test: delete-when-referenced sets `archived: true` and returns that fact; create/update validation rejects empty name/charter; page lists seeded personas and the editor round-trips a persona (component test with mocked fetch); gate green.

### T-023 · Councils builder — API + page — `status: TODO` · `coder: sonnet` · `after: T-022`
`/api/councils` CRUD (members as ordered `{personaId, position}` rows, 2–8 enforced; DELETE archives when referenced by sessions) and the `/councils` page: list + form editor with add/remove and **up/down reorder buttons** (explicitly no drag-and-drop), default-rounds field (1–5). Include a regression test for the snapshot rule: create session, then rename the council and reorder members — the session's snapshot and API responses are byte-identical before/after.
**Accept:** reorder persists contiguous positions (unit test); member-count and rounds bounds rejected with 400; snapshot-immunity regression test green; page renders seeded councils and editor round-trips (mocked fetch); gate green.

### T-024 · CHECKPOINT — M2 review — `status: TODO` · `coder: sonnet` · `after: T-021, T-023` · `[BLOCKED BY = Human Gate: custom-council end-to-end per PRD M2 definition of done]`
Automated prep: write `design-docs/m2-walkthrough.md` covering: build custom personas → custom council → run session → interject mid-round and verify the next speaker addresses it → synthesis → reopen with new direction → second synthesis → edit the council and confirm the finished transcript is untouched. Halt for human verification.
**Accept:** (human-checked) walkthrough committed; human confirms every step.

---

## M3 — Feel

### T-030 · SSE streaming of turns — `status: TODO` · `coder: opus` · `after: T-016`
Extend the provider interface with `generateStream` (mock streams its deterministic output in chunks; anthropic/openai stream natively) and stream `advance`/`synthesize` responses via SSE. The chamber renders tokens incrementally; the turn is persisted once on completion; a mid-stream provider failure persists a `failed` turn with the partial text discarded and the error stored; Pause aborts the in-flight stream cleanly (turn recorded `failed` with reason "aborted by convener").
**Accept:** unit tests with the mock stream: incremental chunks accumulate to the exact non-streaming output; mid-stream error → `failed` turn, no `complete` turn persisted; abort path stores the abort reason; non-streaming code path removed or delegated (knip clean); gate green.

### T-031 · Session JSON import/export — `status: TODO` · `coder: sonnet` · `after: T-015`
Versioned JSON schema (zod) covering session config (topic, snapshot, status) + full transcript. Export button in the chamber; import on `/` creating a new session with imported turns (status preserved). Round-trip must be lossless.
**Accept:** property-style unit test: export→parse→import→export yields deeply-equal JSON for fixtures including interjections, failed turns, and multiple syntheses; malformed import rejected with zod issues surfaced in UI; gate green.

### T-032 · Polish: loading states + keyboard — `status: TODO` · `coder: sonnet` · `after: T-030`
Skeleton/loading states for sessions list and chamber; **Space = Step** keyboard shortcut in the chamber (only when no generation is in flight and focus is not in a text input).
**Accept:** component tests: Space triggers step when idle, is ignored while generating and while an input/textarea has focus; skeletons render during the loading state of both pages; gate green.

### T-033 · README + CLAUDE.md regeneration — `status: TODO` · `coder: sonnet` · `after: T-031, T-032`
Rewrite `README.md` from the shipped app (PRD R7): actual routes, actual env vars, actual npm scripts, glossary summary, screenshots optional. Update `CLAUDE.md` to match. Delete any remaining v1 references (pnpm claims, `/workflow-templates`, `db/schema.ts` paths, vercel/examples repository field if still present).
**Accept:** every command in README exists in `package.json`; every route listed exists under `app/`; grep of README/CLAUDE.md finds none of the banned glossary words or v1 paths; gate green.

### T-034 · CHECKPOINT — v2 acceptance — `status: TODO` · `coder: sonnet` · `after: T-033` · `[BLOCKED BY = Human Gate: final acceptance vs PRD §11 success criteria]`
Automated prep: write `design-docs/v2-acceptance.md` — checklist mapping each PRD §11 criterion (cold-start < 3 min, zero dead controls, knip clean, p95 turn latency, engage-by-name quality bar) to how to verify it, plus a summary of anything deliberately unfinished. Halt for the human's final call and merge decision (v2 → main).
**Accept:** (human-checked) acceptance doc committed; human signs off.

---

## Deliberately deferred (PRD §12–13 — do not re-scope in)

Collaboration metrics/dashboards · persona memory & learning · marketplace/sharing/ratings · Slack/Google/M365 integrations · PDF/DOCX export · drag-and-drop designer & branching · auth/multi-user · in-app help/tour · inline response editing · fact-checking/citations · per-persona model overrides · LLM transcript summarization · parallel openings · Chair "who's winning" reactions.
