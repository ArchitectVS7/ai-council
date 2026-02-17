```markdown
---
name: AI Council
slug: ai-council
description: Configurable multi-persona AI discussion simulator built with Next.js and Postgres. Features visual workflow management, integration with external services (Slack, Microsoft Graph), and a comprehensive help system.
framework: Next.js
useCase: Application
css: Tailwind
database: Postgres
deployUrl: https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fexamples&project-name=ai-council&repository-name=ai-council
demoUrl: https://ai-council.vercel.app/
---

# AI Council

AI Council is a configurable multi-persona AI discussion simulator that enables teams to model complex conversations and decision-making processes through visual workflow design. The application allows you to create AI personas with distinct personalities and constraints, orchestrate multi-step discussions, and integrate with external services like Slack and Microsoft Graph. Built with Next.js, Postgres, and React Flow, it provides an intuitive interface for designing and executing sophisticated conversation workflows.

For detailed product requirements and design decisions, see `design-docs/PRD.md` and `design-docs/USER_MANUAL.md`.

## Quick Start

### Prerequisites

- Node.js 18 or higher
- npm 9.8.1 or higher (or compatible package manager)
- Postgres database (Vercel Postgres, Neon, or self-hosted)

### Installation

1. Clone the repository and install dependencies:

```bash
git clone https://github.com/vercel/examples.git
cd ai-council
npm install
```

2. Configure environment variables in `.env.local`:

```env
# Database configuration
DATABASE_URL=postgresql://user:password@host:5432/ai_council
# or use Vercel Postgres
POSTGRES_URL=postgresql://user:password@host:5432/ai_council

# Optional: Slack integration
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret

# Optional: Microsoft Graph integration
MICROSOFT_GRAPH_CLIENT_ID=your-client-id
MICROSOFT_GRAPH_CLIENT_SECRET=your-client-secret
```

3. Set up the database schema and run migrations:

```bash
npm run db:generate
npm run db:migrate
```

4. (Optional) Populate the database with sample workflows and personas:

```bash
npm run seed
```

### Development Server

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The home page displays the AI Council interface with access to the workflow management system.

## Usage

### Core Features

**Workflow Management**: Design and execute multi-step AI discussions using the visual flow designer at `/workflows`. Each workflow contains:
- Multiple AI personas with customizable personalities and behavioral constraints
- Sequential or branching conversation steps
- Integration points with external services (Slack, Microsoft Teams, etc.)

**Workflow Templates**: Pre-configured templates for common discussion scenarios available at `/workflow-templates`. Templates can be instantiated and customized for your specific use case.

**Help System**: Comprehensive in-app help accessible from the main navigation. The help system automatically opens the first article on initial visits and includes an interactive onboarding tour.

### Common Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm lint

# Run test suite
npm test

# Watch mode for tests
npm test:watch

# Generate database migrations from schema changes
npm run db:generate

# Apply pending migrations to database
npm run db:migrate

# Open Drizzle Studio for visual database management
npm run db:studio

# Seed database with sample data
npm run seed

# Test API endpoints
npm test-api
```

## Project Structure

```
ai-council/
├── app/                          # Next.js application directory
│   ├── workflows/               # Workflow management pages
│   ├── workflow-templates/      # Template management pages
│   └── api/                     # API routes for backend logic
├── components/                   # React components
│   ├── WorkflowDesigner/        # Visual flow designer using @xyflow/react
│   ├── HelpSystem/              # In-app help and onboarding
│   └── ...                      # Other UI components
├── lib/                         # Utility functions and helpers
├── scripts/                     # Database and utility scripts
│   ├── migrate.js               # Database migration runner
│   ├── seed.js                  # Database seeding
│   └── test-api.js              # API testing utilities
├── design-docs/                 # Product documentation
│   ├── PRD.md                   # Product requirements
│   └── USER_MANUAL.md           # User guide
├── .env.local                   # Environment variables (local only)
├── next.config.js               # Next.js configuration
├── tailwind.config.js           # Tailwind CSS configuration
└── package.json                 # Project dependencies and scripts
```

## Technology Stack

- **Framework**: Next.js with React 19
- **Database**: Postgres with Drizzle ORM
- **UI**: React Flow (@xyflow/react) for workflow visualization, Tailwind CSS for styling
- **Integrations**: Slack Web API, Microsoft Graph API
- **Testing**: Jest
- **Package Manager**: npm 9.8.1+

## External Integrations

### Slack Integration

Configure `SLACK_BOT_TOKEN` and `SLACK_SIGNING_SECRET` to enable direct workflow execution and notifications through Slack channels.

### Microsoft Graph Integration

Set `MICROSOFT_GRAPH_CLIENT_ID` and `MICROSOFT_GRAPH_CLIENT_SECRET` to integrate with Microsoft Teams and Office 365 services for extended discussion capabilities.

## Database Management

AI Council uses Drizzle ORM for type-safe database operations. Database migrations are managed through Drizzle Kit:

- **Schema Definition**: Update schema in `db/schema.ts`
- **Generate Migrations**: `npm run db:generate` creates migration files
- **Apply Migrations**: `npm run db:migrate` applies pending migrations
- **Visual Studio**: `npm run db:studio` opens the Drizzle Studio interface

## Development

### Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm test:watch

# Test API endpoints
npm test-api
```

### Build for Production

```bash
npm run build
npm start
```

## License

MIT

## Support

For issues, questions, or contributions, please refer to the documentation in `design-docs/` or open an issue in the repository.
```