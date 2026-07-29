# AI Council

Convene a panel of AI personas to examine a topic in structured rounds. Each persona holds a
distinct charter, sees the full transcript, and engages the other members directly. You
convene: let rounds run, interject to steer, regenerate a weak turn, and close with a
synthesis from the Chair.

This is the **v2** rebuild. See `design-docs/02-PRD-Rebuild.md` for the normative spec.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

## Environment

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string |
| `LLM_PROVIDER` | `anthropic` \| `openai` \| `local` \| `mock` |
| `LLM_MODEL` | default `claude-sonnet-5` |
| `ANTHROPIC_API_KEY` | required when `LLM_PROVIDER=anthropic` |
| `OPENAI_API_KEY` | required when `LLM_PROVIDER=openai` |
| `LLM_BASE_URL` | used only when `LLM_PROVIDER=local`; default `http://localhost:11434/v1`, no key sent |

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
| `npm run check` | typecheck + lint + test + knip |
