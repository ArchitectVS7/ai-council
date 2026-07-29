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

Banned words: *flow*, *workflow*, *template*, *debate* (as a noun for the entity),
*discussion*, *agent*. If a concept needs a new word, amend the PRD §3 table first.

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
- **< 15 production dependencies.** Adding one requires a justifying note.

## Stack

- Next.js 15 (App Router) + TypeScript (strict) + Tailwind CSS 3
- Neon Postgres + Drizzle ORM (lands in a later task; not yet installed)
- Vitest + Testing Library for tests (`jsdom` opted into per file via a
  `// @vitest-environment jsdom` docblock; everything else runs in `node`)
- ESLint (`next/core-web-vitals`), knip
- Package manager: **npm** (not pnpm)

Tests are colocated as `*.test.ts` / `*.test.tsx` next to the code they cover. There is no
`__tests__/` directory.

## Commands

```bash
npm install       # install dependencies
npm run dev       # development server
npm run build     # production build
npm start         # serve the production build
npm run lint      # eslint
npm run test      # vitest, single run
npm run typecheck # tsc --noEmit
npm run knip      # unused files / exports / dependencies
npm run check     # typecheck && lint && test && knip  <- the gate
```

`npm run check` and `npm run build` are the two gate commands. Neither may require
`DATABASE_URL`, an API key, or network access.

## Environment

`.env.example` lists the only six variables the app reads:

`DATABASE_URL`, `LLM_PROVIDER` (`anthropic` | `openai` | `local` | `mock`), `LLM_MODEL`
(default `claude-sonnet-5`), `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `LLM_BASE_URL`
(read only when `LLM_PROVIDER=local`; default `http://localhost:11434/v1`, and that
provider sends no key at all).

Copy it to `.env.local` for local runs. Do not add a seventh variable without a PRD
amendment — A2 added the sixth.

## Structure

This is the tree as it exists today, not an aspiration:

```
app/                 # Next.js App Router
├── globals.css      # Tailwind directives + base styles
├── layout.tsx       # root layout
├── page.tsx         # placeholder home page
└── page.test.tsx    # smoke test
design-docs/         # PRDs and v1 historical records
TASKS.md             # task list + orchestrator protocol
knip.json            # unused-code gate config
vitest.config.ts     # test runner config
next.config.js, postcss.config.js, tailwind.config.js, tsconfig.json, .eslintrc.json
```

Directories arrive when a task creates them with a caller. Do not scaffold empty ones.
