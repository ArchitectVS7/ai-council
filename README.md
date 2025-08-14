---
name: Postgres Next.js Starter
slug: postgres-starter
description: Simple Next.js template that uses a Postgres database.
framework: Next.js
useCase: Starter
css: Tailwind
database: Postgres
deployUrl: https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fexamples%2Ftree%2Fmain%2Fstorage%2Fpostgres-starter&project-name=postgres-starter&repository-name=postgres-starter&demo-title=Vercel%20Postgres%20Next.js%20Starter&demo-description=Simple%20Next.js%20template%20that%20uses%20Vercel%20Postgres%20as%20the%20database.&demo-url=https%3A%2F%2Fpostgres-starter.vercel.app%2F&demo-image=https%3A%2F%2Fpostgres-starter.vercel.app%2Fopengraph-image.png&products=%5B%7B%22type%22%3A%22integration%22%2C%22group%22%3A%22postgres%22%7D%5D
demoUrl: https://postgres-starter.vercel.app/
relatedTemplates:
  - postgres-prisma
  - postgres-kysely
  - postgres-sveltekit
---

# AI Council

Configurable multi-persona AI discussion simulator (see `design-docs/PRD.md`).

The original Postgres starter demo remains available at `/starter` and can be used to validate Postgres connectivity.

## Run locally

Prereqs: Node 18+, pnpm. For the `/starter` demo, set `POSTGRES_URL` in `.env.local`.

```bash
pnpm install
pnpm dev
```

Open `/` for AI Council scaffold. Open `/starter` for the original Postgres demo list.

## Database (Drizzle ORM)

This project uses Drizzle ORM and Drizzle Kit for schema and migrations.

Environment variables:
- Set `DATABASE_URL` or `POSTGRES_URL` in `.env.local`.

Commands:
```bash
# Generate migrations from current schema (may prompt on first run)
npm run db:generate

# Apply migrations
npm run db:migrate

# Visualize schema
npm run db:studio
```

If `db:generate` shows a prompt about `flows.nodes`, select “create column” unless you are renaming from a legacy schema. This matches the new visual flow designer tables in `lib/db/schema.ts`.
