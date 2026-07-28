# M0 checkpoint — DB migrate + seed report

- **Date:** 2026-07-27
- **Branch:** `v2`
- **Commit described:** `4b663a1b190c1ce030c9d469ab389e29b794d424` (`T-010: Core domain logic (scheduling, budgeting, prompts)`)
- **Task:** T-006 · CHECKPOINT — M0 review, DB migrate + seed

No secret values, connection strings, or API keys appear anywhere in this file. Where a
tool echoed one it has been replaced with `<redacted>`.

---

## Verdict

**`DATABASE_URL` is not configured, so neither `npm run db:migrate` nor `npm run seed`
could run. No migration has been applied and no seed rows exist.** Both commands failed
loudly at connect time, which is the intended behaviour (PRD R4 — no fallback database);
nothing was worked around, aliased, or stubbed to make them pass.

Two further facts make this a decision, not just a missing variable:

1. The one Postgres URL that *is* present in `.env.local` (`POSTGRES_URL`, a v1 leftover)
   points at a **live Neon database that still holds the v1 schema**, including a
   `personas` table whose shape is incompatible with v2 (integer `id` vs. `uuid`) and a
   `drizzle.__drizzle_migrations` journal with 2 rows from v1. Pointing `DATABASE_URL` at
   that same database would make `db:migrate` fail on an already-existing relation. See
   [Read-only connectivity probe](#read-only-connectivity-probe).
2. `LLM_PROVIDER` is unset, so `lib/llm.ts` selects `anthropic`, and `ANTHROPIC_API_KEY`
   is not set either. **As configured today the app would throw on the first turn.** The
   only key present is `OPENAI_API_KEY`. See [Human gate](#human-gate--please-confirm).

Everything M0 shipped is otherwise green: `npm run check` and `npm run build` both pass
(105 tests across 10 files).

---

## Environment surface

Names only, read from `.env.local`. Values were never printed.

### The five PRD §9 variables

| Variable | State | Notes |
| --- | --- | --- |
| `DATABASE_URL` | **MISSING** | Blocks `db:migrate` and `seed`. Human gate item. |
| `LLM_PROVIDER` | **MISSING** | Unset means `anthropic` (`lib/llm.ts:88`). |
| `LLM_MODEL` | **MISSING** | Unset means the provider default, `claude-sonnet-5`. |
| `ANTHROPIC_API_KEY` | **MISSING** | Required by the provider that is active by default. |
| `OPENAI_API_KEY` | SET | The only provider key present. |

### Non-PRD leftovers found in `.env.local`

`POSTGRES_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` — all v1. Nothing on `v2` reads any of
them (`drizzle.config.ts` and `lib/db/index.ts` read `DATABASE_URL` only). Recommend
deleting all three once `DATABASE_URL` is set, so the file matches `.env.example`.

`.env.example` on `v2` already documents exactly the five PRD variables, so it needs no
change.

---

## `npm run db:migrate`

Command: `npm run db:migrate` (repo root) → `drizzle-kit migrate`
Exit code: **1**

```text
> ai-council@2.0.0 db:migrate
> drizzle-kit migrate

No config path provided, using default 'drizzle.config.ts'
Reading config file 'C:\dev\Utils\ai-council\drizzle.config.ts'
◇ injected env (3) from .env.local
◇ injected env (0) from .env
Error  Please provide required params for Postgres driver:
    [x] url: ''
```

The empty `url` is `process.env.DATABASE_URL ?? ''` from `drizzle.config.ts:14`. The
fallback is to an empty string on purpose — `db:generate` runs fully offline and needs the
field to exist, while `db:migrate` fails here rather than connecting to anything implicit.

---

## `npm run seed`

Command: `npm run seed` (repo root) → `tsx --env-file-if-exists=.env.local scripts/seed.ts`
Exit code: **1**

```text
> ai-council@2.0.0 seed
> tsx --env-file-if-exists=.env.local scripts/seed.ts

Error: DATABASE_URL is not set. Set it in .env.local (Neon Postgres connection string). There is no fallback database.
    at getDb (C:\dev\Utils\ai-council\lib\db\index.ts:23:11)
    at main (C:\dev\Utils\ai-council\scripts\seed.ts:19:14)
    at <anonymous> (C:\dev\Utils\ai-council\scripts\seed.ts:109:1)
    at Object.<anonymous> (C:\dev\Utils\ai-council\scripts\seed.ts:112:2)
```

Stack trimmed to the project frames; the remainder is Node/`tsx` loader internals.

---

## Read-only connectivity probe

Because `DATABASE_URL` is absent, a **throwaway, SELECT-only** diagnostic was run against
the value of **`POSTGRES_URL`** — explicitly *not* the configured `DATABASE_URL`. The
probe script lived in a scratch directory and has been deleted; it is not part of the
repo. **No DDL, no writes, no migration and no seed were run against that instance**,
because the human has not yet chosen whether it is the v2 database (PRD §14 Q2).

Result: **connected successfully.** Database `neondb`.

Tables in `public` (quoted verbatim as pre-existing v1 identifiers):

```text
agent_executions, agent_templates, debate_messages, debate_summaries, debates,
flows, personas, profiles, workflow_executions, workflow_templates, workflows
```

Additional facts relevant to Q2:

- `public.personas` exists with the **v1** column set — `id integer`, `name text`,
  `role text`, `task text`, `system_prompt text`, `parameters jsonb`, `is_active boolean`,
  `created_at`, `updated_at` — and contains **0 rows**. The v2 `personas` table
  (`lib/db/schema.ts`) uses a `uuid` primary key plus `charter` / `color` / `archived`, so
  the two definitions collide by name and are incompatible in shape.
- `drizzle.__drizzle_migrations` already exists and holds **2 rows** from v1.

Consequence: if `DATABASE_URL` is pointed at this database as-is, `db:migrate` will fail
on `CREATE TABLE "personas"` (relation already exists). A **fresh Neon database** (or
dropping the v1 `public` and `drizzle` schemas first) is the clean path.

---

## M0 review

| Task | Shipped | Lives in |
| --- | --- | --- |
| T-001 v2 branch + clean-room scaffold | v1 app/tests/docs removed; Next 15 + React 19 + Tailwind scaffold; dependency budget cut to 7 production deps; `npm run check` composite gate | `package.json`, `app/`, `.env.example`, `README.md`, `CLAUDE.md` |
| T-002 Drizzle schema + migrations | 5 tables (`personas`, `councils`, `council_members`, `sessions`, `turns`), 3 enums (`session_status`, `turn_kind`, `turn_status`), composite PK `(council_id, position)`, unique `turns_session_id_seq_unique`, lazy `getDb()` that throws without `DATABASE_URL` | `lib/db/schema.ts`, `lib/db/index.ts`, `drizzle/0000_married_king_bedlam.sql`, `drizzle.config.ts` |
| T-003 LLM provider module | `generate()` over `anthropic` / `openai` / `mock` via plain `fetch`, zod-validated request and response, no vendor SDK, `mock` only when explicitly selected | `lib/llm.ts` |
| T-004 Seed data + seed script | 8 personas (7 seat personas + the Chair), 3 councils, 11 `council_members` rows (4 + 4 + 3); idempotent upsert-by-name seeder that never touches `archived` | `lib/seed-data.ts`, `scripts/seed.ts` |
| T-005 CI | GitHub Actions running the same gate as local, with a test asserting the CI definition stays in step with `package.json` | `.github/workflows/ci.yml`, `ci-workflow.test.ts` |

Gate result at `4b663a1`:

| Command | Result |
| --- | --- |
| `npm run check` (typecheck → lint → test → knip) | **pass** — 10 test files, 105 tests, 0 knip findings |
| `npm run build` | **pass** — 4 static routes, ~99.6 kB shared JS |

Observations worth a human eye, neither of them blocking:

- `lib/llm.ts` contains one literal NUL character (offset 7222, inside the `mockGenerate`
  seed join). Git therefore classifies the file as binary and shows no textual diffs for
  it. Behaviour is unaffected; replacing the separator with an ordinary character would
  restore reviewable diffs.
- `T-010` (core domain logic, `lib/council/`) landed before this checkpoint, so the tree
  contains more than M0. It does not change any conclusion above — it is pure logic with
  no database or provider access.

---

## Human gate — please confirm

- [ ] **PRD §14 Q2 — which Postgres backs v2?** Options: (a) a **fresh Neon database**
      (recommended — the existing one still holds the v1 schema and a conflicting
      `personas` table), (b) the **existing Neon instance after dropping** the `public`
      and `drizzle` schemas, or (c) local Postgres. Then set `DATABASE_URL` in
      `.env.local`.
- [ ] **Migration applied.** After `DATABASE_URL` is set, `npm run db:migrate` should
      apply `drizzle/0000_married_king_bedlam.sql`: 5 tables, 3 enums, the
      `(council_id, position)` composite primary key and the `turns_session_id_seq_unique`
      constraint.
- [ ] **Seed rows present.** `npm run seed` should report `personas: 8 inserted`,
      `councils: 3 inserted`, `members: 11 rows written`.
- [ ] **PRD §14 Q1 — which provider?** Set `LLM_PROVIDER` to `anthropic`, `openai` or
      `mock`, and set the matching key. **Observed state: `LLM_PROVIDER` is unset, so
      `anthropic` is selected, and `ANTHROPIC_API_KEY` is absent — the app would throw on
      the first turn.** The only key present is `OPENAI_API_KEY`, so either add an
      Anthropic key or set `LLM_PROVIDER=openai` explicitly.
- [ ] **Clean up `.env.local`:** remove `POSTGRES_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
      once `DATABASE_URL` is in place.

---

## Re-run instructions

Once `DATABASE_URL` is set:

```bash
npm run db:migrate
npm run seed
```

Both should exit 0. This report may be regenerated in place afterwards to record the
successful run.
