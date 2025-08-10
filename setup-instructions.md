# Setup Instructions

## 1. Create Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
cp .env.local.example .env.local
```

**Required:**
- `DATABASE_URL` - Your Neon PostgreSQL connection string
- `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` - At least one LLM API key

**Optional:**
- `KV_REST_API_URL` and `KV_REST_API_TOKEN` - For rate limiting

## 2. Run Database Setup

After setting DATABASE_URL, run:

```bash
# Apply database migrations
npm run db:migrate

# Seed with initial data
npm run seed
```

## 3. Start Development

```bash
npm run dev
```

## 4. Verify Setup

- Visit http://localhost:3000 for landing page
- Visit http://localhost:3000/dashboard for main app
- Try creating a discussion to test LLM API
- Check http://localhost:3000/personas to see seeded agent templates

## Getting Your Database URL

1. Go to https://neon.tech and create a free account
2. Create a new project
3. Copy the connection string from the dashboard
4. It should look like: `postgresql://user:pass@host/db?sslmode=require`

## Getting API Keys

**Anthropic:**
1. Go to https://console.anthropic.com/
2. Create an account and add payment method
3. Go to API Keys section
4. Create a new key starting with `sk-ant-`

**OpenAI:**
1. Go to https://platform.openai.com/api-keys
2. Create an account and add payment method
3. Create a new API key starting with `sk-proj-`