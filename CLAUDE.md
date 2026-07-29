# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repository.

## Project Overview

AI Council lets a user convene a panel of AI personas to examine a topic in structured
rounds. Each persona holds a distinct charter (perspective, expertise, disposition), sees the
full transcript, and must engage the other members' arguments directly. The user is the
convener: let rounds run, interject to steer, regenerate a weak turn, and close the session
with a synthesis from the Chair stating where the council agrees, where it does not, and what
it recommends. Sessions persist and export as clean Markdown. Anything outside that loop is
out of scope.

This is **v2**, a clean-room rebuild on the `v2` branch. The v1 application was deleted, not
migrated.

## Source of Truth

`design-docs/02-PRD-Rebuild.md` is normative. In particular:

- §3 — glossary (canonical vocabulary)
- §5 — the core loop (functional spec)
- §7 — data model (5 tables, final for v2)
- §8 — API surface (complete route list)
- §9 — technology decisions

`design-docs/01-PRD-As-Built.md` and `design-docs/User Manual.md` are historical records of
v1. Read them for context only; never follow them.

`TASKS.md` holds the task list and the orchestrator protocol.

## Glossary

Approved nouns — use exactly these, in code, UI copy, and docs:

| Term | Meaning |
|---|---|
| **Persona** | A named AI participant: name, role, charter (system-prompt text), avatar color. |
| **Council** | A reusable configuration: an ordered list of personas + number of rounds. |
| **Session** | One run of a council on one topic. Owns a transcript. Snapshots its council at creation. |
| **Turn** | One entry in a transcript: a persona statement, a user interjection, or a synthesis. |
| **Round** | One full pass through the council's speaking order. |
| **Interjection** | A user-authored turn that steers the session. |
| **Synthesis** | The closing turn: agreements, open disagreements, recommendation. Produced by the Chair. |
| **The Chair** | A built-in synthesizer persona present in every session (not part of the speaking order). |
| **Directive** | Optional council-level instruction fed to every member, the Chair included, on every turn. Display-only `description` never reaches the AI; the directive always does. (Amendment A3) |

Only these terms. Synonyms are banned — the ban list lives in PRD §3, and `docs.test.ts`
enforces it over the repo's two Markdown guides. If a concept needs a new word, amend that
table first.

## Standing Rules

- **No code without a caller.** Every module, export, and dependency must be reachable from a
  real entry point. `knip` is a gate, not advice.
- **Fail loudly.** No silent fallbacks, no swallowed errors, no invented data. Mock responses
  exist only under `LLM_PROVIDER=mock`.
- **Snapshot rule.** A session renders only from its `council_snapshot`. `council_id` is
  provenance; it is never read to build a transcript.
- **Server-authoritative state.** The server owns session progression; the client renders and
  sends intents. No client-side orchestration.
- **5 tables max.** No table beyond PRD §7 without amending the PRD.
- **< 15 production dependencies.** Adding one requires a justifying note. Currently 7.

## Stack

- Next.js 15 (App Router) + TypeScript (strict) + Tailwind CSS 3
- Neon Postgres + Drizzle ORM (`drizzle-orm`, `@neondatabase/serverless`, `drizzle-kit`)
- `zod` for request validation, `server-only` to guard the server boundary
- No vendor LLM SDK: `lib/llm.ts` calls the provider HTTP APIs directly, one call site
- Vitest + Testing Library for tests (`jsdom` opted into per file via a
  `// @vitest-environment jsdom` docblock; everything else runs in `node`)
- ESLint (`next/core-web-vitals`), knip
- Package manager: **npm**

## Commands

```bash
npm install         # install dependencies
npm run dev         # development server
npm run build       # production build
npm start           # serve the production build
npm run lint        # eslint
npm run test        # vitest, single run
npm run typecheck   # tsc --noEmit
npm run knip        # unused files / exports / dependencies
npm run check       # typecheck && lint && test && knip  <- the gate
npm run db:generate # emit a migration from lib/db/schema.ts
npm run db:migrate  # apply pending migrations
npm run seed        # load starter personas and councils
```

`npm run check` and `npm run build` are the two gate commands. Neither may require
`DATABASE_URL`, an API key, or network access. The three database commands do need
`DATABASE_URL` and are deliberately outside the gate.

## Environment

`.env.example` lists the only six variables the app reads:

`DATABASE_URL`, `LLM_PROVIDER` (`anthropic` | `openai` | `local` | `mock`; unset means
`anthropic`), `LLM_MODEL`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `LLM_BASE_URL`
(read only when `LLM_PROVIDER=local`; default `http://localhost:11434/v1`, and that
provider sends no key at all).

When `LLM_MODEL` is unset the default comes from `lib/models.ts`, per provider:
`claude-sonnet-5` (anthropic), `gpt-4o-mini` (openai), `llama3.3` (local), `mock` (mock).
A session may override it for itself (Amendment A1).

Copy `.env.example` to `.env.local` for local runs. Do not add a seventh variable without a
PRD amendment — A2 added the sixth.

## Structure

This is the tree as it exists today, not an aspiration:

```
app/(home)/            # `/` — sessions list, new session, import (+ loading.tsx)
app/sessions/[id]/     # the Chamber                             (+ loading.tsx)
app/councils/          # council editor
app/personas/          # persona library
app/layout.tsx         # root layout, renders components/app-header
app/api/               # route handlers: personas, councils, sessions
components/            # app-header, chamber, council-builder, persona-library,
                       # session-list, new-session-form, import-session
lib/api/               # HTTP envelope, zod schemas, failure mapping, SSE turn responses
lib/chamber/           # client-side controls, runner, stream, view types
lib/council/           # pure domain: scheduler, prompt, transcript budget, snapshot, export-md
lib/transfer/          # session document: build, validate, round-trip
lib/councils/, lib/personas/, lib/home/, lib/session/   # types + server session logic
lib/db/                # schema.ts, repo.ts, index.ts
lib/llm.ts             # the single provider call site (server-only)
lib/models.ts          # provider names, default + curated models (client-safe)
lib/sse.ts, lib/seed-data.ts
drizzle/               # generated migrations (0000, 0001, 0002) + meta
scripts/seed.ts        # starter data loader
design-docs/           # PRDs, milestone walkthroughs, v1 historical records
.github/               # CI gate: npm ci, npm run check, npm run build, on Node 22
TASKS.md, knip.json, vitest.config.ts, drizzle.config.ts
next.config.js, postcss.config.js, tailwind.config.js, tsconfig.json, .eslintrc.json
```

Directories arrive when a task creates them with a caller. Do not scaffold empty ones.

## Conventions

- Tests are colocated as `*.test.ts` / `*.test.tsx` next to the code they cover. There is no
  `__tests__/` directory. Three tests live at the repo root because what they check is not
  code: the CI gate (`ci-workflow.test.ts`), the environment contract (`env-example.test.ts`),
  and these two Markdown guides (`docs.test.ts`).
- `lib/council/` is import-pure — no database, no provider, no clock. `lib/council/purity.test.ts`
  enforces that; keep new domain logic there and inject the impure parts.
- Client-safe modules (`lib/models.ts`, `lib/chamber/types.ts`, `lib/home/types.ts`) import
  nothing `server-only`, because browser components render them.
- Domain limits live as named constants, not literals: `MIN/MAX_COUNCIL_MEMBERS` (2–8),
  `MIN/MAX_ROUNDS` (1–5) in `lib/council/snapshot.ts`, `MAX_GENERATED_TURNS` (60) in
  `lib/council/scheduler.ts`, `TRANSCRIPT_CHAR_BUDGET` (24,000) in `lib/council/transcript.ts`.
