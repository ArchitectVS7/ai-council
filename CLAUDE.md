# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Council is a configurable multi-persona AI discussion simulator built with Next.js. It orchestrates debates between different AI personas (like Moderator, Empathy Advocate, Skeptical Academic) through a deterministic state machine flow to analyze topics from multiple perspectives.

## Development Commands

**Package Manager**: The project uses npm (specified in package.json as packageManager). However, the README mentions pnpm preference.

```bash
# Install dependencies
npm install
# or (preferred per README)
pnpm install

# Development server
npm run dev
# or
pnpm dev

# Build for production
npm run build

# Start production server
npm start

# Lint the code
npm run lint
```

## Architecture Overview

### Core Components
- **State Machine** (`lib/stateMachine.ts`): Defines personas, debate flow, and step progression logic
- **Debate Arena** (`components/debate-arena.tsx`): Main UI component managing debate sessions
- **API Route** (`app/api/complete/route.ts`): Proxy for LLM completions to keep API keys server-side

### Key Concepts
- **Personas**: Configurable AI participants with id, name, role, and task
- **State Flow**: Array of persona indices executed in sequence across rounds  
- **Messages**: Transcript entries with persona, content, timestamp, and round
- **Context Passing**: Each persona receives the previous persona's output as context

### Default Configuration
- **Moderator**: Extracts bullet points and ensures clarity
- **Empathy Advocate**: Considers human impact, ethics, inclusion
- **Skeptical Academic**: Challenges assumptions with evidence
- **Flow**: Empathy → Moderator → Skeptic → Moderator (repeated for 2 rounds)

### Data Types
```typescript
type PersonaConfig = { id: number; name: string; role: string; task: string }
type Message = { persona: string; personaId: number; content: string; timestamp: string; round: number | 'Final' }
type AppConfig = { personas: PersonaConfig[]; stateFlow: number[]; numRounds: number }
```

## Project Structure

```
app/                    # Next.js App Router
├── api/complete/       # LLM completion proxy API
├── layout.tsx         # Root layout
├── page.tsx           # Home page with DebateArena
└── starter/           # Original Postgres demo (preserved)

components/             # React components
├── debate-arena.tsx   # Main debate interface
└── [other UI components]

lib/                   # Shared utilities
├── stateMachine.ts    # Core debate logic
├── seed.ts           # Database seeding
└── utils.ts          # General utilities

design-docs/           # Product requirements
├── PRD.md            # Detailed product spec
└── planning.md       # Implementation planning
```

## Database Integration

The project is designed to use Neon Postgres for persistence but currently operates client-side only. The `/starter` route contains a working Postgres demo. Database schema planning is documented in `design-docs/PRD.md`.

**Environment**: Set `POSTGRES_URL` in `.env.local` for the starter demo.

## LLM Integration

The app uses a Next.js API route (`/api/complete`) as a proxy to LLM providers, keeping API keys secure on the server side. The client sends prompts with system/user messages and receives text responses.

## Development Notes

- **Dynamic Rendering**: Main page uses `export const dynamic = 'force-dynamic'`
- **Client Components**: DebateArena is a client component using React hooks
- **Styling**: Tailwind CSS with glassmorphism effects (backdrop-blur)
- **Error Handling**: Comprehensive error logging in debug panel
- **State Management**: Local React state with useState hooks

## Future Implementation Areas

Per the PRD, planned features include:
- Persona editing UI
- Flow configuration interface  
- Database persistence for debates and configurations
- Import/export functionality
- Final analysis generation
- Human-in-the-loop editing mode