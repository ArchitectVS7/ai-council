# AI Council

Convene a panel of AI personas to examine a topic in structured rounds. Each persona holds a
distinct charter, sees the full transcript, and engages the other members directly. You
convene: let rounds run, interject to steer, regenerate a weak turn, and close with a
synthesis from the Chair.

This is the **v2** rebuild. `design-docs/02-PRD-Rebuild.md` is the normative spec — §3
(glossary), §5 (core loop), §7 (data model) and §8 (API surface) govern the code.

## Vocabulary

One word per concept, used in code, UI copy, and docs alike (PRD §3):

| Term | Meaning |
|---|---|
| **Persona** | A named AI participant: name, role, charter (system-prompt text), avatar color. |
| **Council** | A reusable configuration: an ordered list of personas + number of rounds. |
| **Session** | One run of a council on one topic. Owns a transcript. Snapshots its council at creation. |
| **Turn** | One entry in a transcript: a persona statement, a user interjection, or a synthesis. |
| **Round** | One full pass through the council's speaking order. |
| **Interjection** | A user-authored turn that steers the session. |
| **Synthesis** | The closing turn: agreements, open disagreements, recommendation. |
| **The Chair** | A built-in synthesizer persona present in every session (not in the speaking order). |
| **Directive** | Optional council-level instruction fed to every member, the Chair included, on every turn. |

Synonyms are not used. If a concept needs a new word, PRD §3 gets amended first.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run db:migrate           # create the five tables
npm run seed                 # personas + the Chair + three starter councils
npm run dev
```

Two offline paths, both still requiring `DATABASE_URL`:

- `LLM_PROVIDER=mock` — canned responses, no API key, no network. The Chamber shows a
  **Mock mode** badge so you always know what you are reading.
- `LLM_PROVIDER=local` — an OpenAI-compatible server at `LLM_BASE_URL` (Ollama and friends).
  No key is sent.

## Environment

Six variables, and only six. A seventh requires a PRD amendment.

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Neon (or plain) Postgres connection string |
| `LLM_PROVIDER` | `anthropic` \| `openai` \| `local` \| `mock`; unset means `anthropic` |
| `LLM_MODEL` | per-provider default when unset: `claude-sonnet-5`, `gpt-4o-mini`, `llama3.3`, `mock` |
| `ANTHROPIC_API_KEY` | required when `LLM_PROVIDER=anthropic` |
| `OPENAI_API_KEY` | required when `LLM_PROVIDER=openai` |
| `LLM_BASE_URL` | read only when `LLM_PROVIDER=local`; default `http://localhost:11434/v1`, no key sent |

A session may also pick its own model at creation, overriding `LLM_MODEL` for that session
only (PRD Amendment A1).

## Screens

| Route | What it is |
|---|---|
| `/` | Sessions list, the new-session form, and the import panel. |
| `/sessions/[id]` | The Chamber: transcript, controls, export. |
| `/councils` | Council editor: name, description, directive, ordered members, default rounds. |
| `/personas` | Persona library: name, role, charter, color. |

## API

```
GET    POST   /api/personas
PUT    DELETE /api/personas/[id]
GET    POST   /api/councils
PUT    DELETE /api/councils/[id]
GET    POST   /api/sessions
GET           /api/sessions/[id]
POST          /api/sessions/[id]/advance
POST          /api/sessions/[id]/synthesize
POST          /api/sessions/[id]/interject
POST          /api/sessions/[id]/regenerate-last
POST          /api/sessions/[id]/retry-last
POST          /api/sessions/[id]/reopen
```

`advance` and `synthesize` stream their turn over SSE; `retry-last` and `regenerate-last`
deliberately do not — they answer once, with the finished turn. `POST /api/sessions` doubles
as import: post a topic and a council to start fresh, or post a previously exported session
document to restore one.

## How a session runs

1. **Create.** Pick a council and a topic. The council is copied into the session as a
   snapshot; the session renders only from that snapshot forever after, so editing the
   council later never rewrites history.
2. **Advance.** Step one turn, or run a whole round. The server picks the next speaker,
   builds the prompt, and appends the turn. One generation in flight per session.
3. **Steer.** Interject at any point, or regenerate the last turn if it landed badly.
4. **Synthesize.** The Chair closes the session: agreements, open disagreements,
   recommendation.
5. **Reopen.** A completed session can be reopened for more rounds, then synthesized again.

Limits, all enforced server-side: 2–8 personas per council, 1–5 rounds, 60 generated turns
per session, and a 24,000-character transcript budget that trims deterministically from the
oldest turns when a session outgrows it. Turns are capped at ~300 words by the prompt.

Failures are visible, never papered over. A turn that fails is stored with the provider's own
message and a **Retry** button; nothing is silently retried, and no canned response is ever
substituted outside `LLM_PROVIDER=mock`.

Export from the Chamber: **Copy Markdown**, **Download .md**, or **Download .json** (the
document `POST /api/sessions` will import back). Keyboard: `Space` steps the session.

## Scripts

| Script | Does |
|---|---|
| `npm run dev` | development server |
| `npm run build` | production build |
| `npm start` | serve the production build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest, single run |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run knip` | unused files / exports / dependencies |
| `npm run check` | typecheck + lint + test + knip — the gate |
| `npm run db:generate` | generate a migration from `lib/db/schema.ts` |
| `npm run db:migrate` | apply pending migrations |
| `npm run seed` | load the starter personas and councils |

The last three need `DATABASE_URL`. `npm run check` and `npm run build` never do — no
database, no API key, no network.

## Layout

```
app/(home)/            /  — sessions list, new session, import
app/sessions/[id]/     the Chamber
app/councils/          council editor
app/personas/          persona library
app/api/               route handlers
components/            app-header, chamber, council-builder, persona-library,
                       session-list, new-session-form, import-session
lib/api/               HTTP envelope, zod schemas, SSE turn responses
lib/chamber/           client-side controls, runner, stream, view types
lib/council/           pure domain: scheduler, prompt, transcript budget, snapshot, Markdown export
lib/transfer/          session document: build, validate, round-trip
lib/db/                schema.ts, repo.ts, index.ts
lib/llm.ts             the one provider call site
drizzle/               generated migrations
scripts/seed.ts        starter data loader
design-docs/           PRDs and milestone walkthroughs
.github/               CI gate: npm ci, npm run check, npm run build, on Node 22
```

Tests sit next to the code they cover as `*.test.ts` / `*.test.tsx`. Three live at the repo
root, because what they check is not code: the CI gate (`ci-workflow.test.ts`), the
environment contract (`env-example.test.ts`), and the accuracy of this file and `CLAUDE.md`
(`docs.test.ts`).

## Not shipped

Abandoning a session — PRD §8 lists a PATCH for it — did not ship in v2; there is no handler
and no control. Per-persona model overrides, auto-convener mode, and shareable council
presets are on the §13 cut list, gated on the §11 kill-test.
